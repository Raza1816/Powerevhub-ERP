'use client'

import React, { useState, useEffect } from 'react'
import { useApp } from '@/components/common/AppContext'
import { useToast } from '@/components/common/Toast'
import { useBranch, Branch } from '@/app/context/BranchContext'
import { useAuth } from '@/components/auth/AuthContext'
import {
  Zap,
  Calendar,
  Archive,
  Sun,
  Moon,
  Plus,
  RotateCcw,
  Sparkles,
  DollarSign,
  ChevronDown,
  Layers,
  Database,
  Lock,
  Receipt,
  ShoppingCart,
  MapPin,
  ShieldCheck,
  Eye,
  LogOut,
} from 'lucide-react'
import { SUPPORTED_CURRENCIES, CurrencyCode } from '@/lib/currency'
import { formatMonthLabel } from '@/lib/dateUtils'

export function Navbar({ onTabChange, activeTab }: { onTabChange: (tab: string) => void; activeTab: string }) {
  const {
    selectedMonth,
    setSelectedMonth,
    activeMonth,
    isArchived,
    currency,
    setCurrency,
    theme,
    toggleTheme,
    openNewJobModal,
    triggerRefresh,
  } = useApp()

  const { selectedBranch, setSelectedBranch } = useBranch()
  const { user, role, isAdmin, isViewer, logout } = useAuth()

  const toast = useToast()
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [isSeeding, setIsSeeding] = useState(false)

  // If viewer tries to stay on settings tab, redirect to dashboard
  useEffect(() => {
    if (isViewer && activeTab === 'settings') {
      onTabChange('dashboard')
    }
  }, [isViewer, activeTab, onTabChange])

  // Fetch available months from dashboard API
  useEffect(() => {
    fetch(`/api/dashboard?month=${selectedMonth}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.availableMonths) {
          setAvailableMonths(data.availableMonths)
        }
      })
      .catch((err) => console.error('Failed to load months:', err))
  }, [selectedMonth])

  // Handle seeding sample data
  const handleSeedData = async () => {
    try {
      setIsSeeding(true)
      const res = await fetch('/api/seed', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success('Sample Data Loaded', 'Populated active & archived jobs, inventory ledger, and vendor purchases.')
        triggerRefresh()
      } else {
        toast.error('Seeding Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    } finally {
      setIsSeeding(false)
    }
  }

  // Deduplicate and sort month options
  const monthOptions = Array.from(
    new Set([activeMonth, selectedMonth, ...availableMonths])
  ).sort().reverse()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/85 dark:bg-[#0b0f17]/85 backdrop-blur-xl transition-colors no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  Power EV Hub
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ERP v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-0.5 hidden sm:block">
                EV Charger Installation & Financial Management
              </p>
            </div>
          </div>

          {/* Center Month Selector & Archive Status */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-medium transition-all shadow-sm ${
                isArchived
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20'
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100'
              }`}>
                {isArchived ? (
                  <Archive className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                
                <span className="text-slate-500 dark:text-slate-400 text-xs hidden md:inline">Cycle:</span>
                
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent font-semibold cursor-pointer outline-none border-none pr-6 text-xs sm:text-sm"
                >
                  {monthOptions.map((m) => {
                    const isMActive = m === activeMonth
                    const isMArchived = m < activeMonth
                    return (
                      <option key={m} value={m} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {formatMonthLabel(m)} {isMActive ? '⚡ (Active Current)' : isMArchived ? '🔒 (Archived)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>

            {/* Branch Selector */}
            <div className="relative flex items-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium transition-all shadow-sm hover:border-emerald-500/50">
                <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400 text-xs hidden md:inline">Branch:</span>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value as Branch)}
                  className="bg-transparent font-semibold cursor-pointer outline-none border-none pr-6 text-xs sm:text-sm text-slate-800 dark:text-slate-200"
                  title="Filter by City Branch"
                >
                  <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    All Branches (Consolidated)
                  </option>
                  <option value="Karachi" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    Karachi Branch
                  </option>
                  <option value="Lahore" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    Lahore Branch
                  </option>
                </select>
              </div>
            </div>

            {/* If archived, show badge */}
            {isArchived && (
              <span className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                <Lock className="w-3 h-3" /> Historical Archive (Read-Only)
              </span>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Currency Selector */}
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer outline-none hover:border-emerald-500 transition-colors"
                title="Change Currency"
              >
                {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code} className="bg-white dark:bg-slate-900">
                    {c.symbol} {c.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Dark / Light Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* User Role Badge */}
            {role && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                  isAdmin
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                }`}
                title={`Signed in as ${user?.username || role}`}
              >
                {isAdmin ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                )}
                <span className="capitalize">{isAdmin ? 'Admin' : 'Viewer'}</span>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Seed Sample Data Button (Admin Only) */}
            {!isViewer && (
              <button
                onClick={handleSeedData}
                disabled={isSeeding}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                title="Reset and Seed Sample Data"
              >
                <Sparkles className={`w-3.5 h-3.5 text-cyan-400 ${isSeeding ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">{isSeeding ? 'Seeding...' : 'Seed Demo Data'}</span>
              </button>
            )}

            {/* Primary Action Button: + New Installation Job (Admin Only) */}
            {!isViewer && (
              <button
                onClick={openNewJobModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">New Job</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 border-t border-slate-200 dark:border-slate-800/60 no-scrollbar text-xs sm:text-sm font-medium">
          {[
            { id: 'dashboard', label: 'Executive Dashboard & P&L', icon: Layers },
            { id: 'crm', label: 'CRM Installation Jobs', icon: Zap },
            { id: 'inventory', label: 'Warehouse Inventory Ledger', icon: Database },
            { id: 'vendors', label: 'Vendor Procurement', icon: ShoppingCart },
            { id: 'financials', label: 'Financials & Payroll', icon: Receipt },
            ...(!isViewer ? [{ id: 'settings', label: 'Admin Settings & Price Master', icon: RotateCcw }] : []),
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
