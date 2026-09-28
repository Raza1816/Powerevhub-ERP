import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const AUTH_COOKIE_NAME = 'auth_token'
const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'power-ev-hub-secret-key-jwt-2025-secure-auth'
)

interface TokenPayload {
  id: string
  username: string
  role: 'admin' | 'viewer'
  name?: string | null
}

async function verifyToken(token: string): Promise<TokenPayload | null> {
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 1. Allow public access to Next.js internal static assets & files with extensions
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    /\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/i.test(pathname)
  ) {
    return NextResponse.next()
  }

  // 2. Allow public access to authentication endpoints
  if (
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/logout' ||
    pathname === '/api/auth/me' ||
    pathname === '/api/login'
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value
  const user = token ? await verifyToken(token) : null

  // 3. Allow public access to /login if unauthenticated, or redirect to home if already logged in
  if (pathname === '/login' || pathname.startsWith('/login/')) {
    if (user) {
      const homeUrl = req.nextUrl.clone()
      homeUrl.pathname = '/'
      return NextResponse.redirect(homeUrl)
    }
    return NextResponse.next()
  }

  // 4. API Route Guarding:
  // If unauthenticated, reject with 401 Unauthorized
  if (pathname.startsWith('/api/')) {
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in to continue.' },
        { status: 401 }
      )
    }

    // Role-based API Guard: Block all mutating methods (POST, PUT, PATCH, DELETE) for Viewer
    const method = req.method.toUpperCase()
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

    if (isMutation && user.role === 'viewer') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Viewer account has complete read-only access. Modification is not permitted.',
        },
        { status: 403 }
      )
    }

    // Forward request with user headers
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-user-id', user.id)
    requestHeaders.set('x-user-role', user.role)
    requestHeaders.set('x-user-name', user.username)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // 5. Page routes (including / and all subpaths): redirect unauthenticated users to /login preserving basePath
  if (!user) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/:path*'],
}

