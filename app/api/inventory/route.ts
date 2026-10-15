import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentActiveMonth, getMonthKeyFromDate } from '@/lib/dateUtils'
import {
  STANDARD_INVENTORY_ITEMS,
  getCurrentStockLevels,
  syncAllInventory,
  syncInventoryForDate,
  ensureMasterMaterialsExist,
  adjustInventoryBalance,
} from '@/lib/inventory'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || getCurrentActiveMonth()
    const itemKey = searchParams.get('itemKey')
    const branch = searchParams.get('branch') || 'All'
    const forceSync = searchParams.get('sync') === 'true'

    // Automatically ensure all 8 standard master materials exist in the database with initial 0 balances
    await ensureMasterMaterialsExist(month)

    // Only trigger full sync when explicitly requested (?sync=true)
    if (forceSync) {
      await syncAllInventory()
    }

    // 1. Current real-time warehouse stock levels for selected month
    const currentStock = await getCurrentStockLevels(branch, month)

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
        { createdAt: 'desc' },
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
      const targetMonth = body.month || getCurrentActiveMonth()
      const currentStock = await getCurrentStockLevels(body.branch || 'All', targetMonth)
      return NextResponse.json({
        success: true,
        message: 'Warehouse inventory synchronized successfully',
        currentStock,
      })
    }

    if (!body.itemKey) {
      return NextResponse.json({ success: false, error: 'itemKey is required' }, { status: 400 })
    }

    const result = await adjustInventoryBalance(body)

    return NextResponse.json({
      success: true,
      message: 'Warehouse inventory adjustment saved successfully',
      data: result.entry,
      currentStock: result.currentStock,
      karachiStock: result.karachiStock,
      lahoreStock: result.lahoreStock,
      availableStock: result.availableStock,
      branchStock: result.branchStock,
    })
  } catch (error: any) {
    console.error('Error updating inventory:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}


