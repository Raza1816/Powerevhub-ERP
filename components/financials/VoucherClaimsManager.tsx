'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useApp } from '@/components/common/AppContext'
import { useBranch } from '@/app/context/BranchContext'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/components/auth/AuthContext'
import {
  Zap,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowRight,
  Building2,
  Calendar,
  DollarSign,
  AlertCircle,
  FileCheck,
  CreditCard,
  RefreshCw,
} from 'lucide-react'
import { formatDateDisplay } from '@/lib/dateUtils'

export function VoucherClaimsManager() {
  const { formatCurrency, refreshKey, triggerRefresh } = useApp()
  const { selectedBranch } = useBranch()
  const { isViewer } = useAuth()
  const toast = useToast()

  const [vouchers, setVouchers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'pending' | 'settled' | 'all'>('pending')
  const [branchFilter, setBranchFilter] = useState<string>(selectedBranch !== 'All' ? selectedBranch : 'All')

  // Selected voucher IDs for batch settlement
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Settlement Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [receivingAccount, setReceivingAccount] = useState<'Bank' | 'Cash'>('Bank')
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0])
  const [settlementNotes, setSettlementNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Sync branch filter when global branch context changes
  useEffect(() => {
    if (selectedBranch !== 'All') {
      setBranchFilter(selectedBranch)
    }
  }, [selectedBranch])

  // Fetch voucher jobs
  const fetchVouchers = async () => {
    setLoading(true)
    try {
      let url = '/api/jobs?isVoucher=true&month=ALL'
      if (branchFilter !== 'All') url += `&branch=${encodeURIComponent(branchFilter)}`
      if (statusFilter === 'pending') url += '&voucherSettled=false'
      if (statusFilter === 'settled') url += '&voucherSettled=true'

      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setVouchers(data.data || [])
      }
    } catch (err) {
      console.error('Failed to load vouchers:', err)
      toast.error('Error', 'Failed to load voucher claims.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVouchers()
    setSelectedIds([])
  }, [branchFilter, statusFilter, refreshKey])

  // Client-side search filtering
  const filteredVouchers = useMemo(() => {
    if (!searchQuery.trim()) return vouchers
    const q = searchQuery.toLowerCase()
    return vouchers.filter(
      (v) =>
        v.clientName?.toLowerCase().includes(q) ||
        v.contactNo?.toLowerCase().includes(q) ||
        v.addressArea?.toLowerCase().includes(q) ||
        v.vehicleBrand?.toLowerCase().includes(q) ||
        String(v.sn).includes(q)
    )
  }, [vouchers, searchQuery])

  // Summary Metrics
  const metrics = useMemo(() => {
    let pendingCount = 0
    let pendingAmount = 0
    let settledCount = 0
    let settledAmount = 0
    let excessReceivable = 0

    vouchers.forEach((v) => {
      const netClaim = v.voucherNetClaim ?? 51150
      if (v.voucherSettled) {
        settledCount++
        settledAmount += netClaim
      } else {
        pendingCount++
        pendingAmount += netClaim
      }
      excessReceivable += v.customerExcessReceivable || 0
    })

    return { pendingCount, pendingAmount, settledCount, settledAmount, excessReceivable }
  }, [vouchers])

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewer) return
    if (e.target.checked) {
      const unsettled = filteredVouchers.filter((v) => !v.voucherSettled).map((v) => v.id)
      setSelectedIds(unsettled)
    } else {
      setSelectedIds([])
    }
  }

  const handleToggleSelect = (id: string) => {
    if (isViewer) return
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const selectedVoucherItems = useMemo(() => {
    return vouchers.filter((v) => selectedIds.includes(v.id))
  }, [vouchers, selectedIds])

  const totalSelectedClaim = useMemo(() => {
    return selectedVoucherItems.reduce((sum, v) => sum + (v.voucherNetClaim ?? 51150), 0)
  }, [selectedVoucherItems])

  // Execute Batch Settlement
  const handleBatchSettle = async () => {
    if (selectedIds.length === 0) return

    try {
      setSubmitting(true)
      const res = await fetch('/api/jobs/batch-settle-vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobIds: selectedIds,
          receivingAccount,
          settlementDate,
          notes: settlementNotes,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Vouchers Reimbursed', data.message)
        setIsModalOpen(false)
        setSelectedIds([])
        fetchVouchers()
        triggerRefresh()
      } else {
        toast.error('Settlement Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>BYD Voucher Claims Manager</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                  {metrics.pendingCount} Pending Claims
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track Rs. 51,150 net corporate claims covered by BYD vouchers and batch-reimburse upon payment receipt.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchVouchers}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Claims</span>
        </button>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Claims Card */}
        <div className="p-4 rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/20 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-sky-700 dark:text-sky-300 mb-1">
            <span>Pending BYD Claims</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-sky-900 dark:text-sky-100">
            {formatCurrency(metrics.pendingAmount)}
          </div>
          <div className="text-[11px] text-sky-600 dark:text-sky-400 mt-1 font-semibold">
            {metrics.pendingCount} unsettled voucher claim(s)
          </div>
        </div>

        {/* Settled / Reimbursed Claims */}
        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
            <span>Total Reimbursed from BYD</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
            {formatCurrency(metrics.settledAmount)}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
            {metrics.settledCount} corporate voucher(s) settled
          </div>
        </div>

        {/* Standard Net Claim Per Voucher */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            <span>Standard Claim Formula</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            Rs. 51,150
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            Rs. 65,000 face - Rs. 13,850 WHT
          </div>
        </div>

        {/* Customer Excess Receivable */}
        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
            <span>Customer Excess Receivable</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-100">
            {formatCurrency(metrics.excessReceivable)}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
            Customer unpaid bills above Rs. 65k
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by client name, contact, area, vehicle brand, Sn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
          >
            <option value="pending">Pending BYD Claims Only</option>
            <option value="settled">Settled / Reimbursed Only</option>
            <option value="all">All Vouchers</option>
          </select>

          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
          >
            <option value="All">All Branches</option>
            <option value="Karachi">Karachi Branch</option>
            <option value="Lahore">Lahore Branch</option>
          </select>
        </div>
      </div>

      {/* BATCH ACTION BAR (WHEN ITEMS ARE SELECTED) */}
      {selectedIds.length > 0 && !isViewer && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
              {selectedIds.length}
            </div>
            <div>
              <div className="text-sm font-bold">
                {selectedIds.length} Voucher(s) Selected for Settlement
              </div>
              <div className="text-xs text-sky-100">
                Total Reimbursement Net Claim: <b>{formatCurrency(totalSelectedClaim)}</b>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              Deselect All
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-white text-sky-900 hover:bg-sky-50 shadow-md transition-all active:scale-95"
            >
              <FileCheck className="w-4 h-4 text-sky-600" />
              <span>Mark Selected as Reimbursed by BYD</span>
            </button>
          </div>
        </div>
      )}

      {/* VOUCHERS TABLE */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredVouchers.filter((v) => !v.voucherSettled).length > 0 &&
                      selectedIds.length === filteredVouchers.filter((v) => !v.voucherSettled).length
                    }
                    onChange={handleSelectAll}
                    disabled={isViewer || filteredVouchers.filter((v) => !v.voucherSettled).length === 0}
                    className="accent-sky-600 rounded cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 w-14 text-center">Sn.</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Client & Vehicle</th>
                <th className="py-3 px-3">Branch</th>
                <th className="py-3 px-3 text-right">Face Value</th>
                <th className="py-3 px-3 text-right">WHT Deduction</th>
                <th className="py-3 px-3 text-right">Net Claim</th>
                <th className="py-3 px-3 text-center">Customer Excess</th>
                <th className="py-3 px-3 text-center">Settlement Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading voucher claims...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No voucher claims found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => {
                  const isSelected = selectedIds.includes(v.id)
                  const isSettled = !!v.voucherSettled
                  const netClaim = v.voucherNetClaim ?? 51150
                  const faceValue = v.voucherGrossAmount ?? 65000
                  const deduction = v.voucherDeduction ?? 13850

                  return (
                    <tr
                      key={v.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-sky-50/50 dark:bg-sky-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(v.id)}
                          disabled={isSettled || isViewer}
                          className="accent-sky-600 rounded cursor-pointer disabled:opacity-40"
                        />
                      </td>

                      {/* Sn */}
                      <td className="py-3 px-3 text-center font-bold text-sky-600 dark:text-sky-400">
                        #{v.sn}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {formatDateDisplay(v.date)}
                      </td>

                      {/* Client & Vehicle */}
                      <td className="py-3 px-3 max-w-[200px]">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {v.clientName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                            {v.vehicleBrand || 'BYD'}
                          </span>
                          {v.contactNo && (
                            <span className="text-[11px] text-slate-400 truncate">
                              {v.contactNo}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Branch */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            v.branch === 'Lahore'
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {v.branch || 'Karachi'}
                        </span>
                      </td>

                      {/* Face Value */}
                      <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                        {formatCurrency(faceValue)}
                      </td>

                      {/* Deduction */}
                      <td className="py-3 px-3 text-right font-medium text-rose-600 dark:text-rose-400">
                        -{formatCurrency(deduction)}
                      </td>

                      {/* Net Claim */}
                      <td className="py-3 px-3 text-right font-bold text-sky-600 dark:text-sky-400 text-sm">
                        {formatCurrency(netClaim)}
                      </td>

                      {/* Customer Excess */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {(v.customerExcessReceivable ?? 0) > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            Due: {formatCurrency(v.customerExcessReceivable)}
                          </span>
                        ) : (v.customerExcessPaid ?? 0) > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            Paid: {formatCurrency(v.customerExcessPaid)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">None (Covered)</span>
                        )}
                      </td>

                      {/* Settlement Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isSettled ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>Reimbursed</span>
                            </span>
                            {v.voucherSettledDate && (
                              <span className="text-[9px] text-slate-400 mt-0.5">
                                {formatDateDisplay(v.voucherSettledDate)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                            <Clock className="w-3 h-3 text-sky-500" />
                            <span>Claim Pending</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BATCH SETTLEMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Settle & Reimburse BYD Vouchers
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mark {selectedIds.length} voucher(s) as reimbursed by BYD Corporate.
                  </p>
                </div>
              </div>
            </div>

            {/* Total Claim Summary */}
            <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20 flex items-center justify-between">
              <div>
                <span className="text-xs text-sky-700 dark:text-sky-300 font-semibold block">
                  Total Reimbursement Inflow
                </span>
                <span className="text-2xl font-black text-sky-900 dark:text-sky-100">
                  {formatCurrency(totalSelectedClaim)}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-600 text-white">
                {selectedIds.length} Vouchers
              </span>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Receiving Bank / Cash Account *
                </label>
                <select
                  value={receivingAccount}
                  onChange={(e) => setReceivingAccount(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-sky-500"
                >
                  <option value="Bank">Bank Account (Corporate Wire / Cheque / Online)</option>
                  <option value="Cash">Cash Account (Physical Inflow)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Settlement & Receipt Date *
                </label>
                <input
                  type="date"
                  required
                  value={settlementDate}
                  onChange={(e) => setSettlementDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reference / Reimbursement Advice Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. BYD Batch Claim Wire Ref #BYD-2026-09"
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleBatchSettle}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-md active:scale-95 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Settling Vouchers...' : 'Confirm Reimbursement'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
