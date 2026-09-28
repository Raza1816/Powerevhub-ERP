import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const emp = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        advances: {
          orderBy: { date: 'desc' },
        },
        payrollRecords: {
          orderBy: { date: 'desc' },
        },
      },
    })

    if (!emp) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 })
    }

    const totalAdvances = emp.advances.reduce((sum, a) => sum + (a.amount || 0), 0)
    const totalDeducted = emp.payrollRecords.reduce((sum, p) => sum + (p.advanceDeduction || 0), 0)
    const outstandingAdvanceBalance = Math.max(0, Math.round((totalAdvances - totalDeducted) * 100) / 100)

    return NextResponse.json({
      success: true,
      data: {
        ...emp,
        totalAdvances,
        totalDeducted,
        outstandingAdvanceBalance,
      },
    })
  } catch (error: any) {
    console.error('Error fetching employee:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { name, designation, baseSalary, defaultFuelAllocation, contactNo, dateOfJoining, active, notes } = body

    const existing = await prisma.employee.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 })
    }

    const updated = await prisma.employee.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        designation: designation !== undefined ? designation.trim() : existing.designation,
        baseSalary: baseSalary !== undefined ? (parseFloat(baseSalary) || 0) : existing.baseSalary,
        defaultFuelAllocation: defaultFuelAllocation !== undefined ? (parseFloat(defaultFuelAllocation) || 0) : existing.defaultFuelAllocation,
        contactNo: contactNo !== undefined ? (contactNo ? contactNo.trim() : null) : existing.contactNo,
        dateOfJoining: dateOfJoining !== undefined ? dateOfJoining : existing.dateOfJoining,
        active: active !== undefined ? Boolean(active) : existing.active,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('Error updating employee:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.employee.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 })
    }

    await prisma.employee.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true, message: 'Employee profile deleted.' })
  } catch (error: any) {
    console.error('Error deleting employee:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
