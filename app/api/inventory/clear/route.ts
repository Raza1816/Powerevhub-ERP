import { NextRequest, NextResponse } from 'next/server'
import { resetInventoryToZero } from '@/lib/inventory'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { count, currentStock } = await resetInventoryToZero()

    return NextResponse.json({
      success: true,
      message: `Warehouse inventory ledger reset successfully. All movement records have been cleared, and all 8 warehouse master material card balances (opening stock, available stock, Karachi & Lahore stocks) have been set to 0.`,
      count,
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
