import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentStockLevels } from '@/lib/inventory'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const result = await prisma.inventoryLedger.deleteMany({})

    // Dynamic stock levels after clearing: all balances are strictly 0
    const currentStock = await getCurrentStockLevels('All')

    return NextResponse.json({
      success: true,
      message: `Warehouse inventory ledger reset successfully. All ${result.count} movement records have been cleared, and all warehouse card balances (opening stock, available stock, Karachi & Lahore stocks) have been set to 0.`,
      count: result.count,
      currentStock,
    })
  } catch (error: any) {
    console.error('Error clearing inventory ledger:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to clear inventory ledger' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  return POST(request)
}
