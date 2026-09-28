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

    const records = await prisma.payrollRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            designation: true,
            contactNo: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    let totalGrossPayroll = 0
    let totalNetPaid = 0
    let totalAdvanceDeductions = 0
    let totalOvertime = 0
    let totalFoodIncentive = 0
    let totalFuelIncentive = 0
    let totalInstallationIncentive = 0
    let cashPayouts = 0
    let bankPayouts = 0

    for (const r of records) {
      totalGrossPayroll += r.totalGrossEarnings
      totalNetPaid += r.netPayable
      totalAdvanceDeductions += r.advanceDeduction
      totalOvertime += r.overtimeAmount
      totalFoodIncentive += r.foodIncentive
      totalFuelIncentive += r.fuelIncentive
      totalInstallationIncentive += r.installationIncentive

      const pm = (r.paymentMethod || '').toLowerCase()
      if (pm.includes('cash')) {
        cashPayouts += r.netPayable
      } else {
        bankPayouts += r.netPayable
      }
    }

    return NextResponse.json({
      success: true,
      month,
      records,
      summary: {
        totalGrossPayroll,
        totalNetPaid,
        totalAdvanceDeductions,
        totalOvertime,
        totalFoodIncentive,
        totalFuelIncentive,
        totalInstallationIncentive,
        cashPayouts,
        bankPayouts,
        count: records.length,
      },
    })
  } catch (error: any) {
    console.error('Error fetching payroll records:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      date,
      employeeId,
      baseSalary,
      overtimeAmount = 0,
      foodIncentive = 0,
      fuelIncentive = 0,
      installationIncentive = 0,
      advanceDeduction = 0,
      paymentMethod = 'Bank',
      notes,
    } = body

    if (!date) {
      return NextResponse.json({ success: false, error: 'Date is required.' }, { status: 400 })
    }

    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'Employee selection is required.' }, { status: 400 })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        advances: {
          where: { status: 'Active' },
          orderBy: { date: 'asc' },
        },
        payrollRecords: true,
      },
    })

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 })
    }

    const numBase = parseFloat(baseSalary) || 0
    const numOT = parseFloat(overtimeAmount) || 0
    const numFood = parseFloat(foodIncentive) || 0
    const numFuel = parseFloat(fuelIncentive) || 0
    const numInstall = parseFloat(installationIncentive) || 0
    const numAdvDed = Math.max(0, parseFloat(advanceDeduction) || 0)

    const totalGrossEarnings = Math.round((numBase + numOT + numFood + numFuel + numInstall) * 100) / 100
    const netPayable = Math.max(0, Math.round((totalGrossEarnings - numAdvDed) * 100) / 100)

    const monthKey = getMonthKeyFromDate(date)

    // Update active advances deductedAmount in FIFO order
    if (numAdvDed > 0) {
      let remainingToDeduct = numAdvDed
      for (const adv of employee.advances) {
        if (remainingToDeduct <= 0) break
        const availableInAdv = adv.amount - adv.deductedAmount
        if (availableInAdv > 0) {
          const deductFromThis = Math.min(remainingToDeduct, availableInAdv)
          const newDeducted = adv.deductedAmount + deductFromThis
          const newStatus = newDeducted >= adv.amount ? 'Settled' : 'Active'

          await prisma.salaryAdvance.update({
            where: { id: adv.id },
            data: {
              deductedAmount: newDeducted,
              status: newStatus,
            },
          })
          remainingToDeduct -= deductFromThis
        }
      }
    }

    const record = await prisma.payrollRecord.create({
      data: {
        branch: body.branch || employee.branch || 'Karachi',
        employeeId,
        date,
        monthKey,
        baseSalary: numBase,
        overtimeAmount: numOT,
        foodIncentive: numFood,
        fuelIncentive: numFuel,
        installationIncentive: numInstall,
        totalGrossEarnings,
        advanceDeduction: numAdvDed,
        netPayable,
        paymentMethod,
        notes: notes ? notes.trim() : null,
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
      data: record,
    })
  } catch (error: any) {
    console.error('Error processing payroll:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
