'use client'

import React, { useState, useEffect } from 'react'
import { useApp } from '@/components/common/AppContext'
import { GeneralExpensesView } from './GeneralExpensesView'
import { PayrollLedgerView } from './PayrollLedgerView'
import { VoucherClaimsManager } from './VoucherClaimsManager'
import { IncomeStatementView } from '@/components/dashboard/IncomeStatementView'
import { CashBankCard } from '@/components/dashboard/CashBankCard'
import { Receipt, Users, FileText, Layers, Wallet, Zap } from 'lucide-react'
import { formatMonthLabel } from '@/lib/dateUtils'

export function FinancialsView({ defaultSubTab = 'expenses' }: { defaultSubTab?: 'expenses' | 'payroll' | 'overview' | 'vouchers' }) {
  const { selectedMonth, refreshKey } = useApp()
  const [subTab, setSubTab] = useState<'expenses' | 'payroll' | 'overview' | 'vouchers'>(defaultSubTab)
  const [dashboardData, setDashboardData] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/dashboard?month=${selectedMonth}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDashboardData(data)
        }
      })
      .catch((err) => console.error('Failed to load dashboard data in financials:', err))
  }, [selectedMonth, refreshKey])

  return (
    <div className="space-y-6 pb-12">
      {/* FINANCIALS SUB-TAB NAVIGATION */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit flex-wrap no-print">
        <button
          onClick={() => setSubTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            subTab === 'expenses'
              ? 'bg-white dark:bg-[#131b2a] text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>General Expenses (OpEx)</span>
        </button>

        <button
          onClick={() => setSubTab('payroll')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            subTab === 'payroll'
              ? 'bg-white dark:bg-[#131b2a] text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Employee Ledger & Payroll</span>
        </button>

        <button
          onClick={() => setSubTab('vouchers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            subTab === 'vouchers'
              ? 'bg-white dark:bg-[#131b2a] text-sky-600 dark:text-sky-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Zap className="w-4 h-4 text-sky-500" />
          <span>BYD Voucher Claims</span>
        </button>

        <button
          onClick={() => setSubTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            subTab === 'overview'
              ? 'bg-white dark:bg-[#131b2a] text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>P&L & Liquidity Treasury</span>
        </button>
      </div>

      {/* SUB-TAB CONTENTS */}
      {subTab === 'expenses' && <GeneralExpensesView />}
      {subTab === 'payroll' && <PayrollLedgerView />}
      {subTab === 'vouchers' && <VoucherClaimsManager />}
      {subTab === 'overview' && (
        <div className="space-y-6">
          <CashBankCard data={dashboardData?.cashBankFlow} />
          <IncomeStatementView data={dashboardData?.incomeStatement} />
        </div>
      )}
    </div>
  )
}
