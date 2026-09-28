import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_UNIT_RATES } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch all unit rates (or seed default if empty/missing)
    let unitRates = await prisma.unitRate.findMany({
      orderBy: { itemName: 'asc' },
    })

    const existingKeys = new Set(unitRates.map((r) => r.itemKey))
    let missingAdded = false

    for (const [key, val] of Object.entries(DEFAULT_UNIT_RATES)) {
      if (!existingKeys.has(key)) {
        await prisma.unitRate.create({
          data: {
            itemKey: key,
            itemName: val.name,
            rate: val.rate,
            unit: val.unit,
            active: true,
            notes: 'Default master unit rate',
          },
        })
        missingAdded = true
      }
    }

    if (missingAdded) {
      unitRates = await prisma.unitRate.findMany({
        orderBy: { itemName: 'asc' },
      })
    }

    // 2. Fetch unit rate price version history
    const rateHistory = await prisma.unitRateHistory.findMany({
      orderBy: { changedAt: 'desc' },
      take: 20,
    })

    // 3. Fetch dropdown master values
    let dropdowns = await prisma.dropdownValue.findMany({
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
        { value: 'asc' },
      ],
    })

    if (dropdowns.length === 0) {
      // Seed default dropdown options
      const defaultDropdowns = [
        // Sources
        { category: 'SOURCE', value: 'Direct', sortOrder: 1 },
        { category: 'SOURCE', value: 'MJD/MTP', sortOrder: 2 },
        { category: 'SOURCE', value: 'Sarah South', sortOrder: 3 },
        { category: 'SOURCE', value: 'Dealership A', sortOrder: 4 },
        { category: 'SOURCE', value: 'Social Media', sortOrder: 5 },
        { category: 'SOURCE', value: 'Referral', sortOrder: 6 },
        // Technicians
        { category: 'TECHNICIAN', value: 'Team Alpha (Lead: Ali)', sortOrder: 1 },
        { category: 'TECHNICIAN', value: 'Team Beta (Lead: Imran)', sortOrder: 2 },
        { category: 'TECHNICIAN', value: 'Team Gamma (Lead: Farhan)', sortOrder: 3 },
        { category: 'TECHNICIAN', value: 'Team Delta (Lead: Usman)', sortOrder: 4 },
        // Payment Methods
        { category: 'PAYMENT_METHOD', value: 'Cash', sortOrder: 1 },
        { category: 'PAYMENT_METHOD', value: 'Bank Transfer', sortOrder: 2 },
        { category: 'PAYMENT_METHOD', value: 'Cheque', sortOrder: 3 },
        { category: 'PAYMENT_METHOD', value: 'Online Portal', sortOrder: 4 },
      ]

      for (const d of defaultDropdowns) {
        await prisma.dropdownValue.create({ data: d })
      }

      dropdowns = await prisma.dropdownValue.findMany({
        orderBy: [
          { category: 'asc' },
          { sortOrder: 'asc' },
          { value: 'asc' },
        ],
      })
    }

    // Ensure default EV Vehicle Brands are seeded only on initial setup once
    const brandsInit = await prisma.appConfig.findUnique({
      where: { key: 'brands_initialized' },
    })

    if (!brandsInit) {
      const existingVehicleBrands = dropdowns.filter(d => d.category === 'VEHICLE_BRAND')
      if (existingVehicleBrands.length === 0) {
        const defaultBrands = ['BYD', 'MG', 'Deepal', 'Audi', 'Porsche', 'Hyundai']
        for (let i = 0; i < defaultBrands.length; i++) {
          await prisma.dropdownValue.create({
            data: {
              category: 'VEHICLE_BRAND',
              value: defaultBrands[i],
              sortOrder: i + 1,
              active: true,
            },
          })
        }
        dropdowns = await prisma.dropdownValue.findMany({
          orderBy: [
            { category: 'asc' },
            { sortOrder: 'asc' },
            { value: 'asc' },
          ],
        })
      }
      await prisma.appConfig.upsert({
        where: { key: 'brands_initialized' },
        update: { value: 'true' },
        create: {
          key: 'brands_initialized',
          value: 'true',
          description: 'Tracks initial EV vehicle brand seeding',
        },
      })
    }

    // Group dropdowns by category
    const groupedDropdowns: Record<string, typeof dropdowns> = {
      SOURCE: [],
      TECHNICIAN: [],
      PAYMENT_METHOD: [],
      INVENTORY_ITEM: [],
      VEHICLE_BRAND: [],
    }

    dropdowns.forEach(d => {
      if (!groupedDropdowns[d.category]) groupedDropdowns[d.category] = []
      groupedDropdowns[d.category].push(d)
    })

    return NextResponse.json({
      success: true,
      unitRates,
      rateHistory,
      dropdowns: groupedDropdowns,
      allDropdowns: dropdowns,
    })
  } catch (error: any) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'UPDATE_UNIT_RATE') {
      const { itemKey, newRate, notes } = body
      const rateNum = Number(newRate)
      if (isNaN(rateNum) || rateNum < 0) {
        return NextResponse.json({ success: false, error: 'Invalid rate value' }, { status: 400 })
      }

      const existing = await prisma.unitRate.findUnique({
        where: { itemKey },
      })

      if (!existing) {
        return NextResponse.json({ success: false, error: 'Item rate not found' }, { status: 404 })
      }

      const oldRate = existing.rate

      // Update unit rate
      const updated = await prisma.unitRate.update({
        where: { itemKey },
        data: {
          rate: rateNum,
          effectiveDate: new Date(),
          notes: notes || `Updated on ${new Date().toISOString().split('T')[0]}`,
        },
      })

      // Log to price version history (Rule 2: Effective Unit Cost Lock-In versioning)
      await prisma.unitRateHistory.create({
        data: {
          itemKey,
          itemName: existing.itemName,
          oldRate,
          newRate: rateNum,
          unit: existing.unit,
          notes: notes || 'Admin rate modification',
        },
      })

      return NextResponse.json({ success: true, data: updated })
    }

    if (action === 'ADD_DROPDOWN') {
      const { category, value, color } = body
      if (!category || !value) {
        return NextResponse.json({ success: false, error: 'Category and Value are required' }, { status: 400 })
      }

      const created = await prisma.dropdownValue.create({
        data: {
          category: category.toUpperCase(),
          value: value.trim(),
          color: color || null,
          active: true,
        },
      })

      return NextResponse.json({ success: true, data: created })
    }

    if (action === 'DELETE_DROPDOWN') {
      const { id, category, value } = body
      if (id || (category && value)) {
        await prisma.dropdownValue.deleteMany({
          where: {
            OR: [
              ...(id ? [{ id }] : []),
              ...(category && value ? [{ category: category.toUpperCase(), value: value.trim() }] : []),
            ],
          },
        })
        return NextResponse.json({ success: true, message: 'Dropdown option deleted' })
      } else {
        return NextResponse.json({ success: false, error: 'Dropdown ID or category/value required' }, { status: 400 })
      }
    }

    if (action === 'TOGGLE_DROPDOWN') {
      const { id, active } = body
      const updated = await prisma.dropdownValue.update({
        where: { id },
        data: { active },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error handling settings POST:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const category = searchParams.get('category')
    const value = searchParams.get('value')

    if (id || (category && value)) {
      await prisma.dropdownValue.deleteMany({
        where: {
          OR: [
            ...(id ? [{ id }] : []),
            ...(category && value ? [{ category: category.toUpperCase(), value: value.trim() }] : []),
          ],
        },
      })
      return NextResponse.json({ success: true, message: 'Dropdown option deleted' })
    }

    return NextResponse.json({ success: false, error: 'ID or category and value required' }, { status: 400 })
  } catch (error: any) {
    console.error('Error handling settings DELETE:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
