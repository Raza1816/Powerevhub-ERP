'use client'

import React, { useState, useEffect } from 'react'
import { useApp } from '@/components/common/AppContext'
import { useBranch } from '@/app/context/BranchContext'
import { KpiCard } from './KpiCard'
import { CashBankCard } from './CashBankCard'
import { IncomeStatementView } from './IncomeStatementView'
import { AnalyticsCharts } from './AnalyticsCharts'
import {
  Zap,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  ShoppingCart,
  Wallet,
  Building2,
  Layers,
  AlertTriangle,
  Lock,
  Plus,
  CreditCard,
  Receipt,
  Users,
  ArrowRight,
  PieChart,
  MapPin,
} from 'lucide-react'
import { formatMonthLabel } from '@/lib/dateUtils'
import { useAuth } from '@/components/auth/AuthContext'

export function ExecutiveDashboard({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const { selectedMonth, isArchived, formatCurrency, refreshKey, openNewJobModal } = useApp()
  const { selectedBranch } = useBranch()
  const { isViewer } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/dashboard?month=${selectedMonth}&branch=${encodeURIComponent(selectedBranch)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json)
        }
      })
      .catch((err) => console.error('Dashboard load error:', err))
      .finally(() => setLoading(false))
  }, [selectedMonth, selectedBranch, refreshKey])

  if (loading && !data) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading financial dashboard...</p>
      </div>
    )
  }

  const kpis = data?.kpis || {}
  const expenditures = data?.expenditureBreakdown || {}
  const directProc = expenditures.directProcurement || {}
  const opOverhead = expenditures.operationalOverhead || {}
  const payrollStaff = expenditures.payrollStaff || {}

  return (
    <div className="space-y-6 pb-12">
      {/* ARCHIVE NOTICE BANNER IF APPLICABLE */}
      {isArchived && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <h4 className="text-sm font-bold">Historical Archive Mode: {formatMonthLabel(selectedMonth)}</h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                You are reviewing archived historical installation records and closed financial reports.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            Read-Only Audit
          </span>
        </div>
      )}

      {/* DASHBOARD HEADER & QUICK ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span>Executive Performance Dashboard</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              {formatMonthLabel(selectedMonth)}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
              selectedBranch === 'All'
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                : selectedBranch === 'Karachi'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
            }`}>
              {selectedBranch === 'All' ? '🌐 Consolidated (All Branches)' : `📍 ${selectedBranch} Branch`}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Key operational metrics, multi-tier expenditure classification, and live treasury balances.
          </p>
        </div>

        {!isArchived && !isViewer && (
          <div className="flex flex-wrap items-center gap-2">
            {onTabChange && (
              <>
                <button
                  onClick={() => onTabChange('financials')}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm transition-all"
                >
                  <Receipt className="w-3.5 h-3.5 text-amber-500" />
                  <span>+ OpEx Expense</span>
                </button>
                <button
                  onClick={() => onTabChange('financials')}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm transition-all"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>+ Payroll / Staff</span>
                </button>
              </>
            )}
            <button
              onClick={openNewJobModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create New Job</span>
            </button>
          </div>
        )}
      </div>

      {/* 9 PRIMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Total Installations */}
        <KpiCard
          title="Total Installations"
          value={`${kpis.totalInstallations || 0} Jobs`}
          subtitle="Active Month Job Count"
          icon={Zap}
          colorClass="text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
          formulaTooltip="Count of all charger installation jobs logged in the selected calendar month."
        />

        {/* 2. Total Billed Revenue */}
        <KpiCard
          title="Total Revenue (Billed)"
          value={formatCurrency(kpis.totalRevenue)}
          subtitle={`Paid: ${formatCurrency(kpis.totalPaidRevenue)}`}
          icon={DollarSign}
          colorClass="text-cyan-500 bg-cyan-500/10 border-cyan-500/20"
          formulaTooltip="Sum of all manual Bill Amounts invoiced to clients in this monthly cycle."
        />

        {/* 3. Total Paid Revenue */}
        <KpiCard
          title="Total Paid Inflow"
          value={formatCurrency(kpis.totalPaidRevenue)}
          subtitle="Verified client collections"
          icon={CheckCircle2}
          colorClass="text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
          trend={`${kpis.totalRevenue > 0 ? Math.round(((kpis.totalPaidRevenue || 0) / kpis.totalRevenue) * 100) : 0}% Collection Rate`}
          trendType="positive"
          formulaTooltip="Total revenue received from jobs marked with status 'Paid'."
        />

        {/* 4A. Customer Trade Receivables */}
        <KpiCard
          title="Customer Trade Receivables"
          value={formatCurrency(kpis.customerTradeReceivables || 0)}
          subtitle="Customer excess & direct unpaid invoices"
          icon={Clock}
          colorClass="text-amber-500 bg-amber-500/10 border-amber-500/20"
          trend={`${kpis.totalRevenue > 0 ? Math.round(((kpis.customerTradeReceivables || 0) / kpis.totalRevenue) * 100) : 0}% of Billed Revenue`}
          trendType="neutral"
          formulaTooltip="Pending customer invoices and excess unpaid amounts only (excludes BYD OEM voucher claims)."
        />

        {/* 4B. BYD Voucher Receivables */}
        <KpiCard
          title="BYD Voucher Receivables"
          value={formatCurrency(kpis.bydVoucherReceivables || 0)}
          subtitle={`${kpis.unsettledVoucherCount || 0} Pending OEM Claims (Rs. 51,150 net each)`}
          icon={Receipt}
          colorClass="text-blue-500 bg-blue-500/10 border-blue-500/20"
          trend={`${kpis.unsettledVoucherCount || 0} unsettled claims`}
          trendType={kpis.unsettledVoucherCount > 0 ? 'neutral' : 'positive'}
          formulaTooltip="Sum of pending net reimbursement claims from BYD for completed voucher installations."
        />

        {/* 5. Total Procurement Spend */}
        <KpiCard
          title="Direct Procurement"
          value={formatCurrency(kpis.totalPurchases)}
          subtitle={`Settled: ${formatCurrency(directProc.settled || 0)} | Credit: ${formatCurrency(kpis.vendorPayables || 0)}`}
          icon={ShoppingCart}
          colorClass="text-indigo-500 bg-indigo-500/10 border-indigo-500/20"
          formulaTooltip="Total raw material & hardware procurement expenditures paid or committed to suppliers."
        />

        {/* 6. Operational Overhead & Payroll */}
        <KpiCard
          title="OpEx & Payroll Overheads"
          value={formatCurrency((kpis.totalGeneralExpenses || 0) + (kpis.totalGrossPayroll || 0) + (kpis.totalMiscExpenses || 0))}
          subtitle={`OpEx: ${formatCurrency(kpis.totalGeneralExpenses || 0)} | Staff: ${formatCurrency(kpis.totalGrossPayroll || 0)}`}
          icon={Receipt}
          colorClass="text-rose-500 bg-rose-500/10 border-rose-500/20"
          formulaTooltip="Total non-material business operational overheads and employee salaries/incentives."
        />

        {/* 7. Total Gross Profit & Margin */}
        <KpiCard
          title="Total Gross Profit"
          value={formatCurrency(kpis.totalGrossProfit)}
          subtitle={`Gross Margin: ${kpis.grossProfitMargin || 0}%`}
          icon={TrendingUp}
          colorClass="text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
          trend={`${kpis.grossProfitMargin || 0}% margin`}
          trendType={kpis.grossProfitMargin >= 20 ? 'positive' : 'neutral'}
          formulaTooltip="Dynamic Gross Profit = Manual Bill Amount - (Locked Material Costs + Additional Supplies + Misc Exp)."
        />

        {/* 8. Available Cash Balance */}
        <KpiCard
          title="Available Cash Balance"
          value={formatCurrency(kpis.availableCash)}
          subtitle="Cash In - Vendor/OpEx/Staff Cash Out"
          icon={Wallet}
          colorClass="text-teal-500 bg-teal-500/10 border-teal-500/20"
          trend="Real-time liquid cash"
          trendType="neutral"
          formulaTooltip="Available Cash in hand after client receipts, vendor cash purchases, cash OpEx, and cash payroll."
        />

        {/* 9. Available Bank Balance */}
        <KpiCard
          title="Available Bank Balance"
          value={formatCurrency(kpis.availableBank)}
          subtitle="Bank In - Vendor/OpEx/Staff Bank Out"
          icon={Building2}
          colorClass="text-sky-500 bg-sky-500/10 border-sky-500/20"
          trend="Real-time bank treasury"
          trendType="neutral"
          formulaTooltip="Available Bank balance after client receipts, vendor bank transfers, OpEx bank, and payroll bank."
        />
      </div>

      {/* TASK 4: 3-TIER EXPENDITURE CLASSIFICATION MASTER MATRIX */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-500" />
              Categorized Total Expenditure Classification
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete multi-tier distribution of business capital outflows for {formatMonthLabel(selectedMonth)}.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Monthly Outflows:</span>
            <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
              {formatCurrency(expenditures.totalOverallExpenditure || 0)}
            </span>
          </div>
        </div>

        {/* Combined visual percentage distribution bar */}
        {expenditures.totalOverallExpenditure > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Capital Outflow Allocation</span>
              <span>100% Total Committed</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              <div
                style={{ width: `${directProc.percentage || 0}%` }}
                className="h-full bg-indigo-500 transition-all"
                title={`Direct Procurement: ${directProc.percentage}%`}
              />
              <div
                style={{ width: `${opOverhead.percentage || 0}%` }}
                className="h-full bg-amber-500 transition-all"
                title={`Operational Overhead: ${opOverhead.percentage}%`}
              />
              <div
                style={{ width: `${payrollStaff.percentage || 0}%` }}
                className="h-full bg-emerald-500 transition-all"
                title={`Staff Payroll: ${payrollStaff.percentage}%`}
              />
            </div>
          </div>
        )}

        {/* 3 Structured Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* 1. Direct Procurement Outflow */}
          <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 dark:bg-indigo-950/20 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-indigo-500" />
                  1. Direct Procurement
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                  {directProc.percentage || 0}%
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-indigo-950 dark:text-indigo-100 mt-2">
                {formatCurrency(directProc.total || 0)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Raw materials, cable rolls, and hardware supplier purchases.
              </p>
            </div>

            <div className="space-y-1.5 text-xs pt-2 border-t border-indigo-500/20">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Paid via Cash / Bank:</span>
                <span className="font-semibold font-mono text-slate-900 dark:text-slate-200">
                  {formatCurrency(directProc.settled || 0)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Unpaid / Supplier Credit:</span>
                <span className="font-semibold font-mono text-rose-600 dark:text-rose-400">
                  {formatCurrency(directProc.unpaid || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Operational Overhead Expenses */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-amber-500" />
                  2. Operational Overhead
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  {opOverhead.percentage || 0}%
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-amber-950 dark:text-amber-100 mt-2">
                {formatCurrency(opOverhead.total || 0)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Office rent, generator fuel, utilities, stationery, site misc logistics.
              </p>
            </div>

            <div className="space-y-1.5 text-xs pt-2 border-t border-amber-500/20">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>General OpEx Overhead:</span>
                <span className="font-semibold font-mono text-slate-900 dark:text-slate-200">
                  {formatCurrency(opOverhead.generalOpEx || 0)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Job Site Field Logistics:</span>
                <span className="font-semibold font-mono text-slate-900 dark:text-slate-200">
                  {formatCurrency(opOverhead.siteMiscExpenses || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Payroll & Staff Expenses */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-500" />
                  3. Payroll & Staff Expenses
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  {payrollStaff.percentage || 0}%
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-950 dark:text-emerald-100 mt-2">
                {formatCurrency(payrollStaff.total || 0)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Base staff salaries, overtime, food, fuel & installation incentives.
              </p>
            </div>

            <div className="space-y-1.5 text-xs pt-2 border-t border-emerald-500/20">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Base Salaries:</span>
                <span className="font-semibold font-mono text-slate-900 dark:text-slate-200">
                  {formatCurrency(payrollStaff.baseSalaries || 0)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Incentives, Fuel & OT:</span>
                <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(
                    (payrollStaff.overtime || 0) +
                      (payrollStaff.food || 0) +
                      (payrollStaff.fuel || 0) +
                      (payrollStaff.installation || 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TREASURY / CASH & BANK LIQUIDITY BREAKDOWN */}
      <CashBankCard data={data?.cashBankFlow} />

      {/* SOURCE & TECHNICIAN ANALYTICS */}
      <AnalyticsCharts
        sources={data?.sourceAnalytics}
        technicians={data?.technicianAnalytics}
      />

      {/* AUTOMATED INCOME STATEMENT (P&L) */}
      <IncomeStatementView data={data?.incomeStatement} />
    </div>
  )
}
