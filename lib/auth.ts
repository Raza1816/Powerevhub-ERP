import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

export interface AuthUser {
  id: string
  username: string
  role: 'admin' | 'viewer'
  name?: string | null
}

export const AUTH_COOKIE_NAME = 'auth_token'
const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'power-ev-hub-secret-key-jwt-2025-secure-auth'
)

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createAuthToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY)
}

export async function verifyAuthToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)
    if (!payload || !payload.id || !payload.role) {
      return null
    }
    return {
      id: payload.id as string,
      username: payload.username as string,
      role: (payload.role as string) === 'admin' ? 'admin' : 'viewer',
      name: (payload.name as string) || null,
    }
  } catch {
    return null
  }
}

export async function ensureDefaultUsers() {
  try {
    const adminCount = await prisma.user.count({ where: { role: 'admin' } })
    if (adminCount === 0) {
      const adminPass = await hashPassword('admin123')
      await prisma.user.upsert({
        where: { username: 'admin' },
        update: { role: 'admin', passwordHash: adminPass },
        create: {
          username: 'admin',
          passwordHash: adminPass,
          role: 'admin',
          name: 'System Admin',
        },
      })
    }

    const viewerCount = await prisma.user.count({ where: { role: 'viewer' } })
    if (viewerCount === 0) {
      const viewerPass = await hashPassword('viewer123')
      await prisma.user.upsert({
        where: { username: 'viewer' },
        update: { role: 'viewer', passwordHash: viewerPass },
        create: {
          username: 'viewer',
          passwordHash: viewerPass,
          role: 'viewer',
          name: 'Read-Only Viewer',
        },
      })
    }
  } catch (error) {
    console.error('Error ensuring default users:', error)
  }
}

export async function getServerSessionUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value
    if (!token) return null
    return await verifyAuthToken(token)
  } catch {
    return null
  }
}

export async function getAuthUserFromRequest(request: Request): Promise<AuthUser | null> {
  try {
    // 1. Check forwarded headers from middleware
    const headerId = request.headers.get('x-user-id')
    const headerRole = request.headers.get('x-user-role')
    const headerName = request.headers.get('x-user-name')
    if (headerId && headerRole && (headerRole === 'admin' || headerRole === 'viewer')) {
      return {
        id: headerId,
        username: headerName || (headerRole === 'admin' ? 'admin' : 'viewer'),
        role: headerRole as 'admin' | 'viewer',
        name: headerName,
      }
    }

    // 2. Fallback to cookie
    const cookieHeader = request.headers.get('cookie') || ''
    const match = cookieHeader.match(new RegExp(`(?:^|; )${AUTH_COOKIE_NAME}=([^;]*)`))
    const token = match ? decodeURIComponent(match[1]) : null
    if (!token) return null
    return await verifyAuthToken(token)
  } catch {
    return null
  }
}
