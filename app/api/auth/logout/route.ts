import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' })
  const isProd = process.env.NODE_ENV === 'production'
  const secureFlag = isProd ? '; Secure' : ''

  // Expire on root path /
  response.headers.append(
    'Set-Cookie',
    `${AUTH_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`
  )

  // Expire on /erp path
  response.headers.append(
    'Set-Cookie',
    `${AUTH_COOKIE_NAME}=; Path=/erp; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`
  )

  return response
}
