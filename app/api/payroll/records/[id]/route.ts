import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const record = await prisma.payrollRecord.findUnique({
      where: { id: params.id },
      include: {
        employee: true,
      },
    })

    if (!record) {
      return NextResponse.json({ success: false, error: 'Payroll record not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: record })
  } catch (error: any) {
    console.error('Error fetching payroll record:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.payrollRecord.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Payroll record not found.' }, { status: 404 })
    }

    // Rollback advance deductions if any
    if (existing.advanceDeduction > 0) {
      const advances = await prisma.salaryAdvance.findMany({
        where: {
          employeeId: existing.employeeId,
          deductedAmount: { gt: 0 },
        },
        orderBy: { date: 'desc' },
      })

      let rollbackRemaining = existing.advanceDeduction
      for (const adv of advances) {
        if (rollbackRemaining <= 0) break
        const rollbackFromThis = Math.min(rollbackRemaining, adv.deductedAmount)
        const newDeducted = Math.max(0, adv.deductedAmount - rollbackFromThis)

        await prisma.salaryAdvance.update({
          where: { id: adv.id },
          data: {
            deductedAmount: newDeducted,
            status: newDeducted >= adv.amount ? 'Settled' : 'Active',
          },
        })
        rollbackRemaining -= rollbackFromThis
      }
    }

    await prisma.payrollRecord.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true, message: 'Payroll record deleted successfully.' })
  } catch (error: any) {
    console.error('Error deleting payroll record:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
