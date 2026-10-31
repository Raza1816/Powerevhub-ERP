'use client'

import React, { useState } from 'react'
import { useApp } from '@/components/common/AppContext'
import { useBranch } from '@/app/context/BranchContext'
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Printer,
  ChevronDown,
  ChevronUp,
  Layers,
  MapPin,
  Sparkles,
} from 'lucide-react'
import { formatMonthLabel } from '@/lib/dateUtils'

export interface InventoryValuationItem {
  key: string
  name: string
  unit: string
  masterUnitRate: number
  openingUnits: number
  openingValuation: number
  restockedUnits: number
  usedUnits: number
  closingUnits: number
  closingValuation: number
}

interface IncomeStatementProps {
  data?: {
    grossRevenue: number
    paidRevenue: number
    uncollectedReceivables: number
    customerTradeReceivables?: number
    bydVoucherReceivables?: number
    cogs: {
      openingInventoryValuation?: number
      vendorPurchases?: number
      closingInventoryValuation?: number
      periodicMaterialCOGS?: number
      additionalSupplyCost: number
      miscSiteExpenses?: number
      siteAddonCosts?: number
      totalCOGS?: number
      totalDirectCOGS: number
      inventoryValuationItems?: InventoryValuationItem[]
      cable16mmCost?: number
      cable10mmCost?: number
      cable6mmCost?: number
      breakerBoxCost?: number
      earthingRodCost?: number
      wpbCost?: number
      ninUvrCost?: number
      rcboBreakerCost?: number
    }
    grossProfit: number
    grossProfitMargin?: number
    operatingExpenses?: {
      generalExpenses: number
      generalExpensesByCategory?: Array<{ category: string; amount: number }>
      payrollAndIncentives?: number
      miscFieldExpenses?: number
      totalOperatingExpenses?: number
      totalOverheads?: number
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
    totalOperatingExpenses?: number
    totalOperatingOverheads?: number
    vendorProcurement?: {
      totalPurchases: number
      vendorCashPurchases: number
      vendorBankPurchases: number
      vendorUnpaidPurchases?: number
      vendorPayables?: number
    }
    netProfit: number
    netProfitMargin: number
  }
}

export function IncomeStatementView({ data }: IncomeStatementProps) {
  const { formatCurrency, selectedMonth, isArchived } = useApp()
  const { selectedBranch } = useBranch()
  const [showValuationDetails, setShowValuationDetails] = useState<boolean>(false)

  if (!data) return null

  const {
    grossRevenue = 0,
    paidRevenue = 0,
    uncollectedReceivables = 0,
    cogs,
    operatingExpenses,
    payrollExpenses,
    vendorProcurement,
  } = data

  // 1. COGS [Standard Periodic Inventory Method]
  const openingInventoryValuation = cogs?.openingInventoryValuation ?? 0
  const vendorPurchases = cogs?.vendorPurchases ?? vendorProcurement?.totalPurchases ?? 0
  const closingInventoryValuation = cogs?.closingInventoryValuation ?? 0
  const periodicMaterialCOGS =
    cogs?.periodicMaterialCOGS ??
    Math.round((openingInventoryValuation + vendorPurchases - closingInventoryValuation) * 100) / 100

  const additionalSupplyCost = cogs?.additionalSupplyCost ?? 0
  const miscSiteExpenses = cogs?.miscSiteExpenses ?? operatingExpenses?.miscFieldExpenses ?? 0
  const siteAddonCosts =
    cogs?.siteAddonCosts ?? Math.round((additionalSupplyCost + miscSiteExpenses) * 100) / 100

  const totalCOGS =
    cogs?.totalCOGS ?? Math.round((periodicMaterialCOGS + siteAddonCosts) * 100) / 100

  // 2. Gross Profit & Margin
  const grossProfit =
    data.grossProfit !== undefined
      ? data.grossProfit
      : Math.round((grossRevenue - totalCOGS) * 100) / 100
  const grossProfitMargin =
    data.grossProfitMargin !== undefined
      ? data.grossProfitMargin
      : grossRevenue > 0
      ? Math.round((grossProfit / grossRevenue) * 10000) / 100
      : 0

  // 3. Operating Expenses (OpEx)
  const generalExpensesTotal = operatingExpenses?.generalExpenses ?? 0
  const opExCategoryList = operatingExpenses?.generalExpensesByCategory || []
  const payrollAndIncentivesTotal =
    operatingExpenses?.payrollAndIncentives ?? payrollExpenses?.totalGrossPayroll ?? 0

  const totalOperatingExpenses =
    data.totalOperatingExpenses ??
    operatingExpenses?.totalOperatingExpenses ??
    Math.round((generalExpensesTotal + payrollAndIncentivesTotal) * 100) / 100

  // 4. Net Profit (Bottom Line) & Margin
  const netProfit =
    data.netProfit !== undefined
      ? data.netProfit
      : Math.round((grossProfit - totalOperatingExpenses) * 100) / 100
  const netProfitMargin =
    data.netProfitMargin !== undefined
      ? data.netProfitMargin
      : grossRevenue > 0
      ? Math.round((netProfit / grossRevenue) * 10000) / 100
      : 0

  const isPositiveNet = netProfit >= 0
  const isPositiveGross = grossProfit >= 0
  const valuationItems = cogs?.inventoryValuationItems || []

  const branchScopeLabel =
    selectedBranch === 'All'
      ? 'All Branches (Consolidated)'
      : `${selectedBranch} Warehouse`

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] p-5 shadow-sm">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              <span>Dynamic Income Statement (P&L)</span>
            </h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <MapPin className="w-3 h-3" />
              {branchScopeLabel}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Sparkles className="w-3 h-3" />
              Live Master Unit Rates
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Periodic Inventory Method P&L for {formatMonthLabel(selectedMonth)}{' '}
            {isArchived ? '(Archived Month)' : '(Active Cycle)'}
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
        {/* 1. REVENUE (TOP LINE) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900/60 px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100 flex justify-between items-center">
            <span className="uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400">
              1. Revenue (Top Line)
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold font-mono">
              {formatCurrency(grossRevenue)}
            </span>
          </div>
          <div className="p-3.5 space-y-2 bg-white dark:bg-[#131b2a]">
            <div className="flex justify-between items-center font-semibold text-slate-800 dark:text-slate-100">
              <span className="pl-2">Gross Installation Billing</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(grossRevenue)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span className="pl-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Paid Client Receipts & Settled Vouchers
                </span>
                <span className="font-medium font-mono text-slate-700 dark:text-slate-300">
                  {formatCurrency(paidRevenue)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span className="pl-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Trade & Voucher Receivables (Pending Collection)
                </span>
                <span className="font-medium font-mono text-amber-600 dark:text-amber-400">
                  {formatCurrency(uncollectedReceivables)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. COST OF GOODS SOLD (COGS) BREAKDOWN */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900/60 px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100 flex justify-between items-center">
            <span className="uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400">
              2. Cost of Goods Sold (COGS) Breakdown [Periodic Inventory Method]
            </span>
            <span className="text-rose-600 dark:text-rose-400 text-sm font-bold font-mono">
              {formatCurrency(totalCOGS)}
            </span>
          </div>

          <div className="p-3.5 space-y-2.5 bg-white dark:bg-[#131b2a]">
            {/* (+) Opening Inventory Valuation (as of 1st) */}
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span className="pl-2 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  (+)
                </span>
                <span>Opening Inventory Valuation (as of 1st)</span>
              </span>
              <span className="font-semibold font-mono text-slate-900 dark:text-slate-100">
                {formatCurrency(openingInventoryValuation)}
              </span>
            </div>

            {/* (+) Vendor Restock Purchases */}
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span className="pl-2 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  (+)
                </span>
                <span>Vendor Restock Purchases</span>
              </span>
              <span className="font-semibold font-mono text-slate-900 dark:text-slate-100">
                {formatCurrency(vendorPurchases)}
              </span>
            </div>

            {/* (-) Closing Inventory Valuation (current/month-end) */}
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span className="pl-2 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-5 rounded bg-rose-500/10 text-[11px] font-bold font-mono text-rose-600 dark:text-rose-400">
                  (-)
                </span>
                <span>Closing Inventory Valuation (current/month-end)</span>
              </span>
              <span className="font-semibold font-mono text-rose-600 dark:text-rose-400">
                -{formatCurrency(closingInventoryValuation)}
              </span>
            </div>

            {/* Subtotal: Periodic Material COGS */}
            <div className="flex justify-between items-center py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-medium">
                Periodic Material Consumption COGS{' '}
                <span className="text-[11px] text-slate-400">
                  ((Opening + Purchases) - Closing)
                </span>
              </span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                {formatCurrency(periodicMaterialCOGS)}
              </span>
            </div>

            {/* (+) Job Additional Supplies & Misc Site Expenses */}
            <div className="space-y-1 pt-0.5">
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <span className="pl-2 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    (+)
                  </span>
                  <span>Job Additional Supplies & Misc Site Expenses</span>
                </span>
                <span className="font-semibold font-mono text-slate-900 dark:text-slate-100">
                  {formatCurrency(siteAddonCosts)}
                </span>
              </div>
              <div className="pl-10 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                <span>Additional Hardware Supplies: {formatCurrency(additionalSupplyCost)}</span>
                <span>•</span>
                <span>Site Misc Expenses (Fuel, Site): {formatCurrency(miscSiteExpenses)}</span>
              </div>
            </div>

            {/* = Total Cost of Goods Sold (COGS) */}
            <div className="pt-2.5 mt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center font-bold text-slate-900 dark:text-slate-100">
              <span className="pl-2">= Total Cost of Goods Sold (COGS)</span>
              <span className="font-mono text-sm sm:text-base text-rose-600 dark:text-rose-400">
                {formatCurrency(totalCOGS)}
              </span>
            </div>

            {/* Expandable Itemized Master Unit Rate Valuation Table */}
            {valuationItems.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setShowValuationDetails((prev) => !prev)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline no-print"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>
                    {showValuationDetails
                      ? 'Hide Itemized Master Rate Valuation Schedule'
                      : 'View Itemized Master Rate Valuation Schedule (8 Materials)'}
                  </span>
                  {showValuationDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showValuationDetails && (
                  <div className="mt-2.5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                          <th className="py-2 px-3">Material Item</th>
                          <th className="py-2 px-3 text-right">Active Master Rate</th>
                          <th className="py-2 px-3 text-right">Opening (1st)</th>
                          <th className="py-2 px-3 text-right">Opening Valuation</th>
                          <th className="py-2 px-3 text-right">Closing Units</th>
                          <th className="py-2 px-3 text-right">Closing Valuation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {valuationItems.map((item) => (
                          <tr
                            key={item.key}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 text-slate-700 dark:text-slate-300"
                          >
                            <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                              {item.name}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                              {formatCurrency(item.masterUnitRate)}/{item.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {item.openingUnits} {item.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {formatCurrency(item.openingValuation)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {item.closingUnits} {item.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                              {formatCurrency(item.closingValuation)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100">
                          <td className="py-2 px-3" colSpan={3}>
                            Total Warehouse Valuation ({branchScopeLabel})
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(openingInventoryValuation)}
                          </td>
                          <td className="py-2 px-3"></td>
                          <td className="py-2 px-3 text-right font-mono text-cyan-600 dark:text-cyan-400">
                            {formatCurrency(closingInventoryValuation)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3. GROSS PROFIT BANNER */}
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isPositiveGross
              ? 'bg-gradient-to-r from-cyan-500/10 via-emerald-500/10 to-teal-500/5 border-emerald-500/30'
              : 'bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-red-500/5 border-rose-500/30'
          }`}
        >
          <div>
            <div
              className={`text-xs font-bold uppercase tracking-wider ${
                isPositiveGross
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              Gross Profit (Gross Revenue - Total COGS)
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight mt-0.5 font-mono">
              {formatCurrency(grossProfit)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {formatCurrency(grossRevenue)} Gross Billing − {formatCurrency(totalCOGS)} Total COGS
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Gross Margin %
              </div>
              <div
                className={`text-lg sm:text-xl font-black font-mono ${
                  isPositiveGross
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {grossProfitMargin}%
              </div>
            </div>
          </div>
        </div>

        {/* 4. OPERATING EXPENSES (OpEx) BREAKDOWN */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900/60 px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100 flex justify-between items-center">
            <span className="uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400">
              3. Operating Expenses (OpEx) Breakdown
            </span>
            <span className="text-amber-600 dark:text-amber-400 text-sm font-bold font-mono">
              {formatCurrency(totalOperatingExpenses)}
            </span>
          </div>

          <div className="p-3.5 space-y-2.5 bg-white dark:bg-[#131b2a]">
            {/* General Overhead Expenses (OpEx) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <span className="pl-2 font-medium">General Overhead Expenses (OpEx)</span>
                <span className="font-semibold font-mono text-slate-900 dark:text-slate-100">
                  {formatCurrency(generalExpensesTotal)}
                </span>
              </div>

              {opExCategoryList.length > 0 && (
                <div className="pl-6 space-y-1 border-l-2 border-slate-100 dark:border-slate-800 ml-3">
                  {opExCategoryList.map((cat) => (
                    <div
                      key={cat.category}
                      className="flex justify-between text-xs text-slate-500 dark:text-slate-400"
                    >
                      <span>{cat.category}</span>
                      <span className="font-mono">{formatCurrency(cat.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Field-Staff Payroll & Variable Job Incentives */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <span className="pl-2 font-medium">
                  Field-Staff Payroll & Variable Job Incentives
                </span>
                <span className="font-semibold font-mono text-slate-900 dark:text-slate-100">
                  {formatCurrency(payrollAndIncentivesTotal)}
                </span>
              </div>

              {payrollExpenses && payrollAndIncentivesTotal > 0 && (
                <div className="pl-6 space-y-1 border-l-2 border-slate-100 dark:border-slate-800 ml-3 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Base Salaries</span>
                    <span className="font-mono">{formatCurrency(payrollExpenses.baseSalaries || 0)}</span>
                  </div>
                  {(payrollExpenses.installationIncentives || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Variable Per-Job Installation Incentives</span>
                      <span className="font-mono">
                        {formatCurrency(payrollExpenses.installationIncentives || 0)}
                      </span>
                    </div>
                  )}
                  {(payrollExpenses.overtime || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Overtime Allowance</span>
                      <span className="font-mono">{formatCurrency(payrollExpenses.overtime || 0)}</span>
                    </div>
                  )}
                  {((payrollExpenses.fuelIncentives || 0) > 0 ||
                    (payrollExpenses.foodIncentives || 0) > 0) && (
                    <div className="flex justify-between">
                      <span>Fuel & Food Allowances</span>
                      <span className="font-mono">
                        {formatCurrency(
                          (payrollExpenses.fuelIncentives || 0) +
                            (payrollExpenses.foodIncentives || 0)
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* = Total Operating Expenses */}
            <div className="pt-2.5 mt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center font-bold text-slate-900 dark:text-slate-100">
              <span className="pl-2">= Total Operating Expenses</span>
              <span className="font-mono text-sm sm:text-base text-amber-600 dark:text-amber-400">
                {formatCurrency(totalOperatingExpenses)}
              </span>
            </div>
          </div>
        </div>

        {/* 5. NET PROFIT FINAL BANNER */}
        <div
          className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
            isPositiveNet
              ? 'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/10 border-emerald-500/40'
              : 'bg-gradient-to-r from-rose-500/15 via-red-500/10 to-orange-500/10 border-rose-500/40'
          }`}
        >
          <div>
            <div
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isPositiveNet
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {isPositiveNet ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>Net Profit (Gross Profit - Total Operating Expenses)</span>
            </div>
            <div
              className={`text-2xl sm:text-3xl font-black tracking-tight mt-0.5 font-mono ${
                isPositiveNet
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(netProfit)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Gross Margin: {grossProfitMargin}% | Net Margin: {netProfitMargin}%
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Net Margin %
              </div>
              <div
                className={`text-xl font-black font-mono ${
                  isPositiveNet
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {netProfitMargin}%
              </div>
            </div>

            <div
              className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-md ${
                isPositiveNet
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-rose-500 text-white'
              }`}
            >
              {netProfitMargin >= 20
                ? 'Strong Profitability'
                : isPositiveNet
                ? 'Positive Net Margin'
                : 'Net Deficit / Loss'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
