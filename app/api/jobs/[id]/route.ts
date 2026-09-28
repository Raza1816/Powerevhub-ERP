import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMonthKeyFromDate } from '@/lib/dateUtils'
import { calculateJobCosts } from '@/lib/pricing'
import { syncInventoryForDate } from '@/lib/inventory'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = await prisma.crmJob.findUnique({
      where: { id: params.id },
    })

    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: job })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.crmJob.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
    }

    const body = await request.json()
    const originalDate = existing.date
    const newDate = body.date || existing.date
    const monthKey = getMonthKeyFromDate(newDate)

    // Preserve locked unit rates unless explicitly overridden in body
    const cable16mmUnitCost = body.cable16mmUnitCost !== undefined ? Number(body.cable16mmUnitCost) : existing.cable16mmUnitCost
    const cable10mmUnitCost = body.cable10mmUnitCost !== undefined ? Number(body.cable10mmUnitCost) : existing.cable10mmUnitCost
    const cable6mmUnitCost = body.cable6mmUnitCost !== undefined ? Number(body.cable6mmUnitCost) : existing.cable6mmUnitCost
    const breakerBoxUnitCost = body.breakerBoxUnitCost !== undefined ? Number(body.breakerBoxUnitCost) : existing.breakerBoxUnitCost
    const earthingRodUnitCost = body.earthingRodUnitCost !== undefined ? Number(body.earthingRodUnitCost) : existing.earthingRodUnitCost
    const wpbUnitCost = body.wpbUnitCost !== undefined ? Number(body.wpbUnitCost) : existing.wpbUnitCost
    const ninUvrUnitCost = body.ninUvrUnitCost !== undefined ? Number(body.ninUvrUnitCost) : existing.ninUvrUnitCost
    const rcboBreakerUnitCost = body.rcboBreakerUnitCost !== undefined ? Number(body.rcboBreakerUnitCost) : existing.rcboBreakerUnitCost

    const financials = calculateJobCosts({
      cable16mmMeter: body.cable16mmMeter !== undefined ? body.cable16mmMeter : existing.cable16mmMeter,
      cable16mmUnitCost,
      cable10mmMeter: body.cable10mmMeter !== undefined ? body.cable10mmMeter : existing.cable10mmMeter,
      cable10mmUnitCost,
      cable6mmMeter: body.cable6mmMeter !== undefined ? body.cable6mmMeter : existing.cable6mmMeter,
      cable6mmUnitCost,
      breakerBoxQty: body.breakerBoxQty !== undefined ? body.breakerBoxQty : existing.breakerBoxQty,
      breakerBoxUnitCost,
      earthingRodQty: body.earthingRodQty !== undefined ? body.earthingRodQty : existing.earthingRodQty,
      earthingRodUnitCost,
      wpbQty: body.wpbQty !== undefined ? body.wpbQty : existing.wpbQty,
      wpbUnitCost,
      ninUvrQty: body.ninUvrQty !== undefined ? body.ninUvrQty : existing.ninUvrQty,
      ninUvrUnitCost,
      rcboBreakerQty: body.rcboBreakerQty !== undefined ? body.rcboBreakerQty : existing.rcboBreakerQty,
      rcboBreakerUnitCost,
      additionalSupplyCost: body.additionalSupplyCost !== undefined ? body.additionalSupplyCost : existing.additionalSupplyCost,
      miscExp: body.miscExp !== undefined ? body.miscExp : existing.miscExp,
      billAmount: body.billAmount !== undefined ? body.billAmount : existing.billAmount,
    })

    const isVoucher = body.isVoucher !== undefined
      ? Boolean(body.isVoucher)
      : (body.paymentMethod === 'BYD Voucher' || body.payStatus === 'Voucher' || body.paymentStatus === 'Voucher' ? true : existing.isVoucher)

    const payStatus = body.payStatus ?? (isVoucher ? 'Voucher' : (body.paymentStatus ?? existing.payStatus))
    const paymentStatus = payStatus

    const updatedJob = await prisma.crmJob.update({
      where: { id: params.id },
      data: {
        branch: body.branch ?? existing.branch,
        date: newDate,
        monthKey,
        clientName: body.clientName ?? existing.clientName,
        contactNo: body.contactNo ?? existing.contactNo,
        addressArea: body.addressArea ?? existing.addressArea,
        source: body.source ?? existing.source,
        technicianName: body.technicianName ?? existing.technicianName,
        vehicleBrand: body.vehicleBrand ?? existing.vehicleBrand,

        cable16mmMeter: body.cable16mmMeter !== undefined ? Number(body.cable16mmMeter) : existing.cable16mmMeter,
        cable16mmUnitCost,
        cable16mmTotalCost: financials.cable16mmTotalCost,

        cable10mmMeter: body.cable10mmMeter !== undefined ? Number(body.cable10mmMeter) : existing.cable10mmMeter,
        cable10mmUnitCost,
        cable10mmTotalCost: financials.cable10mmTotalCost,

        cable6mmMeter: body.cable6mmMeter !== undefined ? Number(body.cable6mmMeter) : existing.cable6mmMeter,
        cable6mmUnitCost,
        cable6mmTotalCost: financials.cable6mmTotalCost,

        breakerBoxQty: body.breakerBoxQty !== undefined ? Number(body.breakerBoxQty) : existing.breakerBoxQty,
        breakerBoxUnitCost,
        breakerBoxTotalCost: financials.breakerBoxTotalCost,

        earthingRodQty: body.earthingRodQty !== undefined ? Number(body.earthingRodQty) : existing.earthingRodQty,
        earthingRodUnitCost,
        earthingRodTotalCost: financials.earthingRodTotalCost,

        wpbQty: body.wpbQty !== undefined ? Number(body.wpbQty) : existing.wpbQty,
        wpbUnitCost,
        wpbTotalCost: financials.wpbTotalCost,

        ninUvrQty: body.ninUvrQty !== undefined ? Number(body.ninUvrQty) : existing.ninUvrQty,
        ninUvrUnitCost,
        ninUvrTotalCost: financials.ninUvrTotalCost,

        rcboBreakerQty: body.rcboBreakerQty !== undefined ? Number(body.rcboBreakerQty) : existing.rcboBreakerQty,
        rcboBreakerUnitCost,
        rcboBreakerTotalCost: financials.rcboBreakerTotalCost,

        additionalSupplyName: body.additionalSupplyName ?? existing.additionalSupplyName,
        additionalSupplyCost: body.additionalSupplyCost !== undefined ? Number(body.additionalSupplyCost) : existing.additionalSupplyCost,
        miscExp: body.miscExp !== undefined ? Number(body.miscExp) : existing.miscExp,

        totalJobCost: financials.totalJobCost,
        billAmount: financials.billAmount,
        grossProfit: financials.grossProfit,
        grossProfitMargin: financials.grossProfitMargin,

        payStatus,
        paymentStatus,
        paymentMethod: body.paymentMethod ?? (isVoucher ? 'BYD Voucher' : existing.paymentMethod),
        paidDate: payStatus === 'Paid' ? (body.paidDate || newDate) : null,

        isVoucher,
        voucherGrossAmount: body.voucherGrossAmount !== undefined ? Number(body.voucherGrossAmount) : existing.voucherGrossAmount,
        voucherDeduction: body.voucherDeduction !== undefined ? Number(body.voucherDeduction) : existing.voucherDeduction,
        voucherNetClaim: body.voucherNetClaim !== undefined ? Number(body.voucherNetClaim) : existing.voucherNetClaim,
        voucherSettled: body.voucherSettled !== undefined ? Boolean(body.voucherSettled) : existing.voucherSettled,
        voucherSettledDate: body.voucherSettledDate !== undefined
          ? (body.voucherSettledDate ? new Date(body.voucherSettledDate) : null)
          : existing.voucherSettledDate,
        customerExcessPaid: body.customerExcessPaid !== undefined ? Number(body.customerExcessPaid) : existing.customerExcessPaid,
        customerExcessReceivable: body.customerExcessReceivable !== undefined ? Number(body.customerExcessReceivable) : existing.customerExcessReceivable,

        notes: body.notes ?? existing.notes,
      },
    })

    // Re-sync inventory on dates
    await syncInventoryForDate(originalDate)
    if (originalDate !== newDate) {
      await syncInventoryForDate(newDate)
    }

    return NextResponse.json({ success: true, data: updatedJob })
  } catch (error: any) {
    console.error('Error updating job:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.crmJob.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
    }

    const jobDate = existing.date
    await prisma.crmJob.delete({
      where: { id: params.id },
    })

    // Rollback / recalculate inventory for that date
    await syncInventoryForDate(jobDate)

    return NextResponse.json({ success: true, message: 'Job deleted and inventory updated' })
  } catch (error: any) {
    console.error('Error deleting job:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
