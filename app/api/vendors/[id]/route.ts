import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMonthKeyFromDate } from '@/lib/dateUtils'
import {
  syncVendorPurchaseInventoryOnEdit,
  syncVendorPurchaseInventoryOnDelete,
  normalizeInventoryItem,
} from '@/lib/inventory'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const purchase = await prisma.vendorPurchase.findUnique({ where: { id } })
    if (!purchase) {
      return NextResponse.json({ success: false, error: 'Purchase record not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: purchase })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const existing = await prisma.vendorPurchase.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Purchase record not found' }, { status: 404 })
    }

    const branch = body.branch !== undefined ? body.branch : existing.branch
    const newDate = body.date || existing.date
    const newMonthKey = getMonthKeyFromDate(newDate)
    const quantity = body.quantity !== undefined ? Number(body.quantity) : existing.quantity
    const unitRate = body.unitRate !== undefined ? Number(body.unitRate) : existing.unitRate
    const totalAmount = body.totalAmount !== undefined ? Number(body.totalAmount) : Math.round(quantity * unitRate * 100) / 100

    const paymentMethod = body.paymentMethod || existing.paymentMethod
    let settledDate = body.settledDate !== undefined ? body.settledDate : existing.settledDate
    if (paymentMethod === 'Unpaid') {
      settledDate = null
    } else if (!settledDate) {
      settledDate = newDate
    }

    const rawMaterial = body.materialItem || body.item || existing.item
    const rawKey = body.itemKey || existing.itemKey
    const norm = normalizeInventoryItem(rawKey || rawMaterial)
    const itemKey = norm.key
    const itemName = rawMaterial || norm.name

    const oldDate = existing.date
    const oldItemKey = existing.itemKey
    const oldBranch = existing.branch

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.vendorPurchase.update({
        where: { id },
        data: {
          branch,
          date: newDate,
          monthKey: newMonthKey,
          vendorName: body.vendorName !== undefined ? body.vendorName : existing.vendorName,
          invoiceNo: body.invoiceNo !== undefined ? body.invoiceNo : existing.invoiceNo,
          item: itemName,
          itemKey,
          quantity,
          unitRate,
          totalAmount,
          paymentMethod,
          settledDate,
          notes: body.notes !== undefined ? body.notes : existing.notes,
        },
      })

      // Sync ledger entries and balances cleanly
      await syncVendorPurchaseInventoryOnEdit(existing, up, tx)

      return up
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('Error updating vendor purchase:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const purchase = await prisma.vendorPurchase.findUnique({ where: { id } })
    if (!purchase) {
      return NextResponse.json({ success: false, error: 'Purchase not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await syncVendorPurchaseInventoryOnDelete(purchase, tx)
      await tx.vendorPurchase.delete({ where: { id } })
    })

    return NextResponse.json({ success: true, message: 'Purchase deleted and inventory updated' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
