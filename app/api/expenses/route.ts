import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentActiveMonth, getMonthKeyFromDate } from '@/lib/dateUtils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || getCurrentActiveMonth()
    const paymentMethod = searchParams.get('paymentMethod')
    const category = searchParams.get('category')
    const branch = searchParams.get('branch')

    const where: any = {
      monthKey: month,
    }

    if (branch && branch !== 'All') {
      where.branch = branch
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      where.paymentMethod = paymentMethod
    }

    if (category && category !== 'ALL') {
      where.category = category
    }

    const expenses = await prisma.generalExpense.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    // Compute aggregations
    let totalAmount = 0
    let cashAmount = 0
    let bankAmount = 0
    const categoryMap: Record<string, number> = {}

    for (const exp of expenses) {
      totalAmount += exp.amount
      const pm = (exp.paymentMethod || '').toLowerCase()
      if (pm.includes('cash')) {
        cashAmount += exp.amount
      } else {
        bankAmount += exp.amount
      }

      const cat = exp.category || 'Uncategorized'
      categoryMap[cat] = (categoryMap[cat] || 0) + exp.amount
    }

    const categoryBreakdown = Object.entries(categoryMap).map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      percentage: totalAmount > 0 ? Math.round((amt / totalAmount) * 1000) / 10 : 0,
    })).sort((a, b) => b.amount - a.amount)

    return NextResponse.json({
      success: true,
      month,
      expenses,
      summary: {
        totalAmount,
        cashAmount,
        bankAmount,
        count: expenses.length,
        categoryBreakdown,
      },
    })
  } catch (error: any) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, category, amount, paymentMethod, notes } = body

    if (!date) {
      return NextResponse.json({ success: false, error: 'Date is required.' }, { status: 400 })
    }

    if (!category || !category.trim()) {
      return NextResponse.json({ success: false, error: 'Expense category / title is required.' }, { status: 400 })
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Valid amount is required.' }, { status: 400 })
    }

    const monthKey = getMonthKeyFromDate(date)

    const expense = await prisma.generalExpense.create({
      data: {
        branch: body.branch || 'Karachi',
        date,
        monthKey,
        category: category.trim(),
        amount: numAmount,
        paymentMethod: paymentMethod || 'Cash',
        notes: notes ? notes.trim() : null,
      },
    })

    return NextResponse.json({
      success: true,
      data: expense,
    })
  } catch (error: any) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
