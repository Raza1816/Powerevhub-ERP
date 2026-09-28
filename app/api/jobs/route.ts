import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentActiveMonth, getMonthKeyFromDate } from '@/lib/dateUtils'
import { getActiveUnitRates, calculateJobCosts, getNextMonthlySn } from '@/lib/pricing'
import { syncInventoryForDate } from '@/lib/inventory'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const technician = searchParams.get('technician')
    const vehicleBrand = searchParams.get('vehicleBrand')
    const search = searchParams.get('search')
    const branch = searchParams.get('branch')
    const isVoucher = searchParams.get('isVoucher')
    const voucherSettled = searchParams.get('voucherSettled')

    const where: any = {}

    if (month && month !== 'ALL') {
      where.monthKey = month
    } else if (!month && !isVoucher) {
      where.monthKey = getCurrentActiveMonth()
    }

    if (branch && branch !== 'All') {
      where.branch = branch
    }

    if (isVoucher === 'true') {
      where.isVoucher = true
    }

    if (voucherSettled !== null && voucherSettled !== undefined && voucherSettled !== '') {
      where.voucherSettled = voucherSettled === 'true'
    }

    if (status && status !== 'ALL') {
      where.OR = [
        { payStatus: status },
        { paymentStatus: status },
      ]
    }

    if (source && source !== 'ALL') {
      where.source = source
    }

    if (technician && technician !== 'ALL') {
      where.technicianName = technician
    }

    if (vehicleBrand && vehicleBrand !== 'ALL') {
      where.vehicleBrand = vehicleBrand
    }

    if (search) {
      where.OR = [
        { clientName: { contains: search } },
        { contactNo: { contains: search } },
        { addressArea: { contains: search } },
        { source: { contains: search } },
        { technicianName: { contains: search } },
        { vehicleBrand: { contains: search } },
      ]
    }

    const jobs = await prisma.crmJob.findMany({
      where,
      orderBy: [
        { sn: 'desc' },
        { date: 'desc' },
      ],
    })

    return NextResponse.json({
      success: true,
      month,
      count: jobs.length,
      data: jobs,
    })
  } catch (error: any) {
    console.error('Error fetching CRM jobs:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const date = body.date || new Date().toISOString().split('T')[0]
    const monthKey = getMonthKeyFromDate(date)

    // 1. Auto-increment Sn for this specific calendar month
    const sn = await getNextMonthlySn(monthKey)

    // 2. Lock in currently active global unit rates (Rule 2: Effective Unit Cost Lock-In)
    const activeRates = await getActiveUnitRates()

    const cable16mmUnitCost = body.cable16mmUnitCost !== undefined ? Number(body.cable16mmUnitCost) : activeRates.cable16mmRate
    const cable10mmUnitCost = body.cable10mmUnitCost !== undefined ? Number(body.cable10mmUnitCost) : activeRates.cable10mmRate
    const cable6mmUnitCost = body.cable6mmUnitCost !== undefined ? Number(body.cable6mmUnitCost) : activeRates.cable6mmRate
    const breakerBoxUnitCost = body.breakerBoxUnitCost !== undefined ? Number(body.breakerBoxUnitCost) : activeRates.breakerBoxRate
    const earthingRodUnitCost = body.earthingRodUnitCost !== undefined ? Number(body.earthingRodUnitCost) : activeRates.earthingRodRate
    const wpbUnitCost = body.wpbUnitCost !== undefined ? Number(body.wpbUnitCost) : activeRates.wpbRate
    const ninUvrUnitCost = body.ninUvrUnitCost !== undefined ? Number(body.ninUvrUnitCost) : activeRates.ninUvrRate
    const rcboBreakerUnitCost = body.rcboBreakerUnitCost !== undefined ? Number(body.rcboBreakerUnitCost) : activeRates.rcboBreakerRate

    // 3. Compute itemized and total job financials
    const financials = calculateJobCosts({
      cable16mmMeter: body.cable16mmMeter,
      cable16mmUnitCost,
      cable10mmMeter: body.cable10mmMeter,
      cable10mmUnitCost,
      cable6mmMeter: body.cable6mmMeter,
      cable6mmUnitCost,
      breakerBoxQty: body.breakerBoxQty,
      breakerBoxUnitCost,
      earthingRodQty: body.earthingRodQty,
      earthingRodUnitCost,
      wpbQty: body.wpbQty,
      wpbUnitCost,
      ninUvrQty: body.ninUvrQty,
      ninUvrUnitCost,
      rcboBreakerQty: body.rcboBreakerQty,
      rcboBreakerUnitCost,
      additionalSupplyCost: body.additionalSupplyCost,
      miscExp: body.miscExp,
      billAmount: body.billAmount,
    })

    // Voucher handling
    const isVoucher = Boolean(
      body.isVoucher ||
      body.paymentMethod === 'BYD Voucher' ||
      body.payStatus === 'Voucher' ||
      body.paymentStatus === 'Voucher'
    )
    const voucherGrossAmount = body.voucherGrossAmount !== undefined ? Number(body.voucherGrossAmount) : 65000
    const voucherDeduction = body.voucherDeduction !== undefined ? Number(body.voucherDeduction) : 13850
    const voucherNetClaim = body.voucherNetClaim !== undefined ? Number(body.voucherNetClaim) : 51150
    const voucherSettled = Boolean(body.voucherSettled)
    const voucherSettledDate = body.voucherSettledDate ? new Date(body.voucherSettledDate) : null
    const customerExcessPaid = Number(body.customerExcessPaid) || 0
    const customerExcessReceivable = Number(body.customerExcessReceivable) || 0

    const payStatus = isVoucher ? 'Voucher' : (body.payStatus || body.paymentStatus || 'Trade Receivable')
    const paymentStatus = payStatus
    const paymentMethod = isVoucher ? (body.paymentMethod || 'BYD Voucher') : (body.paymentMethod || 'Cash')

    // 4. Create the CRM Job in DB
    const newJob = await prisma.crmJob.create({
      data: {
        branch: body.branch || 'Karachi',
        sn,
        date,
        monthKey,
        clientName: body.clientName || 'Untitled Client',
        contactNo: body.contactNo || '',
        addressArea: body.addressArea || '',
        source: body.source || 'Direct',
        technicianName: body.technicianName || 'Team Alpha',
        vehicleBrand: body.vehicleBrand || 'BYD',

        // 16mm cable
        cable16mmMeter: Number(body.cable16mmMeter) || 0,
        cable16mmUnitCost,
        cable16mmTotalCost: financials.cable16mmTotalCost,

        // 10mm cable
        cable10mmMeter: Number(body.cable10mmMeter) || 0,
        cable10mmUnitCost,
        cable10mmTotalCost: financials.cable10mmTotalCost,

        // 6mm cable
        cable6mmMeter: Number(body.cable6mmMeter) || 0,
        cable6mmUnitCost,
        cable6mmTotalCost: financials.cable6mmTotalCost,

        // Breaker box
        breakerBoxQty: Number(body.breakerBoxQty) || 0,
        breakerBoxUnitCost,
        breakerBoxTotalCost: financials.breakerBoxTotalCost,

        // Additional Materials & Locked Rates
        earthingRodQty: Number(body.earthingRodQty) || 0,
        earthingRodUnitCost,
        earthingRodTotalCost: financials.earthingRodTotalCost,

        wpbQty: Number(body.wpbQty) || 0,
        wpbUnitCost,
        wpbTotalCost: financials.wpbTotalCost,

        ninUvrQty: Number(body.ninUvrQty) || 0,
        ninUvrUnitCost,
        ninUvrTotalCost: financials.ninUvrTotalCost,

        rcboBreakerQty: Number(body.rcboBreakerQty) || 0,
        rcboBreakerUnitCost,
        rcboBreakerTotalCost: financials.rcboBreakerTotalCost,

        // Additional Supply & Misc
        additionalSupplyName: body.additionalSupplyName || '',
        additionalSupplyCost: Number(body.additionalSupplyCost) || 0,
        miscExp: Number(body.miscExp) || 0,

        // Totals & Financials
        totalJobCost: financials.totalJobCost,
        billAmount: financials.billAmount,
        grossProfit: financials.grossProfit,
        grossProfitMargin: financials.grossProfitMargin,

        // Payment status & methods
        payStatus,
        paymentStatus,
        paymentMethod,
        paidDate: payStatus === 'Paid' ? (body.paidDate || date) : null,

        // BYD Voucher fields
        isVoucher,
        voucherGrossAmount,
        voucherDeduction,
        voucherNetClaim,
        voucherSettled,
        voucherSettledDate,
        customerExcessPaid,
        customerExcessReceivable,

        notes: body.notes || '',
      },
    })

    // 5. Automated Real-Time Inventory Deduction on job date
    await syncInventoryForDate(date)

    return NextResponse.json({
      success: true,
      data: newJob,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating CRM job:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create job' },
      { status: 500 }
    )
  }
}
