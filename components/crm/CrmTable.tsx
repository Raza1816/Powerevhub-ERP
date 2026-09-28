'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useApp } from '@/components/common/AppContext'
import { useBranch } from '@/app/context/BranchContext'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/components/auth/AuthContext'
import {
  Search,
  Filter,
  Download,
  Plus,
  Edit2,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Zap,
  Phone,
  MapPin,
  Lock,
  DollarSign,
  Layers,
} from 'lucide-react'
import { formatDateDisplay, formatMonthLabel } from '@/lib/dateUtils'

export function CrmTable() {
  const {
    selectedMonth,
    isArchived,
    formatCurrency,
    refreshKey,
    triggerRefresh,
    openNewJobModal,
    setEditingJobId,
    setVoucherJobId,
  } = useApp()

  const { selectedBranch } = useBranch()
  const { isViewer } = useAuth()
  const toast = useToast()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [sourceFilter, setSourceFilter] = useState<string>('ALL')
  const [techFilter, setTechFilter] = useState<string>('ALL')
  const [brandFilter, setBrandFilter] = useState<string>('ALL')
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch jobs for selected month
  useEffect(() => {
    setLoading(true)
    let url = `/api/jobs?month=${selectedMonth}`
    if (selectedBranch !== 'All') url += `&branch=${encodeURIComponent(selectedBranch)}`
    if (statusFilter !== 'ALL') url += `&status=${encodeURIComponent(statusFilter)}`
    if (sourceFilter !== 'ALL') url += `&source=${encodeURIComponent(sourceFilter)}`
    if (techFilter !== 'ALL') url += `&technician=${encodeURIComponent(techFilter)}`
    if (brandFilter !== 'ALL') url += `&vehicleBrand=${encodeURIComponent(brandFilter)}`
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setJobs(data.data || [])
        }
      })
      .catch((err) => console.error('Failed to load jobs:', err))
      .finally(() => setLoading(false))
  }, [selectedMonth, selectedBranch, statusFilter, sourceFilter, techFilter, brandFilter, searchQuery, refreshKey])

  // Extract unique filter dropdown values and counts from jobs
  const sourcesList = useMemo(() => {
    return Array.from(new Set(jobs.map((j) => j.source).filter(Boolean)))
  }, [jobs])

  const techniciansList = useMemo(() => {
    return Array.from(new Set(jobs.map((j) => j.technicianName).filter(Boolean)))
  }, [jobs])

  // Brands list & brand count calculation
  const { brandsList, brandCounts } = useMemo(() => {
    const counts: Record<string, number> = {}
    const knownBrands = ['BYD', 'MG', 'Deepal', 'Audi', 'Porsche', 'Hyundai']
    knownBrands.forEach((b) => { counts[b] = 0 })

    jobs.forEach((j) => {
      const b = j.vehicleBrand || 'BYD'
      counts[b] = (counts[b] || 0) + 1
    })

    const allBrands = Array.from(new Set([...knownBrands, ...jobs.map((j) => j.vehicleBrand).filter(Boolean)]))
    return { brandsList: allBrands, brandCounts: counts }
  }, [jobs])

  // Toggle Pay Status (e.g. Paid <-> Trade Receivable)
  const handleTogglePayStatus = async (job: any) => {
    if (isArchived || isViewer) {
      toast.error('Read-Only Access', isViewer ? 'Viewer accounts have read-only access.' : 'Historical months are read-only to preserve financial audit trail.')
      return
    }

    const nextStatus = job.payStatus === 'Paid' ? 'Trade Receivable' : 'Paid'
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payStatus: nextStatus,
          paidDate: nextStatus === 'Paid' ? new Date().toISOString().split('T')[0] : null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(
          `Status Updated: ${nextStatus}`,
          `Job Sn #${job.sn} marked as ${nextStatus}.`
        )
        triggerRefresh()
      } else {
        toast.error('Update Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    }
  }

  // Delete Job
  const handleDeleteJob = async (id: string, sn: number) => {
    if (isArchived) {
      toast.error('Archived Record', 'Historical months are read-only.')
      return
    }

    if (!confirm(`Are you sure you want to delete Job Sn #${sn}? Inventory deducted for this job will be rolled back.`)) {
      return
    }

    try {
      setDeletingId(id)
      const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success(`Job Deleted`, `Sn #${sn} deleted and warehouse inventory recalculated.`)
        triggerRefresh()
      } else {
        toast.error('Delete Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    } finally {
      setDeletingId(null)
    }
  }

  // Export to CSV
  const handleExportCsv = () => {
    if (jobs.length === 0) {
      toast.info('No Data', 'No jobs available to export for this month.')
      return
    }

    const headers = [
      'Sn',
      'Date',
      'Vehicle Brand',
      'Client Name',
      'Contact',
      'Address',
      'Source',
      'Technician',
      '16mm Cable (m)',
      '16mm Unit Cost',
      '16mm Total Cost',
      '10mm Cable (m)',
      '10mm Unit Cost',
      '10mm Total Cost',
      '6mm Cable (m)',
      '6mm Unit Cost',
      '6mm Total Cost',
      'DB Box Qty',
      'DB Box Unit Cost',
      'DB Box Total Cost',
      'Earthing Rod Qty',
      'Earthing Rod Unit Cost',
      'Earthing Rod Total Cost',
      'WPB Box Qty',
      'WPB Box Unit Cost',
      'WPB Box Total Cost',
      'NIN UVR Qty',
      'NIN UVR Unit Cost',
      'NIN UVR Total Cost',
      'RCBO Breaker Qty',
      'RCBO Breaker Unit Cost',
      'RCBO Breaker Total Cost',
      'Addl Supply Name',
      'Addl Supply Cost',
      'Misc Expense',
      'Total Job Cost',
      'Bill Amount',
      'Gross Profit',
      'Gross Margin %',
      'Pay Status',
      'Is Voucher',
      'Voucher Net Claim',
      'Customer Excess Paid',
      'Customer Excess Receivable',
      'Payment Method',
    ]

    const csvRows = [headers.join(',')]

    jobs.forEach((j) => {
      const row = [
        j.sn,
        `"${j.date}"`,
        `"${j.vehicleBrand || 'BYD'}"`,
        `"${(j.clientName || '').replace(/"/g, '""')}"`,
        `"${j.contactNo || ''}"`,
        `"${(j.addressArea || '').replace(/"/g, '""')}"`,
        `"${j.source || ''}"`,
        `"${j.technicianName || ''}"`,
        j.cable16mmMeter || 0,
        j.cable16mmUnitCost || 0,
        j.cable16mmTotalCost || 0,
        j.cable10mmMeter,
        j.cable10mmUnitCost,
        j.cable10mmTotalCost,
        j.cable6mmMeter,
        j.cable6mmUnitCost,
        j.cable6mmTotalCost,
        j.breakerBoxQty,
        j.breakerBoxUnitCost,
        j.breakerBoxTotalCost,
        j.earthingRodQty || 0,
        j.earthingRodUnitCost || 0,
        j.earthingRodTotalCost || 0,
        j.wpbQty || 0,
        j.wpbUnitCost || 0,
        j.wpbTotalCost || 0,
        j.ninUvrQty || 0,
        j.ninUvrUnitCost || 0,
        j.ninUvrTotalCost || 0,
        j.rcboBreakerQty || 0,
        j.rcboBreakerUnitCost || 0,
        j.rcboBreakerTotalCost || 0,
        `"${(j.additionalSupplyName || '').replace(/"/g, '""')}"`,
        j.additionalSupplyCost,
        j.miscExp,
        j.totalJobCost,
        j.billAmount,
        j.grossProfit,
        `${j.grossProfitMargin}%`,
        `"${j.payStatus}"`,
        j.isVoucher ? 'Yes' : 'No',
        j.voucherNetClaim || 0,
        j.customerExcessPaid || 0,
        j.customerExcessReceivable || 0,
        `"${j.paymentMethod}"`,
      ]
      csvRows.push(row.join(','))
    })

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Power_EV_Hub_Jobs_${selectedMonth}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Export Successful', `Exported ${jobs.length} jobs to CSV.`)
  }

  return (
    <div className="space-y-4 pb-12">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>CRM Installation Register</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {jobs.length} Jobs in {formatMonthLabel(selectedMonth)}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
              selectedBranch === 'All'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                : selectedBranch === 'Karachi'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
            }`}>
              {selectedBranch === 'All' ? '🌐 All Branches' : `📍 ${selectedBranch}`}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monthly Sn counter auto-increments and locks unit rates at job creation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {!isArchived && !isViewer && (
            <button
              onClick={openNewJobModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Add Installation</span>
            </button>
          )}
        </div>
      </div>

      {/* VEHICLE BRANDS INSTALLATION COUNTS */}
      <div className="flex items-center gap-2 flex-wrap text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-purple-500" />
          Vehicle Brand Installations:
        </span>
        <button
          onClick={() => setBrandFilter('ALL')}
          className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
            brandFilter === 'ALL'
              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
              : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-400'
          }`}
        >
          All Brands ({jobs.length})
        </button>
        {brandsList.map((b) => {
          const count = brandCounts[b] || 0
          const isSelected = brandFilter === b
          return (
            <button
              key={b}
              onClick={() => setBrandFilter(isSelected ? 'ALL' : b)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-400'
              }`}
            >
              <span>{b}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                isSelected ? 'bg-white/20 text-white' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by client name, contact, area, vehicle brand, source, tech..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Vehicle Brand Filter */}
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-purple-300 dark:border-purple-700/60 bg-purple-50/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-300 font-bold cursor-pointer"
          >
            <option value="ALL">All Vehicle Brands ({jobs.length})</option>
            {brandsList.map((b) => (
              <option key={b} value={b}>{b} ({brandCounts[b] || 0})</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Trade Receivable">Trade Receivable</option>
            <option value="Voucher">BYD Voucher</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
          >
            <option value="ALL">All Sources</option>
            {sourcesList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Technician Filter */}
          <select
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
          >
            <option value="ALL">All Technicians</option>
            {techniciansList.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* HIGH DENSITY TABULAR VIEW */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3 w-12 text-center">Sn.</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Client & Vehicle</th>
                <th className="py-3 px-3">Source & Team</th>
                <th className="py-3 px-3 text-right">Materials Breakdown</th>
                <th className="py-3 px-3 text-right">Total Cost</th>
                <th className="py-3 px-3 text-right">Bill Amount</th>
                <th className="py-3 px-3 text-right">Gross Profit</th>
                <th className="py-3 px-3 text-center">Payment Status</th>
                <th className="py-3 px-3 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading monthly records...</span>
                    </div>
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No installation jobs found for {formatMonthLabel(selectedMonth)}.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const isExpanded = expandedJobId === job.id
                  const isVoucher = job.isVoucher || job.paymentStatus === 'Voucher' || job.payStatus === 'Voucher'
                  const isPaid = job.payStatus === 'Paid'

                  return (
                    <React.Fragment key={job.id}>
                      <tr
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isExpanded ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''
                        }`}
                      >
                        {/* Sn. Counter */}
                        <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          #{job.sn}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                          {formatDateDisplay(job.date)}
                        </td>

                        {/* Client Details & Vehicle Brand */}
                        <td className="py-3 px-3 max-w-[220px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {job.clientName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">
                              {job.vehicleBrand || 'BYD'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {job.contactNo && (
                              <span className="flex items-center gap-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {job.contactNo}
                              </span>
                            )}
                            {job.addressArea && (
                              <span className="flex items-center gap-0.5 truncate">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                {job.addressArea}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Source & Tech */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                              {job.source}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                              job.branch === 'Lahore'
                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            }`}>
                              {job.branch || 'Karachi'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {job.technicianName}
                          </div>
                        </td>

                        {/* Materials Breakdown Quick Summary */}
                        <td className="py-3 px-3 text-right text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <div>
                            {job.cable16mmMeter > 0 && <span className="mr-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">16mm: <b>{job.cable16mmMeter}m</b></span>}
                            {job.cable10mmMeter > 0 && <span className="mr-1.5">10mm: <b>{job.cable10mmMeter}m</b></span>}
                            {job.cable6mmMeter > 0 && <span className="mr-1.5">6mm: <b>{job.cable6mmMeter}m</b></span>}
                            {job.breakerBoxQty > 0 && <span>DB: <b>{job.breakerBoxQty}u</b></span>}
                          </div>
                          <button
                            onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 mt-0.5 font-medium"
                          >
                            {isExpanded ? 'Hide Cost Breakdown' : 'View Cost Breakdown'}
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>

                        {/* Total Cost */}
                        <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                          {formatCurrency(job.totalJobCost)}
                        </td>

                        {/* Manual Bill Amount */}
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(job.billAmount)}
                        </td>

                        {/* Dynamic Gross Profit */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className={`font-bold ${job.grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                            {formatCurrency(job.grossProfit)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {job.grossProfitMargin}% margin
                          </div>
                        </td>

                        {/* Payment Status Badge & Toggle */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isVoucher ? (
                            <div className="inline-flex flex-col items-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                job.voucherSettled
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-sky-500/15 border-sky-500/30 text-sky-700 dark:text-sky-300'
                              }`}>
                                <Zap className="w-3 h-3 text-sky-500" />
                                <span>{job.voucherSettled ? 'Voucher Reimbursed' : 'Voucher Claim (Rs. 51,150)'}</span>
                              </span>
                              {job.customerExcessReceivable > 0 && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                                  + Excess Due: {formatCurrency(job.customerExcessReceivable)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => !isViewer && handleTogglePayStatus(job)}
                              disabled={isArchived || isViewer}
                              title={isViewer ? 'Viewer: Read-only access' : isArchived ? 'Archived record' : 'Click to toggle Paid / Trade Receivable'}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                                isPaid
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25'
                                  : 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25'
                              } ${isArchived || isViewer ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                            >
                              {isPaid ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Paid ({job.paymentMethod || 'Cash'})</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3" />
                                  <span>Trade Receivable</span>
                                </>
                              )}
                            </button>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Printable Voucher */}
                            <button
                              onClick={() => setVoucherJobId(job.id)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Print Work Order / Invoice Voucher"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            {!isArchived && !isViewer && (
                              <>
                                {/* Edit */}
                                <button
                                   onClick={() => setEditingJobId(job.id)}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Edit Job"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete */}
                                <button
                                  onClick={() => handleDeleteJob(job.id, job.sn)}
                                  disabled={deletingId === job.id}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                                  title="Delete Job"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDABLE ROW FOR ITEM-LEVEL COST & LOCKED PRICE AUDIT */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
                          <td colSpan={10} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-[#131b2a]">
                              {/* Material Itemization */}
                              <div className="space-y-2">
                                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                  <Lock className="w-3.5 h-3.5 text-emerald-500" />
                                  Locked Unit Material Rates
                                </h4>
                                <div className="space-y-1 text-xs">
                                  {job.cable16mmMeter > 0 && (
                                    <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-semibold">
                                      <span>16mm Cable ({job.cable16mmMeter}m @ {formatCurrency(job.cable16mmUnitCost)}/m):</span>
                                      <span>{formatCurrency(job.cable16mmTotalCost)}</span>
                                    </div>
                                  )}
                                  {job.cable10mmMeter > 0 && (
                                    <div className="flex justify-between">
                                      <span>10mm Cable ({job.cable10mmMeter}m @ {formatCurrency(job.cable10mmUnitCost)}/m):</span>
                                      <span className="font-semibold">{formatCurrency(job.cable10mmTotalCost)}</span>
                                    </div>
                                  )}
                                  {job.cable6mmMeter > 0 && (
                                    <div className="flex justify-between">
                                      <span>6mm Cable ({job.cable6mmMeter}m @ {formatCurrency(job.cable6mmUnitCost)}/m):</span>
                                      <span className="font-semibold">{formatCurrency(job.cable6mmTotalCost)}</span>
                                    </div>
                                  )}
                                  {job.breakerBoxQty > 0 && (
                                    <div className="flex justify-between">
                                      <span>DB Box ({job.breakerBoxQty}u @ {formatCurrency(job.breakerBoxUnitCost)}/u):</span>
                                      <span className="font-semibold">{formatCurrency(job.breakerBoxTotalCost)}</span>
                                    </div>
                                  )}
                                  {job.rcboBreakerQty > 0 && (
                                    <div className="flex justify-between">
                                      <span>RCBO ({job.rcboBreakerQty}u @ {formatCurrency(job.rcboBreakerUnitCost)}/u):</span>
                                      <span className="font-semibold">{formatCurrency(job.rcboBreakerTotalCost)}</span>
                                    </div>
                                  )}
                                  {job.wpbQty > 0 && (
                                    <div className="flex justify-between">
                                      <span>WPB Box ({job.wpbQty}u @ {formatCurrency(job.wpbUnitCost)}/u):</span>
                                      <span className="font-semibold">{formatCurrency(job.wpbTotalCost)}</span>
                                    </div>
                                  )}
                                  {job.ninUvrQty > 0 && (
                                    <div className="flex justify-between">
                                      <span>NIN UVR ({job.ninUvrQty}u @ {formatCurrency(job.ninUvrUnitCost)}/u):</span>
                                      <span className="font-semibold">{formatCurrency(job.ninUvrTotalCost)}</span>
                                    </div>
                                  )}
                                  {job.earthingRodQty > 0 && (
                                    <div className="flex justify-between">
                                      <span>Earth Rod ({job.earthingRodQty}u @ {formatCurrency(job.earthingRodUnitCost)}/u):</span>
                                      <span className="font-semibold">{formatCurrency(job.earthingRodTotalCost)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Additional Supplies & Misc */}
                              <div className="space-y-2">
                                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                  Additional Supplies & Expenses
                                </h4>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="truncate max-w-[160px]">{job.additionalSupplyName || 'Additional Supplies'}:</span>
                                    <span className="font-semibold">{formatCurrency(job.additionalSupplyCost)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Field Misc / Site Expenses:</span>
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(job.miscExp)}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1 font-bold">
                                    <span>Total Job Cost:</span>
                                    <span>{formatCurrency(job.totalJobCost)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Notes & Financial Formula */}
                              <div className="space-y-2">
                                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                  Financial Logic & Notes
                                </h4>
                                <div className="p-2.5 rounded-lg bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 text-[11px] space-y-1">
                                  <div><b>Gross Profit:</b> {formatCurrency(job.billAmount)} - {formatCurrency(job.totalJobCost)} = <b>{formatCurrency(job.grossProfit)}</b></div>
                                  <div><b>Margin:</b> {job.grossProfitMargin}%</div>
                                  {isVoucher && (
                                    <div className="mt-1.5 pt-1.5 border-t border-emerald-500/20 text-sky-800 dark:text-sky-300">
                                      <div><b>BYD Voucher:</b> Face: {formatCurrency(job.voucherGrossAmount || 65000)} | WHT: -{formatCurrency(job.voucherDeduction || 13850)}</div>
                                      <div><b>Net Claim:</b> {formatCurrency(job.voucherNetClaim || 51150)} ({job.voucherSettled ? 'Reimbursed' : 'Unsettled'})</div>
                                      {job.customerExcessPaid > 0 && <div className="text-emerald-600">Customer Excess Paid: {formatCurrency(job.customerExcessPaid)}</div>}
                                      {job.customerExcessReceivable > 0 && <div className="text-amber-600">Customer Excess Receivable: {formatCurrency(job.customerExcessReceivable)}</div>}
                                    </div>
                                  )}
                                  {job.notes && <div className="text-slate-500 italic mt-1">&ldquo;{job.notes}&rdquo;</div>}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
