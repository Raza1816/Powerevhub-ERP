import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentActiveMonth, getMonthKeyFromDate } from '@/lib/dateUtils'
import { syncInventoryForDate, STANDARD_INVENTORY_ITEMS } from '@/lib/inventory'

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

    // Auto-detect matching standard itemKey if possible
    let itemKey = body.itemKey || ''
    const itemName = body.item || ''

    if (!itemKey) {
      const match = STANDARD_INVENTORY_ITEMS.find(
        (i) => i.name.toLowerCase() === itemName.toLowerCase() || itemName.toLowerCase().includes(i.name.toLowerCase())
      )
      itemKey = match ? match.key : itemName.toLowerCase().replace(/\s+/g, '_')
    }

    const purchase = await prisma.vendorPurchase.create({
      data: {
        branch,
        date,
        monthKey,
        vendorName: body.vendorName || 'General Supplier',
        invoiceNo: body.invoiceNo || '',
        item: itemName,
        itemKey,
        quantity,
        unitRate,
        totalAmount,
        paymentMethod,
        settledDate,
        notes: body.notes || '',
      },
    })

    // Automatically sync warehouse inventory restock for this date (Immediate restock even if Unpaid)
    await syncInventoryForDate(date)

    return NextResponse.json({ success: true, data: purchase }, { status: 201 })
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

    let itemKey = body.itemKey || existing.itemKey
    const itemName = body.item || existing.item
    if (body.item && !body.itemKey) {
      const match = STANDARD_INVENTORY_ITEMS.find(
        (i) => i.name.toLowerCase() === itemName.toLowerCase() || itemName.toLowerCase().includes(i.name.toLowerCase())
      )
      itemKey = match ? match.key : itemName.toLowerCase().replace(/\s+/g, '_')
    }

    const oldDate = existing.date
    const oldQty = existing.quantity
    const oldItemKey = existing.itemKey
    const oldBranch = existing.branch

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

    // Re-sync inventory if date, quantity, itemKey, or branch changed
    if (oldDate !== newDate || oldQty !== quantity || oldItemKey !== itemKey || oldBranch !== branch) {
      await syncInventoryForDate(oldDate)
      if (oldDate !== newDate) {
        await syncInventoryForDate(newDate)
      }
    }

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

    const purchaseDate = purchase.date
    await prisma.vendorPurchase.delete({ where: { id } })

    // Re-sync inventory
    await syncInventoryForDate(purchaseDate)

    return NextResponse.json({ success: true, message: 'Purchase deleted and inventory updated' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
