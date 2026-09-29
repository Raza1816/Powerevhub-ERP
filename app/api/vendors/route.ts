import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentActiveMonth, getMonthKeyFromDate } from '@/lib/dateUtils'
import { syncAllInventory, normalizeInventoryItem, STANDARD_INVENTORY_ITEMS, getCurrentStockLevels } from '@/lib/inventory'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || getCurrentActiveMonth()
    const paymentMethod = searchParams.get('paymentMethod')
    const branch = searchParams.get('branch')

    const where: any = { monthKey: month }
    if (branch && branch !== 'All') {
      where.branch = branch
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      if (paymentMethod.toLowerCase() === 'cash') {
        where.paymentMethod = { contains: 'Cash' }
      } else if (paymentMethod.toLowerCase() === 'bank') {
        where.paymentMethod = { contains: 'Bank' }
      } else if (paymentMethod.toLowerCase() === 'unpaid' || paymentMethod.toLowerCase() === 'credit') {
        where.paymentMethod = { in: ['Unpaid', 'Credit', 'Credit / Unpaid'] }
      } else {
        where.paymentMethod = paymentMethod
      }
    }

    const search = searchParams.get('search') || searchParams.get('vendor')
    if (search) {
      where.vendorName = { contains: search }
    }

    const purchases = await prisma.vendorPurchase.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    // Compute month-wide totals (or filtered totals)
    let totalAmount = 0
    let cashAmount = 0
    let bankAmount = 0
    let unpaidAmount = 0

    // Fetch month purchases filtered by branch for accurate summary cards
    const monthWhere: any = { monthKey: month }
    if (branch && branch !== 'All') {
      monthWhere.branch = branch
    }

    const allMonthPurchases = await prisma.vendorPurchase.findMany({
      where: monthWhere,
    })

    allMonthPurchases.forEach((p) => {
      totalAmount += p.totalAmount
      const pm = (p.paymentMethod || '').toLowerCase()
      if (pm.includes('cash')) {
        cashAmount += p.totalAmount
      } else if (pm.includes('bank')) {
        bankAmount += p.totalAmount
      } else if (pm.includes('unpaid') || pm.includes('credit')) {
        unpaidAmount += p.totalAmount
      } else {
        unpaidAmount += p.totalAmount
      }
    })

    return NextResponse.json({
      success: true,
      month,
      branch: branch || 'All',
      purchases,
      summary: {
        totalAmount: Math.round(totalAmount * 100) / 100,
        cashAmount: Math.round(cashAmount * 100) / 100,
        bankAmount: Math.round(bankAmount * 100) / 100,
        unpaidAmount: Math.round(unpaidAmount * 100) / 100,
        count: allMonthPurchases.length,
        filteredCount: purchases.length,
      },
    })
  } catch (error: any) {
    console.error('Error fetching vendor purchases:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const branch = body.branch === 'Lahore' ? 'Lahore' : 'Karachi'
    const date = body.date || new Date().toISOString().split('T')[0]
    const monthKey = getMonthKeyFromDate(date)

    const quantity = Number(body.quantity) || 0
    const unitRate = Number(body.unitRate) || 0
    const totalAmount = body.totalAmount !== undefined ? Number(body.totalAmount) : Math.round(quantity * unitRate * 100) / 100

    const paymentMethod = body.paymentMethod || 'Bank'
    const settledDate = paymentMethod === 'Unpaid' ? null : (body.settledDate || date)

    // Normalize raw material input cleanly
    const rawMaterial = body.materialItem || body.item || ''
    const rawKey = body.itemKey || ''
    const norm = normalizeInventoryItem(rawKey || rawMaterial)
    const itemKey = norm.key
    const itemName = rawMaterial || norm.name

    const purchase = await prisma.vendorPurchase.create({
      data: {
        branch,
        date,
        monthKey,
        vendorName: body.vendorName || 'General Supplier',
        invoiceNo: body.invoiceNo || body.referenceId || '',
        item: itemName,
        itemKey,
        quantity,
        unitRate,
        totalAmount,
        paymentMethod,
        settledDate,
        notes: body.notes || (body.ledgerNotes ? String(body.ledgerNotes) : ''),
      },
    })

    // Automatically sync full warehouse inventory ledger and balance cascades immediately
    await syncAllInventory(branch)

    // Fetch immediate live stock levels for the response
    const currentStock = await getCurrentStockLevels(branch)

    return NextResponse.json({
      success: true,
      data: purchase,
      currentStock,
      message: `Purchase recorded and ${quantity} ${norm.unit}s restocked to ${branch} warehouse inventory.`,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating vendor purchase:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const id = body.id
    if (!id) {
      return NextResponse.json({ success: false, error: 'Purchase ID is required' }, { status: 400 })
    }

    const existing = await prisma.vendorPurchase.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Purchase record not found' }, { status: 404 })
    }

    const branch = body.branch !== undefined ? body.branch : existing.branch
    const newDate = body.date || existing.date
    const newMonthKey = getMonthKeyFromDate(newDate)
    const quantity = body.quantity !== undefined ? Number(body.quantity) : existing.quantity
    const unitRate = body.unitRate !== undefined ? Number(body.unitRate) : existing.unitRate
    const totalAmount = body.totalAmount !== undefined ? Number(body.totalAmount) : Math.round(quantity * unitRate * 100) / 100

    const paymentMethod = body.paymentMethod || existing.paymentMethod
    let settledDate = body.settledDate !== undefined ? body.settledDate : existing.settledDate
    if (paymentMethod === 'Unpaid') {
      settledDate = null
    } else if (!settledDate) {
      settledDate = newDate
    }

    const rawMaterial = body.materialItem || body.item || existing.item
    const rawKey = body.itemKey || existing.itemKey
    const norm = normalizeInventoryItem(rawKey || rawMaterial)
    const itemKey = norm.key
    const itemName = rawMaterial || norm.name

    const updated = await prisma.vendorPurchase.update({
      where: { id },
      data: {
        branch,
        date: newDate,
        monthKey: newMonthKey,
        vendorName: body.vendorName !== undefined ? body.vendorName : existing.vendorName,
        invoiceNo: body.invoiceNo !== undefined ? body.invoiceNo : existing.invoiceNo,
        item: itemName,
        itemKey,
        quantity,
        unitRate,
        totalAmount,
        paymentMethod,
        settledDate,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      },
    })

    // Re-sync full inventory across all impacted dates and branches
    await syncAllInventory()

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('Error updating vendor purchase:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'Purchase ID is required' }, { status: 400 })
    }

    const purchase = await prisma.vendorPurchase.findUnique({ where: { id } })
    if (!purchase) {
      return NextResponse.json({ success: false, error: 'Purchase not found' }, { status: 404 })
    }

    await prisma.vendorPurchase.delete({ where: { id } })

    // Re-sync full inventory so stock levels and ledger rows update immediately
    await syncAllInventory()

    return NextResponse.json({ success: true, message: 'Purchase deleted and inventory ledger updated' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
