import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobIds, receivingAccount, settlementDate, notes } = body

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No vouchers selected for batch settlement' },
        { status: 400 }
      )
    }

    const settledDateObj = settlementDate ? new Date(settlementDate) : new Date()
    const account = receivingAccount === 'Cash' ? 'Cash' : 'Bank'

    // Update all selected voucher jobs
    const updateResult = await prisma.crmJob.updateMany({
      where: {
        id: { in: jobIds },
      },
      data: {
        voucherSettled: true,
        voucherSettledDate: settledDateObj,
        payStatus: 'Paid',
        paymentStatus: 'Paid',
        paymentMethod: account,
        paidDate: settlementDate || new Date().toISOString().split('T')[0],
      },
    })

    return NextResponse.json({
      success: true,
      count: updateResult.count,
      message: `Successfully reimbursed and settled ${updateResult.count} BYD voucher(s) via ${account}.`,
    })
  } catch (error: any) {
    console.error('Error batch settling BYD vouchers:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to settle vouchers' },
      { status: 500 }
    )
  }
}
