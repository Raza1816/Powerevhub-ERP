'use client'

import React from 'react'
import { useApp } from '@/components/common/AppContext'
import { Wallet, Building2, ArrowDownRight, ArrowUpRight, ShieldCheck, DollarSign, Clock, Users, Receipt } from 'lucide-react'

interface CashBankFlowProps {
  cash: {
    inflow: number
    outflowVendor?: number
    outflowOpEx?: number
    outflowAdvances?: number
    outflowPayroll?: number
    outflow: number
    balance: number
  }
  bank: {
    inflow: number
    outflowExpenses?: number
    outflowPurchases?: number
    outflowOpEx?: number
    outflowAdvances?: number
    outflowPayroll?: number
    totalOutflow: number
    balance: number
  }
  payables?: {
    unpaidPurchases: number
  }
  totalBalance: number
}

export function CashBankCard({ data }: { data?: CashBankFlowProps }) {
  const { formatCurrency } = useApp()

  if (!data) return null

  const { cash, bank, payables, totalBalance } = data
  const unpaidPurchases = payables?.unpaidPurchases || 0

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-500" />
            Treasury & Liquidity Breakdown (Cash vs. Bank)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time balance based on verified client receipts, vendor procurement, OpEx overheads, and staff payroll.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {unpaidPurchases > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400">
              <span className="text-[11px] font-medium">Payables (Credit):</span>
              <span className="text-xs font-bold font-mono">{formatCurrency(unpaidPurchases)}</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Liquid Treasury:</span>
            <span className={`text-sm font-bold font-mono ${totalBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatCurrency(totalBalance)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Cash Account Box */}
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-semibold text-sm text-emerald-700 dark:text-emerald-300">
              <Wallet className="w-4 h-4" />
              <span>Available Cash in Hand</span>
            </div>
            <span className={`text-base font-bold font-mono ${cash.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
              {formatCurrency(cash.balance)}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />
                Client Cash Receipts:
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                +{formatCurrency(cash.inflow)}
              </span>
            </div>

            {(cash.outflowVendor ?? 0) > 0 && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
                  Vendor Cash Purchases:
                </span>
                <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
                  -{formatCurrency(cash.outflowVendor)}
                </span>
              </div>
            )}

            {(cash.outflowOpEx ?? 0) > 0 && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
                  Cash OpEx General Expenses:
                </span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
                  -{formatCurrency(cash.outflowOpEx)}
                </span>
              </div>
            )}

            {(cash.outflowAdvances ?? 0) > 0 && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
                  Cash Salary Advances:
                </span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
                  -{formatCurrency(cash.outflowAdvances)}
                </span>
              </div>
            )}

            {(cash.outflowPayroll ?? 0) > 0 && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" />
                  Cash Payroll Payouts:
                </span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                  -{formatCurrency(cash.outflowPayroll)}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-emerald-500/20 text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-mono flex justify-between">
              <span>Total Cash Outflow:</span>
              <span className="font-bold">-{formatCurrency(cash.outflow)}</span>
            </div>
          </div>
        </div>

        {/* Bank Account Box */}
        <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 dark:bg-cyan-950/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-semibold text-sm text-cyan-700 dark:text-cyan-300">
              <Building2 className="w-4 h-4" />
              <span>Available Bank Balance</span>
            </div>
            <span className={`text-base font-bold font-mono ${bank.balance >= 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-rose-500'}`}>
              {formatCurrency(bank.balance)}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5 text-cyan-500" />
                Client Bank Receipts:
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                +{formatCurrency(bank.inflow)}
              </span>
            </div>

            {(bank.outflowPurchases ?? 0) > 0 && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
                  Vendor Bank Purchases:
                </span>
                <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
                  -{formatCurrency(bank.outflowPurchases)}
                </span>
              </div>
            )}

            {(bank.outflowOpEx ?? 0) > 0 && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
                  Bank OpEx General Overheads:
                </span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
                  -{formatCurrency(bank.outflowOpEx)}
                </span>
              </div>
            )}

            {(bank.outflowExpenses ?? 0) > 0 && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
                  Misc Site Logistics:
                </span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
                  -{formatCurrency(bank.outflowExpenses)}
                </span>
              </div>
            )}

            {(bank.outflowAdvances ?? 0) > 0 && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
                  Bank Salary Advances:
                </span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
                  -{formatCurrency(bank.outflowAdvances)}
                </span>
              </div>
            )}

            {(bank.outflowPayroll ?? 0) > 0 && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" />
                  Bank Payroll Payouts:
                </span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                  -{formatCurrency(bank.outflowPayroll)}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-cyan-500/20 text-[11px] text-cyan-600/80 dark:text-cyan-400/80 font-mono flex justify-between">
              <span>Total Bank Outflow:</span>
              <span className="font-bold">-{formatCurrency(bank.totalOutflow)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
