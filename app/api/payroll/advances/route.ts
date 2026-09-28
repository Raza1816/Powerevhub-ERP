import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentActiveMonth, getMonthKeyFromDate } from '@/lib/dateUtils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || getCurrentActiveMonth()
    const employeeId = searchParams.get('employeeId')
    const branch = searchParams.get('branch')

    const where: any = {}
    if (month && month !== 'ALL') {
      where.monthKey = month
    }
    if (employeeId) {
      where.employeeId = employeeId
    }
    if (branch && branch !== 'All') {
      where.branch = branch
    }

    const advances = await prisma.salaryAdvance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            designation: true,
            baseSalary: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    let totalAdvancesAmount = 0
    let cashAdvances = 0
    let bankAdvances = 0

    for (const a of advances) {
      totalAdvancesAmount += a.amount
      const pm = (a.paymentMethod || '').toLowerCase()
      if (pm.includes('cash')) {
        cashAdvances += a.amount
      } else {
        bankAdvances += a.amount
      }
    }

    return NextResponse.json({
      success: true,
      month,
      advances,
      summary: {
        totalAdvancesAmount,
        cashAdvances,
        bankAdvances,
        count: advances.length,
      },
    })
  } catch (error: any) {
    console.error('Error fetching salary advances:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, employeeId, amount, paymentMethod, notes } = body

    if (!date) {
      return NextResponse.json({ success: false, error: 'Date is required.' }, { status: 400 })
    }

    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'Employee selection is required.' }, { status: 400 })
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Valid advance amount is required.' }, { status: 400 })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 })
    }

    const monthKey = getMonthKeyFromDate(date)

    const advance = await prisma.salaryAdvance.create({
      data: {
        branch: body.branch || employee.branch || 'Karachi',
        employeeId,
        date,
        monthKey,
        amount: numAmount,
        paymentMethod: paymentMethod || 'Cash',
        notes: notes ? notes.trim() : null,
        deductedAmount: 0,
        status: 'Active',
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            designation: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: advance,
    })
  } catch (error: any) {
    console.error('Error recording salary advance:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
