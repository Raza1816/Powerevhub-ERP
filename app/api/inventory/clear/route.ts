import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const result = await prisma.inventoryLedger.deleteMany({})

    return NextResponse.json({
      success: true,
      message: `Successfully cleared all ${result.count} inventory ledger records from the database.`,
      count: result.count,
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
