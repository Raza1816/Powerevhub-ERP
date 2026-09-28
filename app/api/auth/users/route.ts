import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getAuthUserFromRequest,
  hashPassword,
  createAuthToken,
  AUTH_COOKIE_NAME,
  ensureDefaultUsers,
} from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await ensureDefaultUsers()
    const currentUser = await getAuthUserFromRequest(req)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required.' },
        { status: 403 }
      )
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { role: 'asc' },
    })

    return NextResponse.json({ success: true, users })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureDefaultUsers()
    const currentUser = await getAuthUserFromRequest(req)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { targetRole, username, password } = body

    if (!targetRole || (targetRole !== 'admin' && targetRole !== 'viewer')) {
      return NextResponse.json(
        { success: false, error: 'Invalid target role specified' },
        { status: 400 }
      )
    }

    const targetUser = await prisma.user.findFirst({
      where: { role: targetRole },
    })

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: `Account with role ${targetRole} not found` },
        { status: 404 }
      )
    }

    const updateData: { username?: string; passwordHash?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    }

    if (username && username.trim() !== '') {
      const cleanUsername = username.trim()
      // Check if username taken by someone else
      const existing = await prisma.user.findFirst({
        where: {
          username: cleanUsername,
          id: { not: targetUser.id },
        },
      })
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Username "${cleanUsername}" is already in use.` },
          { status: 400 }
        )
      }
      updateData.username = cleanUsername
    }

    if (password && password.trim() !== '') {
      if (password.length < 4) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 4 characters long.' },
          { status: 400 }
        )
      }
      updateData.passwordHash = await hashPassword(password)
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
        updatedAt: true,
      },
    })

    const response = NextResponse.json({
      success: true,
      message: `${targetRole.toUpperCase()} credentials updated successfully`,
      user: updatedUser,
    })

    // If admin updated their own account, refresh their session token
    if (currentUser.id === targetUser.id) {
      const newToken = await createAuthToken({
        id: updatedUser.id,
        username: updatedUser.username,
        role: 'admin',
        name: updatedUser.name,
      })

      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: newToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      })
    }

    return response
  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update credentials' },
      { status: 500 }
    )
  }
}
