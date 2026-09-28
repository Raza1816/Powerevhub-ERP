import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('all') === 'true'
    const branch = searchParams.get('branch')

    const where: any = {}
    if (!includeInactive) {
      where.active = true
    }
    if (branch && branch !== 'All') {
      where.branch = branch
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        advances: {
          select: {
            id: true,
            amount: true,
            deductedAmount: true,
            status: true,
            date: true,
            paymentMethod: true,
          },
        },
        payrollRecords: {
          select: {
            id: true,
            date: true,
            advanceDeduction: true,
            netPayable: true,
            totalGrossEarnings: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Compute live balances for each employee
    const processedEmployees = employees.map((emp) => {
      const totalAdvances = emp.advances.reduce((sum, a) => sum + (a.amount || 0), 0)
      const totalDeducted = emp.payrollRecords.reduce((sum, p) => sum + (p.advanceDeduction || 0), 0)
      const outstandingAdvanceBalance = Math.max(0, Math.round((totalAdvances - totalDeducted) * 100) / 100)

      return {
        id: emp.id,
        name: emp.name,
        designation: emp.designation,
        baseSalary: emp.baseSalary,
        defaultFuelAllocation: emp.defaultFuelAllocation,
        contactNo: emp.contactNo,
        dateOfJoining: emp.dateOfJoining,
        branch: emp.branch || 'Karachi',
        active: emp.active,
        notes: emp.notes,
        totalAdvances,
        totalDeducted,
        outstandingAdvanceBalance,
        advancesCount: emp.advances.length,
        payrollCount: emp.payrollRecords.length,
        createdAt: emp.createdAt,
      }
    })

    return NextResponse.json({
      success: true,
      employees: processedEmployees,
    })
  } catch (error: any) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, designation, baseSalary, defaultFuelAllocation, contactNo, dateOfJoining, notes, branch } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Employee name is required.' }, { status: 400 })
    }

    if (!designation || !designation.trim()) {
      return NextResponse.json({ success: false, error: 'Designation is required.' }, { status: 400 })
    }

    const employee = await prisma.employee.create({
      data: {
        branch: branch || 'Karachi',
        name: name.trim(),
        designation: designation.trim(),
        baseSalary: parseFloat(baseSalary) || 0,
        defaultFuelAllocation: parseFloat(defaultFuelAllocation) || 0,
        contactNo: contactNo ? contactNo.trim() : null,
        dateOfJoining: dateOfJoining || null,
        notes: notes ? notes.trim() : null,
        active: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...employee,
        outstandingAdvanceBalance: 0,
      },
    })
  } catch (error: any) {
    console.error('Error creating employee:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
