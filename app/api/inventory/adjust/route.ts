import { NextRequest, NextResponse } from 'next/server'
import { adjustInventoryBalance } from '@/lib/inventory'

export const dynamic = 'force-dynamic'

/**
 * POST /api/inventory/adjust
 * Synchronizes manual inventory adjustment or opening stock baseline.
 * Wrapped in an atomic prisma.$transaction that:
 * 1. Records/updates the ledger entry in InventoryLedger with target balance.
 * 2. Updates the branch balance (karachiStock / lahoreStock) and openingStock.
 * 3. Chronologically cascades running balances forward.
 * 4. Recalculates consolidated available balance: availableStock = karachiStock + lahoreStock.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.itemKey) {
      return NextResponse.json(
        { success: false, error: 'itemKey is required for inventory adjustment' },
        { status: 400 }
      )
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
    console.error('Error adjusting inventory:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
