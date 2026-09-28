import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMonthKeyFromDate } from '@/lib/dateUtils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const expense = await prisma.generalExpense.findUnique({
      where: { id: params.id },
    })

    if (!expense) {
      return NextResponse.json({ success: false, error: 'Expense not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: expense })
  } catch (error: any) {
    console.error('Error fetching expense:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { date, category, amount, paymentMethod, notes } = body

    const existing = await prisma.generalExpense.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Expense not found.' }, { status: 404 })
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Valid amount is required.' }, { status: 400 })
    }

    const monthKey = date ? getMonthKeyFromDate(date) : existing.monthKey

    const updated = await prisma.generalExpense.update({
      where: { id: params.id },
      data: {
        branch: body.branch ?? existing.branch,
        date: date || existing.date,
        monthKey,
        category: category ? category.trim() : existing.category,
        amount: numAmount,
        paymentMethod: paymentMethod || existing.paymentMethod,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('Error updating expense:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.generalExpense.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Expense not found.' }, { status: 404 })
    }

    await prisma.generalExpense.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true, message: 'Expense deleted successfully.' })
  } catch (error: any) {
    console.error('Error deleting expense:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
