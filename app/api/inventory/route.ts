import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentActiveMonth, getMonthKeyFromDate } from '@/lib/dateUtils'
import { STANDARD_INVENTORY_ITEMS, getCurrentStockLevels, syncAllInventory, syncInventoryForDate } from '@/lib/inventory'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || getCurrentActiveMonth()
    const itemKey = searchParams.get('itemKey')
    const branch = searchParams.get('branch') || 'All'
    const forceSync = searchParams.get('sync') === 'true'

    // Only trigger full sync when explicitly requested (?sync=true)
    if (forceSync) {
      await syncAllInventory()
    }

    // 1. Current real-time warehouse stock levels
    const currentStock = await getCurrentStockLevels(branch)

    // 2. Fetch daily ledger records for the selected month
    const where: any = { monthKey: month }
    if (itemKey && itemKey !== 'ALL') {
      where.itemKey = itemKey
    }
    if (branch && branch !== 'All') {
      where.branch = branch
    }

    const ledger = await prisma.inventoryLedger.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { itemName: 'asc' },
      ],
    })

    // Calculate month totals
    let monthTotalUsed = 0
    let monthTotalRestocked = 0

    ledger.forEach(row => {
      monthTotalUsed += row.usedQty
      monthTotalRestocked += row.restockQty
    })

    return NextResponse.json({
      success: true,
      month,
      branch,
      items: STANDARD_INVENTORY_ITEMS,
      currentStock,
      ledger,
      monthSummary: {
        monthTotalUsed: Math.round(monthTotalUsed * 100) / 100,
        monthTotalRestocked: Math.round(monthTotalRestocked * 100) / 100,
        recordCount: ledger.length,
      },
    })
  } catch (error: any) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle full re-sync action
    if (body.action === 'sync') {
      await syncAllInventory(body.branch)
      const currentStock = await getCurrentStockLevels(body.branch || 'All')
      return NextResponse.json({
        success: true,
        message: 'Warehouse inventory synchronized successfully',
        currentStock,
      })
    }

    const { date, itemKey, openingStock, notes, branch, transactionType } = body

    if (!date || !itemKey) {
      return NextResponse.json({ success: false, error: 'Date and itemKey are required' }, { status: 400 })
    }

    const resolvedBranch = branch === 'Lahore' ? 'Lahore' : 'Karachi'

    const monthKey = getMonthKeyFromDate(date)
    const itemDef = STANDARD_INVENTORY_ITEMS.find(i => i.key === itemKey)
    const itemName = itemDef ? itemDef.name : itemKey
    const unit = itemDef ? itemDef.unit : 'unit'

    // Look up existing record for this specific date + item + branch combination
    const existing = await prisma.inventoryLedger.findFirst({
      where: { date, itemKey, branch: resolvedBranch },
    })

    const opening = Number(openingStock) || 0
    const usedQty = existing ? existing.usedQty : 0
    const restockQty = existing ? existing.restockQty : 0
    const closingStock = Math.round((opening + restockQty - usedQty) * 100) / 100
    const resolvedNotes = notes !== undefined ? notes : (existing?.notes || `Opening stock set for ${resolvedBranch} warehouse`)

    let entry
    if (existing) {
      entry = await prisma.inventoryLedger.update({
        where: { id: existing.id },
        data: {
          openingStock: opening,
          closingStock,
          branch: resolvedBranch,
          notes: resolvedNotes,
        },
      })
    } else {
      entry = await prisma.inventoryLedger.create({
        data: {
          date,
          monthKey,
          itemName,
          itemKey,
          unit,
          branch: resolvedBranch,
          openingStock: opening,
          usedQty,
          restockQty,
          closingStock,
          notes: resolvedNotes,
        },
      })
    }

    // Cascade adjustment forward to all subsequent dates
    await syncAllInventory(resolvedBranch)

    return NextResponse.json({ success: true, data: entry })
  } catch (error: any) {
    console.error('Error updating inventory:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}


