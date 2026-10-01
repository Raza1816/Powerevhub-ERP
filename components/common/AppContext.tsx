'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { CurrencyCode, SUPPORTED_CURRENCIES, formatCurrency as formatCurr } from '@/lib/currency'
import { getCurrentActiveMonth, isMonthArchived, FOUNDATIONAL_CYCLE } from '@/lib/dateUtils'

interface AppContextType {
  selectedMonth: string
  setSelectedMonth: (month: string) => void
  activeMonth: string
  isArchived: boolean
  currency: CurrencyCode
  setCurrency: (curr: CurrencyCode) => void
  formatCurrency: (amount: number | null | undefined) => string
  theme: 'dark' | 'light'
  toggleTheme: () => void
  refreshKey: number
  triggerRefresh: () => void
  openNewJobModal: () => void
  isNewJobModalOpen: boolean
  closeNewJobModal: () => void
  editingJobId: string | null
  setEditingJobId: (id: string | null) => void
  voucherJobId: string | null
  setVoucherJobId: (id: string | null) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const activeMonth = getCurrentActiveMonth()
  const [selectedMonth, setSelectedMonth] = useState<string>(activeMonth)
  const [currency, setCurrency] = useState<CurrencyCode>('PKR')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [refreshKey, setRefreshKey] = useState<number>(0)
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState<boolean>(false)
  const [editingJobId, setEditingJobId] = useState<string | null>(null)
  const [voucherJobId, setVoucherJobId] = useState<string | null>(null)

  // Strict read-only mode is disabled across all concluded cycles
  const isArchived = false

  // Sanitize selectedMonth if it ever points to a pre-October 2026 cycle
  useEffect(() => {
    if (selectedMonth < FOUNDATIONAL_CYCLE) {
      setSelectedMonth(FOUNDATIONAL_CYCLE)
    }
  }, [selectedMonth])

  // Initialize theme from local storage or default to dark
  useEffect(() => {
    const savedTheme = localStorage.getItem('power_ev_theme') as 'dark' | 'light' | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    } else {
      document.documentElement.classList.add('dark')
    }

    const savedCurrency = localStorage.getItem('power_ev_currency') as CurrencyCode | null
    if (savedCurrency && SUPPORTED_CURRENCIES[savedCurrency]) {
      setCurrency(savedCurrency)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('power_ev_theme', next)
      document.documentElement.classList.toggle('dark', next === 'dark')
      return next
    })
  }, [])

  const handleSetCurrency = useCallback((curr: CurrencyCode) => {
    setCurrency(curr)
    localStorage.setItem('power_ev_currency', curr)
  }, [])

  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  const formatCurrencyCallback = useCallback(
    (amount: number | null | undefined) => formatCurr(amount, currency),
    [currency]
  )

  const value: AppContextType = {
    selectedMonth,
    setSelectedMonth,
    activeMonth,
    isArchived,
    currency,
    setCurrency: handleSetCurrency,
    formatCurrency: formatCurrencyCallback,
    theme,
    toggleTheme,
    refreshKey,
    triggerRefresh,
    openNewJobModal: () => setIsNewJobModalOpen(true),
    closeNewJobModal: () => setIsNewJobModalOpen(false),
    isNewJobModalOpen,
    editingJobId,
    setEditingJobId,
    voucherJobId,
    setVoucherJobId,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
