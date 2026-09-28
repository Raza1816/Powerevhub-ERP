'use client'

import React, { useState, useEffect } from 'react'
import { useApp } from '@/components/common/AppContext'
import { useBranch } from '@/app/context/BranchContext'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/components/auth/AuthContext'
import { X, Lock, Calculator, DollarSign, Zap, CheckCircle2, AlertCircle, Info, MapPin } from 'lucide-react'
import { getTodayDateString } from '@/lib/dateUtils'
import { calculateJobCosts } from '@/lib/pricing'

export function JobFormModal() {
  const {
    isNewJobModalOpen,
    closeNewJobModal,
    editingJobId,
    setEditingJobId,
    selectedMonth,
    formatCurrency,
    triggerRefresh,
  } = useApp()

  const { selectedBranch } = useBranch()
  const { isViewer } = useAuth()
  const toast = useToast()
  const isOpen = (isNewJobModalOpen || !!editingJobId) && !isViewer

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeRates, setActiveRates] = useState<{
    cable16mm: number
    cable10mm: number
    cable6mm: number
    breakerBox: number
    earthingRod: number
    wpb: number
    ninUvr: number
    rcboBreaker: number
  }>({
    cable16mm: 420,
    cable10mm: 250,
    cable6mm: 180,
    breakerBox: 4500,
    earthingRod: 3500,
    wpb: 1500,
    ninUvr: 3800,
    rcboBreaker: 3200,
  })
  const [dropdowns, setDropdowns] = useState<any>({
    SOURCE: [],
    TECHNICIAN: [],
    PAYMENT_METHOD: [],
    VEHICLE_BRAND: [],
  })

  // Excess payment handling state for voucher
  const [excessMode, setExcessMode] = useState<'Paid' | 'Receivable'>('Paid')

  // Form State
  const [formData, setFormData] = useState({
    branch: selectedBranch !== 'All' ? selectedBranch : 'Karachi',
    date: getTodayDateString(),
    clientName: '',
    contactNo: '',
    addressArea: '',
    source: 'Direct',
    technicianName: 'Team Alpha (Lead: Ali)',
    vehicleBrand: 'BYD',
    cable16mmMeter: 0,
    cable16mmUnitCost: 420,
    cable10mmMeter: 0,
    cable10mmUnitCost: 250,
    cable6mmMeter: 0,
    cable6mmUnitCost: 180,
    breakerBoxQty: 0,
    breakerBoxUnitCost: 4500,
    earthingRodQty: 0,
    earthingRodUnitCost: 3500,
    wpbQty: 0,
    wpbUnitCost: 1500,
    ninUvrQty: 0,
    ninUvrUnitCost: 3800,
    rcboBreakerQty: 0,
    rcboBreakerUnitCost: 3200,
    additionalSupplyName: '',
    additionalSupplyCost: 0,
    miscExp: 0,
    billAmount: 0,
    payStatus: 'Trade Receivable',
    paymentStatus: 'Trade Receivable',
    isVoucher: false,
    voucherGrossAmount: 65000,
    voucherDeduction: 13850,
    voucherNetClaim: 51150,
    voucherSettled: false,
    customerExcessPaid: 0,
    customerExcessReceivable: 0,
    paymentMethod: 'Bank Transfer',
    notes: '',
  })

  // Fetch active settings, unit rates, and dropdowns
  useEffect(() => {
    if (!isOpen) return

    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const rates = {
            cable16mm: 420,
            cable10mm: 250,
            cable6mm: 180,
            breakerBox: 4500,
            earthingRod: 3500,
            wpb: 1500,
            ninUvr: 3800,
            rcboBreaker: 3200,
          }
          data.unitRates?.forEach((r: any) => {
            if (r.itemKey === 'cable_16mm') rates.cable16mm = r.rate
            if (r.itemKey === 'cable_10mm') rates.cable10mm = r.rate
            if (r.itemKey === 'cable_6mm') rates.cable6mm = r.rate
            if (r.itemKey === 'breaker_box') rates.breakerBox = r.rate
            if (r.itemKey === 'earthing_rod') rates.earthingRod = r.rate
            if (r.itemKey === 'wpb' || r.itemKey === 'wpb_box') rates.wpb = r.rate
            if (r.itemKey === 'nin_uvr') rates.ninUvr = r.rate
            if (r.itemKey === 'rcbo_breaker') rates.rcboBreaker = r.rate
          })
          setActiveRates(rates)
          setDropdowns(data.dropdowns || {})

          // If creating new job, initialize unit rates from active master rates
          if (!editingJobId) {
            setFormData((prev) => ({
              ...prev,
              cable16mmUnitCost: rates.cable16mm,
              cable10mmUnitCost: rates.cable10mm,
              cable6mmUnitCost: rates.cable6mm,
              breakerBoxUnitCost: rates.breakerBox,
              earthingRodUnitCost: rates.earthingRod,
              wpbUnitCost: rates.wpb,
              ninUvrUnitCost: rates.ninUvr,
              rcboBreakerUnitCost: rates.rcboBreaker,
              source: data.dropdowns?.SOURCE?.[0]?.value || 'Direct',
              technicianName: data.dropdowns?.TECHNICIAN?.[0]?.value || 'Team Alpha (Lead: Ali)',
              paymentMethod: data.dropdowns?.PAYMENT_METHOD?.[0]?.value || 'Bank Transfer',
              vehicleBrand: data.dropdowns?.VEHICLE_BRAND?.[0]?.value || 'BYD',
            }))
          }
        }
      })
      .catch((err) => console.error('Failed to load settings:', err))

    // If editing existing job, load its data
    if (editingJobId) {
      setLoading(true)
      fetch(`/api/jobs/${editingJobId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            const j = data.data
            setFormData({
              ...j,
              paymentStatus: j.paymentStatus || j.payStatus || 'Trade Receivable',
              payStatus: j.payStatus || j.paymentStatus || 'Trade Receivable',
              isVoucher: !!j.isVoucher || j.paymentStatus === 'Voucher' || j.payStatus === 'Voucher',
              voucherGrossAmount: j.voucherGrossAmount ?? 65000,
              voucherDeduction: j.voucherDeduction ?? 13850,
              voucherNetClaim: j.voucherNetClaim ?? 51150,
              voucherSettled: !!j.voucherSettled,
              customerExcessPaid: j.customerExcessPaid ?? 0,
              customerExcessReceivable: j.customerExcessReceivable ?? 0,
              vehicleBrand: j.vehicleBrand || 'BYD',
              cable16mmMeter: j.cable16mmMeter ?? 0,
              cable16mmUnitCost: j.cable16mmUnitCost ?? 420,
            })
            if ((j.customerExcessReceivable ?? 0) > 0) {
              setExcessMode('Receivable')
            } else {
              setExcessMode('Paid')
            }
          }
        })
        .catch((err) => toast.error('Error', 'Failed to load job details.'))
        .finally(() => setLoading(false))
    } else {
      // Reset form with all hardware quantities at 0
      setFormData({
        branch: selectedBranch !== 'All' ? selectedBranch : 'Karachi',
        date: getTodayDateString(),
        clientName: '',
        contactNo: '',
        addressArea: '',
        source: 'Direct',
        technicianName: 'Team Alpha (Lead: Ali)',
        vehicleBrand: 'BYD',
        cable16mmMeter: 0,
        cable16mmUnitCost: activeRates.cable16mm || 420,
        cable10mmMeter: 0,
        cable10mmUnitCost: activeRates.cable10mm || 250,
        cable6mmMeter: 0,
        cable6mmUnitCost: activeRates.cable6mm || 180,
        breakerBoxQty: 0,
        breakerBoxUnitCost: activeRates.breakerBox || 4500,
        earthingRodQty: 0,
        earthingRodUnitCost: activeRates.earthingRod || 3500,
        wpbQty: 0,
        wpbUnitCost: activeRates.wpb || 1500,
        ninUvrQty: 0,
        ninUvrUnitCost: activeRates.ninUvr || 3800,
        rcboBreakerQty: 0,
        rcboBreakerUnitCost: activeRates.rcboBreaker || 3200,
        additionalSupplyName: '',
        additionalSupplyCost: 0,
        miscExp: 0,
        billAmount: 0,
        payStatus: 'Trade Receivable',
        paymentStatus: 'Trade Receivable',
        isVoucher: false,
        voucherGrossAmount: 65000,
        voucherDeduction: 13850,
        voucherNetClaim: 51150,
        voucherSettled: false,
        customerExcessPaid: 0,
        customerExcessReceivable: 0,
        paymentMethod: 'Bank Transfer',
        notes: '',
      })
      setExcessMode('Paid')
    }
  }, [isOpen, editingJobId])

  // Live calculation of financials
  const liveCalc = calculateJobCosts({
    cable16mmMeter: formData.cable16mmMeter,
    cable16mmUnitCost: formData.cable16mmUnitCost,
    cable10mmMeter: formData.cable10mmMeter,
    cable10mmUnitCost: formData.cable10mmUnitCost,
    cable6mmMeter: formData.cable6mmMeter,
    cable6mmUnitCost: formData.cable6mmUnitCost,
    breakerBoxQty: formData.breakerBoxQty,
    breakerBoxUnitCost: formData.breakerBoxUnitCost,
    earthingRodQty: formData.earthingRodQty,
    earthingRodUnitCost: formData.earthingRodUnitCost,
    wpbQty: formData.wpbQty,
    wpbUnitCost: formData.wpbUnitCost,
    ninUvrQty: formData.ninUvrQty,
    ninUvrUnitCost: formData.ninUvrUnitCost,
    rcboBreakerQty: formData.rcboBreakerQty,
    rcboBreakerUnitCost: formData.rcboBreakerUnitCost,
    additionalSupplyCost: formData.additionalSupplyCost,
    miscExp: formData.miscExp,
    billAmount: formData.billAmount,
  })

  // Calculate excess for voucher
  const voucherExcess = Math.max(0, formData.billAmount - (formData.voucherGrossAmount || 65000))

  const handleClose = () => {
    closeNewJobModal()
    setEditingJobId(null)
    // Clear and reset state back to 0
    setFormData({
      branch: selectedBranch !== 'All' ? selectedBranch : 'Karachi',
      date: getTodayDateString(),
      clientName: '',
      contactNo: '',
      addressArea: '',
      source: 'Direct',
      technicianName: 'Team Alpha (Lead: Ali)',
      vehicleBrand: dropdowns.VEHICLE_BRAND?.[0]?.value || 'BYD',
      cable16mmMeter: 0,
      cable16mmUnitCost: activeRates.cable16mm || 420,
      cable10mmMeter: 0,
      cable10mmUnitCost: activeRates.cable10mm || 250,
      cable6mmMeter: 0,
      cable6mmUnitCost: activeRates.cable6mm || 180,
      breakerBoxQty: 0,
      breakerBoxUnitCost: activeRates.breakerBox || 4500,
      earthingRodQty: 0,
      earthingRodUnitCost: activeRates.earthingRod || 3500,
      wpbQty: 0,
      wpbUnitCost: activeRates.wpb || 1500,
      ninUvrQty: 0,
      ninUvrUnitCost: activeRates.ninUvr || 3800,
      rcboBreakerQty: 0,
      rcboBreakerUnitCost: activeRates.rcboBreaker || 3200,
      additionalSupplyName: '',
      additionalSupplyCost: 0,
      miscExp: 0,
      billAmount: 0,
      payStatus: 'Trade Receivable',
      paymentStatus: 'Trade Receivable',
      isVoucher: false,
      voucherGrossAmount: 65000,
      voucherDeduction: 13850,
      voucherNetClaim: 51150,
      voucherSettled: false,
      customerExcessPaid: 0,
      customerExcessReceivable: 0,
      paymentMethod: 'Bank Transfer',
      notes: '',
    })
    setExcessMode('Paid')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isViewer) {
      toast.error('Read-Only Access', 'Viewer accounts cannot create or modify installation jobs.')
      return
    }
    if (!formData.clientName.trim()) {
      toast.error('Validation Error', 'Client name is required.')
      return
    }

    if (!formData.vehicleBrand) {
      toast.error('Validation Error', 'Vehicle Brand is required.')
      return
    }

    try {
      setSubmitting(true)
      const url = editingJobId ? `/api/jobs/${editingJobId}` : '/api/jobs'
      const method = editingJobId ? 'PUT' : 'POST'

      const isVoucherMode = formData.isVoucher || formData.paymentStatus === 'Voucher'
      const excess = Math.max(0, formData.billAmount - (formData.voucherGrossAmount || 65000))

      const payload = {
        ...formData,
        isVoucher: isVoucherMode,
        paymentStatus: isVoucherMode ? 'Voucher' : formData.paymentStatus,
        payStatus: isVoucherMode ? 'Voucher' : formData.paymentStatus,
        customerExcessPaid: isVoucherMode && excess > 0 && excessMode === 'Paid' ? excess : 0,
        customerExcessReceivable: isVoucherMode && excess > 0 && excessMode === 'Receivable' ? excess : 0,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(
          editingJobId ? 'Job Updated' : 'Job Created Successfully',
          `Sn #${data.data.sn} saved and warehouse inventory deducted.`
        )
        triggerRefresh()
        handleClose()
      } else {
        toast.error('Save Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen || isViewer) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-2xl overflow-hidden transition-all">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingJobId ? 'Edit Installation Job' : 'New Installation Job'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {editingJobId ? 'Update details while retaining locked unit rates' : 'Locks in active unit rates and auto-increments monthly Sn.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LOCKED UNIT RATES BANNER */}
        <div className="px-5 py-2.5 bg-emerald-500/10 dark:bg-emerald-950/30 border-b border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-medium flex-wrap">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>
              <b>Locked Master Rates:</b> 16mm @ {formatCurrency(formData.cable16mmUnitCost)}/m | 10mm @ {formatCurrency(formData.cable10mmUnitCost)}/m | 6mm @ {formatCurrency(formData.cable6mmUnitCost)}/m | DB Box @ {formatCurrency(formData.breakerBoxUnitCost)}/u | RCBO @ {formatCurrency(formData.rcboBreakerUnitCost)}/u | WPB @ {formatCurrency(formData.wpbUnitCost)}/u | UVR @ {formatCurrency(formData.ninUvrUnitCost)}/u | Earth Rod @ {formatCurrency(formData.earthingRodUnitCost)}/u
            </span>
          </div>
          <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 shrink-0">
            Version locked to job date
          </span>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* SECTION 1: CLIENT & LOGISTICS */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              1. Client & Site Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Installation Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Branch Location *
                </label>
                <select
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value as 'Karachi' | 'Lahore' })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  <option value="Karachi">Karachi Branch</option>
                  <option value="Lahore">Lahore Branch</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Client / Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Salman Qureshi / Honda Showroom"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  placeholder="+92 300 1234567"
                  value={formData.contactNo}
                  onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Site Address / Location Area
                </label>
                <input
                  type="text"
                  placeholder="e.g. Phase 6, DHA Lahore"
                  value={formData.addressArea}
                  onChange={(e) => setFormData({ ...formData, addressArea: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                  Vehicle Brand *
                </label>
                <select
                  required
                  value={formData.vehicleBrand}
                  onChange={(e) => {
                    const brand = e.target.value
                    const isByd = brand === 'BYD'
                    setFormData((prev) => ({
                      ...prev,
                      vehicleBrand: brand,
                      isVoucher: isByd ? prev.isVoucher : false,
                      paymentStatus: isByd && prev.isVoucher ? 'Voucher' : prev.paymentStatus === 'Voucher' ? 'Trade Receivable' : prev.paymentStatus,
                      payStatus: isByd && prev.isVoucher ? 'Voucher' : prev.payStatus === 'Voucher' ? 'Trade Receivable' : prev.payStatus,
                    }))
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-emerald-500/50 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-bold"
                >
                  {/* Historical brand preservation */}
                  {formData.vehicleBrand &&
                    dropdowns.VEHICLE_BRAND &&
                    !dropdowns.VEHICLE_BRAND.some((d: any) => d.value.toLowerCase() === formData.vehicleBrand.toLowerCase()) && (
                      <option key="historical-brand" value={formData.vehicleBrand}>
                        {formData.vehicleBrand} (Historical / Preserved)
                      </option>
                  )}
                  {dropdowns.VEHICLE_BRAND && dropdowns.VEHICLE_BRAND.length > 0 ? (
                    dropdowns.VEHICLE_BRAND.map((d: any) => (
                      <option key={d.id} value={d.value}>{d.value}</option>
                    ))
                  ) : (
                    <>
                      <option value="BYD">BYD</option>
                      <option value="MG">MG</option>
                      <option value="Deepal">Deepal</option>
                      <option value="Audi">Audi</option>
                      <option value="Porsche">Porsche</option>
                      <option value="Hyundai">Hyundai</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Lead Source
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  {dropdowns.SOURCE?.map((d: any) => (
                    <option key={d.id} value={d.value}>{d.value}</option>
                  )) || (
                    <>
                      <option value="Direct">Direct</option>
                      <option value="MJD/MTP">MJD/MTP</option>
                      <option value="Sarah South">Sarah South</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Technician Team
                </label>
                <select
                  value={formData.technicianName}
                  onChange={(e) => setFormData({ ...formData, technicianName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  {dropdowns.TECHNICIAN?.map((d: any) => (
                    <option key={d.id} value={d.value}>{d.value}</option>
                  )) || (
                    <>
                      <option value="Team Alpha (Lead: Ali)">Team Alpha (Lead: Ali)</option>
                      <option value="Team Beta (Lead: Imran)">Team Beta (Lead: Imran)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: MATERIALS USAGE (AUTO INVENTORY DEDUCTION) */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                2. Material Usage & Hardware (Auto-Deducted from Inventory)
              </h4>
              <span className="text-[11px] text-emerald-500 font-medium">Real-Time Cost Preview</span>
            </div>

            {/* Top Row: 16mm, 10mm, 6mm Cables & Main DB Box (4 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 16mm Cable */}
              <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20">
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="font-semibold text-indigo-900 dark:text-indigo-300">16mm Cable (Meters)</span>
                  <span className="text-slate-400">@{formatCurrency(formData.cable16mmUnitCost)}/m</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.cable16mmMeter}
                  onChange={(e) => setFormData({ ...formData, cable16mmMeter: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
                />
                <div className="text-[11px] text-right font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  = {formatCurrency(liveCalc.cable16mmTotalCost)}
                </div>
              </div>

              {/* 10mm Cable */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>10mm Cable (Meters)</span>
                  <span className="text-slate-400">@{formatCurrency(formData.cable10mmUnitCost)}/m</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.cable10mmMeter}
                  onChange={(e) => setFormData({ ...formData, cable10mmMeter: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
                />
                <div className="text-[11px] text-right font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  = {formatCurrency(liveCalc.cable10mmTotalCost)}
                </div>
              </div>

              {/* 6mm Cable */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>6mm Cable (Meters)</span>
                  <span className="text-slate-400">@{formatCurrency(formData.cable6mmUnitCost)}/m</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.cable6mmMeter}
                  onChange={(e) => setFormData({ ...formData, cable6mmMeter: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
                />
                <div className="text-[11px] text-right font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  = {formatCurrency(liveCalc.cable6mmTotalCost)}
                </div>
              </div>

              {/* Breaker Box */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>DB Breaker Box (Qty)</span>
                  <span className="text-slate-400">@{formatCurrency(formData.breakerBoxUnitCost)}/u</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.breakerBoxQty}
                  onChange={(e) => setFormData({ ...formData, breakerBoxQty: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
                />
                <div className="text-[11px] text-right font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  = {formatCurrency(liveCalc.breakerBoxTotalCost)}
                </div>
              </div>
            </div>

            {/* Bottom Row: Hardware & Safety Protection (4 Card Containers matching Top Row) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {/* Slot 5: RCBO Breaker */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>RCBO Breaker (Qty)</span>
                  <span className="text-slate-400">@{formatCurrency(formData.rcboBreakerUnitCost)}/u</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.rcboBreakerQty}
                  onChange={(e) => setFormData({ ...formData, rcboBreakerQty: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
                />
                <div className="text-[11px] text-right font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  = {formatCurrency(liveCalc.rcboBreakerTotalCost)}
                </div>
              </div>

              {/* Slot 6: WPB Box */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>WPB Box (Qty)</span>
                  <span className="text-slate-400">@{formatCurrency(formData.wpbUnitCost)}/u</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.wpbQty}
                  onChange={(e) => setFormData({ ...formData, wpbQty: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
                />
                <div className="text-[11px] text-right font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  = {formatCurrency(liveCalc.wpbTotalCost)}
                </div>
              </div>

              {/* Slot 7: NIN UVR */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>NIN UVR (Qty)</span>
                  <span className="text-slate-400">@{formatCurrency(formData.ninUvrUnitCost)}/u</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.ninUvrQty}
                  onChange={(e) => setFormData({ ...formData, ninUvrQty: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
                />
                <div className="text-[11px] text-right font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  = {formatCurrency(liveCalc.ninUvrTotalCost)}
                </div>
              </div>

              {/* Slot 8: Earthing Rod */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>Earthing Rod (Qty)</span>
                  <span className="text-slate-400">@{formatCurrency(formData.earthingRodUnitCost)}/u</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.earthingRodQty}
                  onChange={(e) => setFormData({ ...formData, earthingRodQty: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
                />
                <div className="text-[11px] text-right font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  = {formatCurrency(liveCalc.earthingRodTotalCost)}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: ADDITIONAL SUPPLIES & SITE EXPENSES */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              3. Additional Hardware Supplies & Misc Site Expenses
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Additional Supply Name / Spec
                </label>
                <input
                  type="text"
                  placeholder="e.g. 25mm GI Conduit, Clamps"
                  value={formData.additionalSupplyName}
                  onChange={(e) => setFormData({ ...formData, additionalSupplyName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Additional Supply Cost
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.additionalSupplyCost}
                  onChange={(e) => setFormData({ ...formData, additionalSupplyCost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Misc Expenses (Fuel, Site)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.miscExp}
                  onChange={(e) => setFormData({ ...formData, miscExp: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: BILL AMOUNT OVERRIDE & DYNAMIC GROSS PROFIT */}
          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4" />
                4. Billing & Financial Margin Computation
              </h4>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                Formula: Bill Amount - Total Cost
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              {/* Calculated Total Cost */}
              <div>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">Computed Total Job Cost</span>
                <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(liveCalc.totalJobCost)}
                </span>
              </div>

              {/* Manual Bill Amount Input (Rule 4) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Manual Bill Amount *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    placeholder="Enter billed total"
                    value={formData.billAmount}
                    onChange={(e) => setFormData({ ...formData, billAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-emerald-500/50 rounded-xl text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              {/* Dynamic Gross Profit */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20 text-right">
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">Dynamic Gross Profit</span>
                <span className={`text-lg font-black ${liveCalc.grossProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatCurrency(liveCalc.grossProfit)}
                </span>
                <span className="block text-[10px] text-slate-400 font-medium">
                  {liveCalc.grossProfitMargin}% profit margin
                </span>
              </div>
            </div>

            {/* Payment Status & Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-500/20">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Status / Mode
                </label>
                <select
                  value={formData.isVoucher || formData.paymentStatus === 'Voucher' || formData.payStatus === 'Voucher' ? 'Voucher' : formData.paymentStatus}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === 'Voucher') {
                      setFormData({
                        ...formData,
                        isVoucher: true,
                        paymentStatus: 'Voucher',
                        payStatus: 'Voucher',
                        voucherGrossAmount: formData.voucherGrossAmount || 65000,
                        voucherDeduction: formData.voucherDeduction || 13850,
                        voucherNetClaim: formData.voucherNetClaim || 51150,
                      })
                    } else {
                      setFormData({
                        ...formData,
                        isVoucher: false,
                        paymentStatus: val,
                        payStatus: val,
                        customerExcessPaid: 0,
                        customerExcessReceivable: 0,
                      })
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="Trade Receivable">Trade Receivable (Pending Payment)</option>
                  <option value="Paid">Paid (Payment Received)</option>
                  <option value="Voucher">BYD Voucher (Corporate Claim)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                >
                  {dropdowns.PAYMENT_METHOD?.map((d: any) => (
                    <option key={d.id} value={d.value}>{d.value}</option>
                  )) || (
                    <>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* BYD VOUCHER CONFIGURATION PANEL */}
            {(formData.isVoucher || formData.paymentStatus === 'Voucher') && (
              <div className="p-3.5 rounded-xl border border-sky-400/30 bg-sky-50/50 dark:bg-sky-950/20 space-y-3 mt-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-bold text-xs uppercase tracking-wide">
                    <Zap className="w-3.5 h-3.5 text-sky-500" />
                    BYD Corporate Voucher Setup
                  </div>
                  <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
                    Covers bill up to Rs. 65,000
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Voucher Face Value (Gross)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={formData.voucherGrossAmount}
                      onChange={(e) => {
                        const gross = parseFloat(e.target.value) || 0
                        const net = Math.max(0, gross - (formData.voucherDeduction || 0))
                        setFormData({
                          ...formData,
                          voucherGrossAmount: gross,
                          voucherNetClaim: net,
                        })
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      BYD Deduction (WHT / Commission)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={formData.voucherDeduction}
                      onChange={(e) => {
                        const ded = parseFloat(e.target.value) || 0
                        const net = Math.max(0, (formData.voucherGrossAmount || 0) - ded)
                        setFormData({
                          ...formData,
                          voucherDeduction: ded,
                          voucherNetClaim: net,
                        })
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-rose-600 dark:text-rose-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Net Claim from BYD
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={formData.voucherNetClaim}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          voucherNetClaim: parseFloat(e.target.value) || 0,
                        })
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-emerald-500/50 rounded-lg text-emerald-600 dark:text-emerald-400 font-bold"
                    />
                  </div>
                </div>

                {/* Excess Handling if Bill Amount > Voucher Face Value */}
                {voucherExcess > 0 ? (
                  <div className="p-3 rounded-lg border border-amber-300/40 bg-amber-50/60 dark:bg-amber-950/30 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Customer Excess Amount: {formatCurrency(voucherExcess)}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      The total bill ({formatCurrency(formData.billAmount)}) exceeds the voucher face value ({formatCurrency(formData.voucherGrossAmount)}). Please specify how this excess amount is settled:
                    </p>
                    <div className="flex flex-wrap items-center gap-4 pt-1">
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-800 dark:text-slate-200">
                        <input
                          type="radio"
                          name="excessHandling"
                          value="Paid"
                          checked={excessMode === 'Paid'}
                          onChange={() => setExcessMode('Paid')}
                          className="accent-emerald-600"
                        />
                        <span>Customer Paid Excess (via Cash / Bank)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-800 dark:text-slate-200">
                        <input
                          type="radio"
                          name="excessHandling"
                          value="Receivable"
                          checked={excessMode === 'Receivable'}
                          onChange={() => setExcessMode('Receivable')}
                          className="accent-amber-600"
                        />
                        <span>Keep in Trade Receivables (Unpaid Customer Balance)</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Entire bill is fully covered within the voucher face value. No customer excess required.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 5: NOTES */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Installation Job Notes / Vehicle Specs
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Tesla Model Y 11kW Wallbox, installed next to main electrical DB."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
            ></textarea>
          </div>

          {/* MODAL FOOTER */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Saving & Deducting Stock...' : editingJobId ? 'Update Installation Job' : 'Save & Lock In Rates'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
