import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.salaryAdvance.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Advance record not found.' }, { status: 404 })
    }

    await prisma.salaryAdvance.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true, message: 'Salary advance record deleted.' })
  } catch (error: any) {
    console.error('Error deleting advance:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
