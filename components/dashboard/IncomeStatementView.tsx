'use client'

import React from 'react'
import { useApp } from '@/components/common/AppContext'
import { FileText, TrendingUp, DollarSign, Layers, ArrowRight, Printer, Users, Receipt, ShoppingCart } from 'lucide-react'
import { formatMonthLabel } from '@/lib/dateUtils'

interface IncomeStatementProps {
  data?: {
    grossRevenue: number
    paidRevenue: number
    uncollectedReceivables: number
    cogs: {
      cable16mmCost?: number
      cable10mmCost: number
      cable6mmCost: number
      breakerBoxCost: number
      earthingRodCost?: number
      wpbCost?: number
      ninUvrCost?: number
      rcboBreakerCost?: number
      additionalSupplyCost: number
      totalDirectCOGS: number
    }
    operatingExpenses?: {
      generalExpenses: number
      generalExpensesByCategory?: Array<{ category: string; amount: number }>
      miscFieldExpenses: number
      totalOverheads: number
      totalExpenses?: number
    }
    payrollExpenses?: {
      baseSalaries: number
      overtime: number
      foodIncentives: number
      fuelIncentives: number
      installationIncentives: number
      advanceDeductions: number
      totalGrossPayroll: number
      totalNetPaid: number
    }
    totalOperatingOverheads?: number
    vendorProcurement: {
      totalPurchases: number
      vendorCashPurchases: number
      vendorBankPurchases: number
      vendorUnpaidPurchases?: number
      vendorPayables?: number
    }
    grossProfit: number
    netProfit: number
    netProfitMargin: number
  }
}

export function IncomeStatementView({ data }: IncomeStatementProps) {
  const { formatCurrency, selectedMonth, isArchived } = useApp()

  if (!data) return null

  const {
    grossRevenue,
    paidRevenue,
    uncollectedReceivables,
    cogs,
    operatingExpenses,
    payrollExpenses,
    totalOperatingOverheads = (operatingExpenses?.totalOverheads || 0) + (payrollExpenses?.totalGrossPayroll || 0),
    vendorProcurement,
    grossProfit,
    netProfit,
    netProfitMargin,
  } = data

  const generalExpensesTotal = operatingExpenses?.generalExpenses || 0
  const miscFieldExpenses = operatingExpenses?.miscFieldExpenses || operatingExpenses?.totalExpenses || 0
  const opExCategoryList = operatingExpenses?.generalExpensesByCategory || []
  const grossPayrollTotal = payrollExpenses?.totalGrossPayroll || 0

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" />
            Automated Income Statement (P&L Summary)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            For {formatMonthLabel(selectedMonth)} {isArchived ? '(Archived Month)' : '(Current Cycle)'}
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 no-print"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print P&L Statement</span>
        </button>
      </div>

      <div className="mt-4 space-y-4 text-xs sm:text-sm">
        {/* 1. REVENUE SECTION */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900/60 px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100 flex justify-between items-center">
            <span className="uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400">1. Gross Invoiced Revenue</span>
            <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold font-mono">{formatCurrency(grossRevenue)}</span>
          </div>
          <div className="p-3 space-y-2 bg-white dark:bg-[#131b2a]">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="pl-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Paid Client Receipts
              </span>
              <span className="font-medium font-mono text-slate-900 dark:text-slate-200">{formatCurrency(paidRevenue)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="pl-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Trade Receivables (Pending Collection)
              </span>
              <span className="font-medium font-mono text-amber-600 dark:text-amber-400">{formatCurrency(uncollectedReceivables)}</span>
            </div>
          </div>
        </div>

        {/* 2. COGS SECTION */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900/60 px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100 flex justify-between items-center">
            <span className="uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400">2. Cost of Goods Sold (COGS - Direct Materials)</span>
            <span className="text-rose-600 dark:text-rose-400 text-sm font-bold font-mono">-{formatCurrency(cogs.totalDirectCOGS)}</span>
          </div>
          <div className="p-3 space-y-2 bg-white dark:bg-[#131b2a]">
            {(cogs.cable16mmCost ?? 0) > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span className="pl-3">16mm Copper Cables (Locked Unit Rate)</span>
                <span className="font-medium font-mono">{formatCurrency(cogs.cable16mmCost || 0)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="pl-3">10mm Copper Cables (Locked Unit Rate)</span>
              <span className="font-medium font-mono">{formatCurrency(cogs.cable10mmCost)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="pl-3">6mm Copper Cables (Locked Unit Rate)</span>
              <span className="font-medium font-mono">{formatCurrency(cogs.cable6mmCost)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="pl-3">DB Breaker Boxes (Locked Unit Rate)</span>
              <span className="font-medium font-mono">{formatCurrency(cogs.breakerBoxCost)}</span>
            </div>
            {(cogs.earthingRodCost ?? 0) > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span className="pl-3">Earthing Rods (Locked Unit Rate)</span>
                <span className="font-medium font-mono">{formatCurrency(cogs.earthingRodCost || 0)}</span>
              </div>
            )}
            {(cogs.wpbCost ?? 0) > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span className="pl-3">Waterproof Boxes / WPB (Locked Unit Rate)</span>
                <span className="font-medium font-mono">{formatCurrency(cogs.wpbCost || 0)}</span>
              </div>
            )}
            {(cogs.ninUvrCost ?? 0) > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span className="pl-3">NIN UVR Relays (Locked Unit Rate)</span>
                <span className="font-medium font-mono">{formatCurrency(cogs.ninUvrCost || 0)}</span>
              </div>
            )}
            {(cogs.rcboBreakerCost ?? 0) > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span className="pl-3">RCBO Breakers (Locked Unit Rate)</span>
                <span className="font-medium font-mono">{formatCurrency(cogs.rcboBreakerCost || 0)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="pl-3">Additional Hardware & Trunking Supplies</span>
              <span className="font-medium font-mono">{formatCurrency(cogs.additionalSupplyCost)}</span>
            </div>
          </div>
        </div>

        {/* 3. OPERATING OVERHEAD EXPENSES SECTION */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900/60 px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100 flex justify-between items-center">
            <span className="uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400">
              3. Operational Overhead Expenses (General OpEx & Site Field)
            </span>
            <span className="text-amber-600 dark:text-amber-400 text-sm font-bold font-mono">
              -{formatCurrency(generalExpensesTotal + miscFieldExpenses)}
            </span>
          </div>
          <div className="p-3 space-y-2 bg-white dark:bg-[#131b2a]">
            {opExCategoryList.length > 0 ? (
              opExCategoryList.map((cat) => (
                <div key={cat.category} className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span className="pl-3">{cat.category} (OpEx)</span>
                  <span className="font-medium font-mono">{formatCurrency(cat.amount)}</span>
                </div>
              ))
            ) : generalExpensesTotal > 0 ? (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span className="pl-3">General Operational Expenses</span>
                <span className="font-medium font-mono">{formatCurrency(generalExpensesTotal)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="pl-3">Site Logistics & Incidentals (Job Misc Exp)</span>
              <span className="font-medium font-mono">{formatCurrency(miscFieldExpenses)}</span>
            </div>
          </div>
        </div>

        {/* 4. PAYROLL & STAFF EXPENSES SECTION */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900/60 px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100 flex justify-between items-center">
            <span className="uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400">
              4. Staff Payroll & Variable Incentives Expense
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 text-sm font-bold font-mono">
              -{formatCurrency(grossPayrollTotal)}
            </span>
          </div>
          <div className="p-3 space-y-2 bg-white dark:bg-[#131b2a]">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="pl-3">Base Salaries Disbursed</span>
              <span className="font-medium font-mono">{formatCurrency(payrollExpenses?.baseSalaries || 0)}</span>
            </div>
            {(payrollExpenses?.overtime || 0) > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span className="pl-3">Staff Overtime Allowance</span>
                <span className="font-medium font-mono">{formatCurrency(payrollExpenses?.overtime || 0)}</span>
              </div>
            )}
            {(payrollExpenses?.foodIncentives || 0) > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span className="pl-3">Food Allowance & Meal Incentives</span>
                <span className="font-medium font-mono">{formatCurrency(payrollExpenses?.foodIncentives || 0)}</span>
              </div>
            )}
            {(payrollExpenses?.fuelIncentives || 0) > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span className="pl-3">Fuel Allowance & Travel Incentives</span>
                <span className="font-medium font-mono">{formatCurrency(payrollExpenses?.fuelIncentives || 0)}</span>
              </div>
            )}
            {(payrollExpenses?.installationIncentives || 0) > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span className="pl-3">Field Installation Performance Incentives</span>
                <span className="font-medium font-mono">{formatCurrency(payrollExpenses?.installationIncentives || 0)}</span>
              </div>
            )}
            {(payrollExpenses?.advanceDeductions || 0) > 0 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="pl-3">Memo: Advance Loan Deductions Recovered</span>
                <span className="font-medium font-mono">({formatCurrency(payrollExpenses?.advanceDeductions || 0)})</span>
              </div>
            )}
          </div>
        </div>

        {/* 5. NET PROFIT & MARGIN SUMMARY BANNER */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Net Bottom-Line Profit (Revenue - COGS - OpEx - Payroll)
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight mt-0.5 font-mono">
              {formatCurrency(netProfit)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Dynamic Gross Margin: {grossRevenue > 0 ? Math.round((grossProfit / grossRevenue) * 100) : 0}% | Net Margin: {netProfitMargin}%
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Net Profitability</div>
              <div className="text-xl font-black text-emerald-500 font-mono">{netProfitMargin}%</div>
            </div>

            <div className="px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-md">
              {netProfitMargin >= 20 ? 'Strong Performance' : netProfitMargin > 0 ? 'Positive Margin' : 'Deficit / Overhead Alert'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
