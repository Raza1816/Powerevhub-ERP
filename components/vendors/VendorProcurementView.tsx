'use client'

import React, { useState, useEffect } from 'react'
import { useApp } from '@/components/common/AppContext'
import { useBranch } from '@/app/context/BranchContext'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/components/auth/AuthContext'
import {
  ShoppingCart,
  Plus,
  Trash2,
  Edit2,
  CreditCard,
  DollarSign,
  Wallet,
  Building2,
  AlertCircle,
  Calendar,
  Layers,
  X,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  MapPin,
  Search,
} from 'lucide-react'
import { formatDateDisplay, formatMonthLabel, getTodayDateString } from '@/lib/dateUtils'
import { STANDARD_INVENTORY_ITEMS } from '@/lib/inventory'

export function VendorProcurementView() {
  const { selectedMonth, isArchived, formatCurrency, refreshKey, triggerRefresh } = useApp()
  const { selectedBranch } = useBranch()
  const { isViewer } = useAuth()
  const toast = useToast()

  const [purchases, setPurchases] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({
    totalAmount: 0,
    cashAmount: 0,
    bankAmount: 0,
    unpaidAmount: 0,
    count: 0,
  })
  const [loading, setLoading] = useState(true)
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [vendorSearch, setVendorSearch] = useState('')

  // Create Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createForm, setCreateForm] = useState({
    branch: selectedBranch !== 'All' ? selectedBranch : 'Karachi',
    date: getTodayDateString(),
    vendorName: '',
    invoiceNo: '',
    item: '10mm 4-Core Copper Cable',
    itemKey: 'cable_10mm',
    quantity: 100,
    unitRate: 215,
    totalAmount: 21500,
    paymentMethod: 'Bank',
    notes: '',
  })

  // Edit / Settlement Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [editForm, setEditForm] = useState({
    id: '',
    branch: 'Karachi',
    date: getTodayDateString(),
    vendorName: '',
    invoiceNo: '',
    item: '',
    itemKey: '',
    quantity: 0,
    unitRate: 0,
    totalAmount: 0,
    paymentMethod: 'Bank',
    settledDate: getTodayDateString(),
    notes: '',
    initialPaymentMethod: 'Bank',
  })

  const fetchPurchases = () => {
    setLoading(true)
    let url = `/api/vendors?month=${selectedMonth}`
    if (selectedBranch !== 'All') url += `&branch=${encodeURIComponent(selectedBranch)}`
    if (paymentFilter !== 'ALL') url += `&paymentMethod=${encodeURIComponent(paymentFilter)}`

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPurchases(data.purchases || [])
          setSummary(data.summary || {})
        }
      })
      .catch((err) => console.error('Failed to load purchases:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPurchases()
  }, [selectedMonth, paymentFilter, selectedBranch, refreshKey])

  // Recalculate create form total
  const handleCreateQtyRateChange = (qty: number, rate: number) => {
    const total = Math.round(qty * rate * 100) / 100
    setCreateForm((prev) => ({
      ...prev,
      quantity: qty,
      unitRate: rate,
      totalAmount: total,
    }))
  }

  const handleCreateItemSelect = (itemKey: string) => {
    const itemDef = STANDARD_INVENTORY_ITEMS.find((i) => i.key === itemKey)
    setCreateForm((prev) => ({
      ...prev,
      itemKey,
      item: itemDef ? itemDef.name : prev.item,
    }))
  }

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.vendorName.trim()) {
      toast.error('Validation Error', 'Vendor name is required.')
      return
    }

    try {
      setCreateSubmitting(true)
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })

      const data = await res.json()
      if (data.success) {
        const isCredit = createForm.paymentMethod.toLowerCase().includes('unpaid')
        toast.success(
          isCredit ? 'Credit Purchase Logged' : 'Procurement Logged',
          isCredit
            ? 'Vendor invoice recorded as Unpaid/Credit. Warehouse stock restocked.'
            : 'Vendor invoice saved and warehouse stock restocked.'
        )
        setIsCreateModalOpen(false)
        triggerRefresh()
        // Reset form
        setCreateForm({
          branch: selectedBranch !== 'All' ? selectedBranch : 'Karachi',
          date: getTodayDateString(),
          vendorName: '',
          invoiceNo: '',
          item: '10mm 4-Core Copper Cable',
          itemKey: 'cable_10mm',
          quantity: 100,
          unitRate: 215,
          totalAmount: 21500,
          paymentMethod: 'Bank',
          notes: '',
        })
      } else {
        toast.error('Save Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    } finally {
      setCreateSubmitting(false)
    }
  }

  const openCreateModal = () => {
    if (isViewer) {
      toast.error('Read-Only Access', 'Viewer accounts have read-only access.')
      return
    }
    setCreateForm({
      branch: selectedBranch !== 'All' ? selectedBranch : 'Karachi',
      date: getTodayDateString(),
      vendorName: '',
      invoiceNo: '',
      item: '10mm 4-Core Copper Cable',
      itemKey: 'cable_10mm',
      quantity: 100,
      unitRate: 215,
      totalAmount: 21500,
      paymentMethod: 'Bank',
      notes: '',
    })
    setIsCreateModalOpen(true)
  }

  // Open Edit / Settlement Modal
  const openEditModal = (record: any, settleDirectly: boolean = false) => {
    if (isViewer) {
      toast.error('Read-Only Access', 'Viewer accounts have read-only access.')
      return
    }
    setEditingRecord(record)
    setEditForm({
      id: record.id,
      branch: record.branch || (selectedBranch !== 'All' ? selectedBranch : 'Karachi'),
      date: record.date || getTodayDateString(),
      vendorName: record.vendorName || '',
      invoiceNo: record.invoiceNo || '',
      item: record.item || '',
      itemKey: record.itemKey || '',
      quantity: record.quantity || 0,
      unitRate: record.unitRate || 0,
      totalAmount: record.totalAmount || 0,
      paymentMethod: settleDirectly ? 'Bank' : (record.paymentMethod || 'Bank'),
      settledDate: record.settledDate || getTodayDateString(),
      notes: record.notes || '',
      initialPaymentMethod: record.paymentMethod || 'Bank',
    })
    setIsEditModalOpen(true)
  }

  // Recalculate edit form total
  const handleEditQtyRateChange = (qty: number, rate: number) => {
    const total = Math.round(qty * rate * 100) / 100
    setEditForm((prev) => ({
      ...prev,
      quantity: qty,
      unitRate: rate,
      totalAmount: total,
    }))
  }

  const handleEditItemSelect = (itemKey: string) => {
    const itemDef = STANDARD_INVENTORY_ITEMS.find((i) => i.key === itemKey)
    setEditForm((prev) => ({
      ...prev,
      itemKey,
      item: itemDef ? itemDef.name : prev.item,
    }))
  }

  const handleUpdatePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm.vendorName.trim()) {
      toast.error('Validation Error', 'Vendor name is required.')
      return
    }

    try {
      setEditSubmitting(true)
      const res = await fetch(`/api/vendors/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      const data = await res.json()
      if (data.success) {
        const wasUnpaid = (editForm.initialPaymentMethod || '').toLowerCase().includes('unpaid')
        const isNowPaid = !editForm.paymentMethod.toLowerCase().includes('unpaid')

        if (wasUnpaid && isNowPaid) {
          toast.success(
            'Payment Settled!',
            `Vendor invoice settled via ${editForm.paymentMethod}. Balance deducted from ledger.`
          )
        } else {
          toast.success('Purchase Updated', 'Vendor purchase record updated successfully.')
        }

        setIsEditModalOpen(false)
        triggerRefresh()
      } else {
        toast.error('Update Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (isArchived || isViewer) {
      toast.error('Read-Only Access', isViewer ? 'Viewer accounts have read-only access.' : 'Historical records are read-only.')
      return
    }

    if (!confirm('Are you sure you want to delete this purchase entry? Restock quantity will be rolled back from warehouse inventory.')) return

    try {
      const res = await fetch(`/api/vendors/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Purchase Deleted', 'Restock quantity rolled back and ledger updated.')
        triggerRefresh()
      } else {
        toast.error('Delete Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
            <span>Vendor Procurement & Purchases</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {formatMonthLabel(selectedMonth)}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
              selectedBranch === 'All'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                : selectedBranch === 'Karachi'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
            }`}>
              {selectedBranch === 'All' ? '🌐 All Branches (Consolidated)' : `📍 ${selectedBranch} Branch`}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log raw materials & component purchases, manage Accounts Payable, settle supplier invoices, and track Cash vs Bank outflows.
          </p>
        </div>

        {!isArchived && !isViewer && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Record Vendor Purchase / Restock</span>
          </button>
        )}
      </div>

      {/* 4 SUMMARY SPEND & PAYABLE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Spend */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Procurement Value
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
            {formatCurrency(summary.totalAmount)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {summary.count} Total Invoices in {formatMonthLabel(selectedMonth)} {selectedBranch === 'All' ? '(Consolidated)' : `(${selectedBranch})`}
          </div>
        </div>

        {/* 2. Cash Purchases Outflow */}
        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" /> Cash Procurement Outflow
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {formatCurrency(summary.cashAmount)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Direct Cash In Hand Outflow</div>
        </div>

        {/* 3. Bank Purchases Outflow */}
        <div className="p-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 dark:bg-cyan-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Bank Procurement Outflow
            </span>
          </div>
          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1 font-mono">
            {formatCurrency(summary.bankAmount)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Online / Cheque Bank Transfers</div>
        </div>

        {/* 4. Vendor Payables / Unpaid Purchases */}
        <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Vendor Payables / Unpaid
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono">
            {formatCurrency(summary.unpaidAmount)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Outstanding Supplier Credit Invoices</div>
        </div>
      </div>

      {/* FILTER & TABLE */}
      <div className="space-y-3">
        {(() => {
          const displayedPurchases = purchases.filter((p) => {
            if (!vendorSearch.trim()) return true
            return (p.vendorName || '').toLowerCase().includes(vendorSearch.trim().toLowerCase())
          })

          return (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span>Vendor Purchase Register</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    ({displayedPurchases.length} {displayedPurchases.length === 1 ? 'entry' : 'entries'}
                    {vendorSearch.trim() || paymentFilter !== 'ALL' ? ` filtered of ${purchases.length}` : ''})
                  </span>
                </h3>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Vendor Name Real-time Search Input */}
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by Vendor Name..."
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    {vendorSearch && (
                      <button
                        onClick={() => setVendorSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="Clear vendor search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Payment Filter */}
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <select
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                      className="text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer shadow-sm focus:outline-none"
                    >
                      <option value="ALL">All Payment Methods</option>
                      <option value="Cash">Cash Purchases</option>
                      <option value="Bank">Bank Purchases</option>
                      <option value="Unpaid">Unpaid / Credit Purchases</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Branch</th>
                        <th className="py-3 px-3">Vendor / Supplier</th>
                        <th className="py-3 px-3">Invoice #</th>
                        <th className="py-3 px-3">Item Purchased</th>
                        <th className="py-3 px-3 text-right">Quantity</th>
                        <th className="py-3 px-3 text-right">Unit Rate</th>
                        <th className="py-3 px-3 text-right font-bold">Total Amount</th>
                        <th className="py-3 px-3 text-center">Payment Status</th>
                        {!isArchived && !isViewer && <th className="py-3 px-3 text-center w-36">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {loading ? (
                        <tr>
                          <td colSpan={!isArchived && !isViewer ? 10 : 9} className="py-12 text-center text-slate-400">
                            Loading vendor purchases...
                          </td>
                        </tr>
                      ) : displayedPurchases.length === 0 ? (
                        <tr>
                          <td colSpan={!isArchived && !isViewer ? 10 : 9} className="py-12 text-center text-slate-400">
                            {vendorSearch.trim()
                              ? `No vendor purchases matching vendor "${vendorSearch.trim()}" found.`
                              : `No vendor purchases found for ${formatMonthLabel(selectedMonth)}${selectedBranch !== 'All' ? ` in ${selectedBranch} branch` : ''}${paymentFilter !== 'ALL' ? ` with payment filter: ${paymentFilter}` : ''}.`}
                          </td>
                        </tr>
                      ) : (
                        displayedPurchases.map((p) => {
                          const isUnpaid = (p.paymentMethod || '').toLowerCase().includes('unpaid') || (p.paymentMethod || '').toLowerCase().includes('credit')
                          const isCash = (p.paymentMethod || '').toLowerCase().includes('cash')

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                          {formatDateDisplay(p.date)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            p.branch === 'Lahore'
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}>
                            <MapPin className="w-2.5 h-2.5" />
                            {p.branch || 'Karachi'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {p.vendorName}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono">
                          {p.invoiceNo || 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-slate-800 dark:text-slate-200">
                          {p.item}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {p.quantity}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatCurrency(p.unitRate)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100 font-mono">
                          {formatCurrency(p.totalAmount)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isUnpaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Clock className="w-2.5 h-2.5" />
                              Unpaid (Credit)
                            </span>
                          ) : isCash ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <Wallet className="w-2.5 h-2.5" />
                              Paid via Cash
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                              <Building2 className="w-2.5 h-2.5" />
                              Paid via Bank
                            </span>
                          )}
                        </td>
                        {!isArchived && !isViewer && (
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Prominent Settle Button for Unpaid */}
                              {isUnpaid ? (
                                <button
                                  onClick={() => openEditModal(p, true)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm transition-all active:scale-95"
                                  title="Settle Outstanding Vendor Invoice"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Settle Pay</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => openEditModal(p, false)}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-colors"
                                  title="Edit Purchase Record"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Edit Button for Unpaid rows if settle is primary */}
                              {isUnpaid && (
                                <button
                                  onClick={() => openEditModal(p, false)}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-cyan-500 transition-colors"
                                  title="Edit Purchase Details"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete button */}
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"
                                title="Delete Purchase"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    )
  })()}
</div>

      {/* RECORD VENDOR PURCHASE / RESTOCK MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-2xl p-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-500" />
                Record Vendor Purchase / Restock
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-3.5 text-xs">
              {/* Branch / Location */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Branch / Location</span>
                  <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={createForm.branch}
                  onChange={(e) => setCreateForm({ ...createForm, branch: e.target.value as 'Karachi' | 'Lahore' })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="Karachi">Karachi</option>
                  <option value="Lahore">Lahore</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Operational branch for this purchase order / vendor bill.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.date}
                    onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Invoice / Ref #</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-8921"
                    value={createForm.invoiceNo}
                    onChange={(e) => setCreateForm({ ...createForm, invoiceNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Vendor / Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pakistan Cables Ltd / Schneider Electric"
                  value={createForm.vendorName}
                  onChange={(e) => setCreateForm({ ...createForm, vendorName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Target Inventory Item</label>
                  <select
                    value={createForm.itemKey}
                    onChange={(e) => handleCreateItemSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  >
                    {STANDARD_INVENTORY_ITEMS.map((i) => (
                      <option key={i.key} value={i.key}>{i.name} ({i.unit})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Item Title / Spec</label>
                  <input
                    type="text"
                    value={createForm.item}
                    onChange={(e) => setCreateForm({ ...createForm, item: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={createForm.quantity}
                    onChange={(e) => handleCreateQtyRateChange(parseFloat(e.target.value) || 0, createForm.unitRate)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Unit Rate (Rs.)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={createForm.unitRate}
                    onChange={(e) => handleCreateQtyRateChange(createForm.quantity, parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Total Amount</label>
                  <input
                    type="number"
                    required
                    value={createForm.totalAmount}
                    onChange={(e) => setCreateForm({ ...createForm, totalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Method *</label>
                <select
                  value={createForm.paymentMethod}
                  onChange={(e) => setCreateForm({ ...createForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="Unpaid">Unpaid / Credit (Pay Later)</option>
                  <option value="Bank">Bank Account Transfer</option>
                  <option value="Cash">Cash in Hand</option>
                </select>
              </div>

              {/* Dynamic Information Banner for Payment Method */}
              {createForm.paymentMethod === 'Unpaid' ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <span className="font-bold">Credit Purchase:</span> Hardware will be added to warehouse stock immediately. Cash & Bank balances will <span className="underline font-bold">NOT</span> be deducted until this invoice is settled.
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  <div>
                    <span className="font-bold">Immediate Settlement:</span> {formatCurrency(createForm.totalAmount)} will be deducted from your Available {createForm.paymentMethod === 'Cash' ? 'Cash' : 'Bank'} balance.
                  </div>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Purchase Notes</label>
                <input
                  type="text"
                  placeholder="Optional delivery or invoice notes..."
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-slate-950 shadow transition-all active:scale-95 disabled:opacity-50"
                >
                  {createSubmitting ? 'Recording...' : 'Save & Restock Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / PAYMENT SETTLEMENT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-2xl p-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                <span>
                  {(editForm.initialPaymentMethod || '').toLowerCase().includes('unpaid') &&
                  !editForm.paymentMethod.toLowerCase().includes('unpaid')
                    ? 'Settle Vendor Invoice & Update'
                    : 'Edit Vendor Purchase / Invoice'}
                </span>
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePurchase} className="space-y-3.5 text-xs">
              {/* Branch / Location */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Branch / Location</span>
                  <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={editForm.branch}
                  onChange={(e) => setEditForm({ ...editForm, branch: e.target.value as 'Karachi' | 'Lahore' })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="Karachi">Karachi</option>
                  <option value="Lahore">Lahore</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Invoice / Ref #</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-8921"
                    value={editForm.invoiceNo}
                    onChange={(e) => setEditForm({ ...editForm, invoiceNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Vendor / Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pakistan Cables Ltd"
                  value={editForm.vendorName}
                  onChange={(e) => setEditForm({ ...editForm, vendorName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Target Inventory Item</label>
                  <select
                    value={editForm.itemKey}
                    onChange={(e) => handleEditItemSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  >
                    {STANDARD_INVENTORY_ITEMS.map((i) => (
                      <option key={i.key} value={i.key}>{i.name} ({i.unit})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Item Title / Spec</label>
                  <input
                    type="text"
                    value={editForm.item}
                    onChange={(e) => setEditForm({ ...editForm, item: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={editForm.quantity}
                    onChange={(e) => handleEditQtyRateChange(parseFloat(e.target.value) || 0, editForm.unitRate)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Unit Rate (Rs.)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={editForm.unitRate}
                    onChange={(e) => handleEditQtyRateChange(editForm.quantity, parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Total Amount</label>
                  <input
                    type="number"
                    required
                    value={editForm.totalAmount}
                    onChange={(e) => setEditForm({ ...editForm, totalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={editForm.paymentMethod}
                    onChange={(e) => {
                      const newMethod = e.target.value
                      setEditForm((prev) => ({
                        ...prev,
                        paymentMethod: newMethod,
                        settledDate: newMethod === 'Unpaid' ? '' : (prev.settledDate || getTodayDateString()),
                      }))
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="Unpaid">Unpaid / Credit (Outstanding)</option>
                    <option value="Bank">Bank Account Transfer</option>
                    <option value="Cash">Cash in Hand</option>
                  </select>
                </div>

                {editForm.paymentMethod !== 'Unpaid' && (
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Settlement Date *</label>
                    <input
                      type="date"
                      required
                      value={editForm.settledDate || editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, settledDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
                    />
                  </div>
                )}
              </div>

              {/* Dynamic Reconciliation Guidance Banner */}
              {editForm.initialPaymentMethod?.toLowerCase().includes('unpaid') &&
              !editForm.paymentMethod.toLowerCase().includes('unpaid') ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  <div>
                    <span className="font-bold">Settling Credit Invoice:</span> Saving will deduct {formatCurrency(editForm.totalAmount)} from your Available {editForm.paymentMethod === 'Cash' ? 'Cash' : 'Bank'} balance and decrease Vendor Payables by {formatCurrency(editForm.totalAmount)}. Warehouse inventory stock will remain preserved.
                  </div>
                </div>
              ) : editForm.paymentMethod === 'Unpaid' && !editForm.initialPaymentMethod?.toLowerCase().includes('unpaid') ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <span className="font-bold">Reverting to Credit:</span> Saving will refund {formatCurrency(editForm.totalAmount)} back to Available {editForm.initialPaymentMethod} balance and re-open this as an unpaid payable.
                  </div>
                </div>
              ) : null}

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Purchase Notes</label>
                <input
                  type="text"
                  placeholder="Optional delivery or invoice notes..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-slate-950 shadow transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {editSubmitting ? (
                    'Saving...'
                  ) : (editForm.initialPaymentMethod || '').toLowerCase().includes('unpaid') &&
                    !editForm.paymentMethod.toLowerCase().includes('unpaid') ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Settle & Update Invoice</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
