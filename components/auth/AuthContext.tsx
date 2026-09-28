'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export interface AuthUser {
  id: string
  username: string
  role: 'admin' | 'viewer'
  name?: string | null
}

interface AuthContextType {
  user: AuthUser | null
  role: 'admin' | 'viewer' | null
  isAdmin: boolean
  isViewer: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const apiPath = (path: string) => {
    const base = '/erp'
    return path.startsWith(base) ? path : `${base}${path}`
  }

  const refreshUser = async () => {
    try {
      const res = await fetch(apiPath('/api/auth/me'))
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.user) {
          setUser(data.user)
          return
        }
      }
      setUser(null)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch(apiPath('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setUser(data.user)
        router.replace('/')
        router.refresh()
        return { success: true }
      }
      return { success: false, error: data.error || 'Login failed' }
    } catch (err: any) {
      return { success: false, error: err.message || 'Login network error' }
    }
  }

  const logout = async () => {
    try {
      await fetch(apiPath('/api/auth/logout'), { method: 'POST' })
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      // Cleanse client session: wipe local and session storage
      try {
        if (typeof window !== 'undefined') {
          localStorage.clear()
          sessionStorage.clear()
          const cookieKeys = ['auth_token', 'token', 'session', 'user']
          cookieKeys.forEach((key) => {
            document.cookie = `${key}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0;`
            document.cookie = `${key}=; Path=/erp; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0;`
          })
        }
      } catch (storageErr) {
        console.error('Error clearing client storage:', storageErr)
      }

      setUser(null)
      router.replace('/login')
      router.refresh()
    }
  }

  const role = user?.role ?? null
  const isAdmin = role === 'admin'
  const isViewer = role === 'viewer'

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isViewer,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
