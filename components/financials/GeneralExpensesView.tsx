'use client'

import React, { useState, useEffect } from 'react'
import { useApp } from '@/components/common/AppContext'
import { useBranch } from '@/app/context/BranchContext'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/components/auth/AuthContext'
import {
  Receipt,
  Plus,
  Trash2,
  Edit2,
  Wallet,
  Building2,
  DollarSign,
  Filter,
  X,
  CheckCircle2,
  AlertCircle,
  Tag,
  Calendar,
  Layers,
  FileText,
  MapPin,
} from 'lucide-react'
import { formatDateDisplay, formatMonthLabel, getTodayDateString } from '@/lib/dateUtils'

export function GeneralExpensesView() {
  const { selectedMonth, isArchived, formatCurrency, refreshKey, triggerRefresh } = useApp()
  const { selectedBranch } = useBranch()
  const { isViewer } = useAuth()
  const toast = useToast()

  const [expenses, setExpenses] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({
    totalAmount: 0,
    cashAmount: 0,
    bankAmount: 0,
    count: 0,
    categoryBreakdown: [],
  })
  const [loading, setLoading] = useState(true)
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createForm, setCreateForm] = useState({
    branch: selectedBranch !== 'All' ? selectedBranch : 'Karachi',
    date: getTodayDateString(),
    category: '',
    amount: '',
    paymentMethod: 'Cash',
    notes: '',
  })

  // Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editForm, setEditForm] = useState({
    id: '',
    branch: 'Karachi',
    date: getTodayDateString(),
    category: '',
    amount: 0,
    paymentMethod: 'Cash',
    notes: '',
  })

  const commonCategories = [
    'Office Rent',
    'Stationery & Printing',
    'Generator Fuel',
    'Electricity & Utilities',
    'Tea & Refreshments',
    'Office Maintenance',
    'Internet & Comms',
    'Legal & Professional Fees',
    'Marketing & Ads',
    'Tooling & Consumables',
  ]

  const fetchExpenses = () => {
    setLoading(true)
    let url = `/api/expenses?month=${selectedMonth}`
    if (selectedBranch !== 'All') url += `&branch=${encodeURIComponent(selectedBranch)}`
    if (paymentFilter !== 'ALL') url += `&paymentMethod=${encodeURIComponent(paymentFilter)}`
    if (categoryFilter !== 'ALL') url += `&category=${encodeURIComponent(categoryFilter)}`

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setExpenses(data.expenses || [])
          setSummary(data.summary || {})
        }
      })
      .catch((err) => console.error('Failed to load expenses:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchExpenses()
  }, [selectedMonth, paymentFilter, categoryFilter, selectedBranch, refreshKey])

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.category.trim()) {
      toast.error('Validation Error', 'Expense category / title is required.')
      return
    }

    const numAmount = parseFloat(createForm.amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Validation Error', 'Please enter a valid amount greater than 0.')
      return
    }

    try {
      setCreateSubmitting(true)
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(
          'General Expense Logged',
          `${formatCurrency(numAmount)} deducted from Available ${createForm.paymentMethod === 'Cash' ? 'Cash' : 'Bank'} balance.`
        )
        setIsCreateModalOpen(false)
        triggerRefresh()
        setCreateForm({
          branch: selectedBranch !== 'All' ? selectedBranch : 'Karachi',
          date: getTodayDateString(),
          category: '',
          amount: '',
          paymentMethod: 'Cash',
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

  const openEditModal = (exp: any) => {
    setEditForm({
      id: exp.id,
      branch: exp.branch || 'Karachi',
      date: exp.date,
      category: exp.category,
      amount: exp.amount,
      paymentMethod: exp.paymentMethod,
      notes: exp.notes || '',
    })
    setIsEditModalOpen(true)
  }

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm.category.trim()) {
      toast.error('Validation Error', 'Expense category is required.')
      return
    }

    try {
      setEditSubmitting(true)
      const res = await fetch(`/api/expenses/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Expense Updated', 'General operational expense updated successfully.')
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

  const handleDeleteExpense = async (id: string) => {
    if (isArchived) {
      toast.error('Archived Record', 'Historical records are read-only.')
      return
    }

    if (!confirm('Are you sure you want to delete this operational expense?')) return

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Expense Deleted', 'Operational expense entry removed.')
        triggerRefresh()
      } else {
        toast.error('Delete Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
            <span>General Operational Expenses (OpEx)</span>
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
            Log and manage business overheads (Office Rent, Utilities, Generator Fuel, Stationery, Refreshments). Deducts directly from Cash/Bank treasury without impacting warehouse stock.
          </p>
        </div>

        {!isArchived && !isViewer && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add General Expense</span>
          </button>
        )}
      </div>

      {/* 4 SUMMARY STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total OpEx Spend
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
            {formatCurrency(summary.totalAmount)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {summary.count} Entries {selectedBranch === 'All' ? '(Consolidated)' : `(${selectedBranch})`}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" /> Cash OpEx Outflow
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {formatCurrency(summary.cashAmount)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Deducted from Available Cash</div>
        </div>

        <div className="p-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 dark:bg-cyan-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Bank OpEx Outflow
            </span>
          </div>
          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1 font-mono">
            {formatCurrency(summary.bankAmount)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Deducted from Bank Balance</div>
        </div>

        <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Expense Categories
            </span>
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
            {summary.categoryBreakdown?.length || 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">Active Cost Heads Tracked</div>
        </div>
      </div>

      {/* CATEGORY BREAKDOWN TAGS */}
      {summary.categoryBreakdown && summary.categoryBreakdown.length > 0 && (
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm space-y-2">
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Overhead Cost Head Breakdown
          </h4>
          <div className="flex flex-wrap gap-2 pt-1">
            {summary.categoryBreakdown.map((cat: any) => (
              <button
                key={cat.category}
                onClick={() => setCategoryFilter(categoryFilter === cat.category ? 'ALL' : cat.category)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  categoryFilter === cat.category
                    ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500/40'
                }`}
              >
                <span>{cat.category}</span>
                <span className={`font-bold font-mono ${categoryFilter === cat.category ? 'text-slate-950' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatCurrency(cat.amount)}
                </span>
                <span className="text-[10px] opacity-70">({cat.percentage}%)</span>
              </button>
            ))}
            {categoryFilter !== 'ALL' && (
              <button
                onClick={() => setCategoryFilter('ALL')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* FILTER & REGISTER TABLE */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span>Operational Expense Register</span>
            <span className="text-[11px] font-normal text-slate-400">
              ({expenses.length} Records)
            </span>
          </h3>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer shadow-sm"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="Cash">Cash Payments</option>
              <option value="Bank">Bank Account Transfers</option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Category / Title</th>
                  <th className="py-3 px-3">Description / Notes</th>
                  <th className="py-3 px-3 text-center">Payment Method</th>
                  <th className="py-3 px-3 text-right font-bold">Amount</th>
                  {!isArchived && !isViewer && <th className="py-3 px-3 text-center w-28">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={!isArchived && !isViewer ? 6 : 5} className="py-12 text-center text-slate-400">
                      Loading operational expenses...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={!isArchived && !isViewer ? 6 : 5} className="py-12 text-center text-slate-400">
                      No operational expenses recorded for {formatMonthLabel(selectedMonth)}.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => {
                    const isCash = (exp.paymentMethod || '').toLowerCase().includes('cash')
                    return (
                      <tr key={exp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                          {formatDateDisplay(exp.date)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                            <Tag className="w-3 h-3 text-emerald-500" />
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {exp.notes || '—'}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isCash ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <Wallet className="w-2.5 h-2.5" />
                              Cash
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                              <Building2 className="w-2.5 h-2.5" />
                              Bank Transfer
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100 font-mono">
                          {formatCurrency(exp.amount)}
                        </td>
                        {!isArchived && !isViewer && (
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditModal(exp)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-colors"
                                title="Edit Expense"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"
                                title="Delete Expense"
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
      </div>

      {/* ADD GENERAL EXPENSE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-2xl p-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-500" />
                Add General Operational Expense (OpEx)
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.date}
                    onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (PKR) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    placeholder="e.g. 25000"
                    value={createForm.amount}
                    onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Expense Category / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office Rent, Generator Fuel, Stationery"
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />

                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {commonCategories.slice(0, 6).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, category: c })}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/15 hover:text-emerald-600 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Method *</label>
                <select
                  value={createForm.paymentMethod}
                  onChange={(e) => setCreateForm({ ...createForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="Cash">Cash in Hand</option>
                  <option value="Bank">Bank Account Transfer</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Paid to building owner via Cheque #9821"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              {/* Financial Impact Note */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                <div>
                  <span className="font-bold">Financial Impact:</span> Deducts immediately from Available{' '}
                  <span className="font-bold underline">{createForm.paymentMethod === 'Cash' ? 'Cash' : 'Bank'}</span> balance and logs under Operational Overheads on P&L. Does not affect warehouse inventory.
                </div>
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
                  {createSubmitting ? 'Recording...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT GENERAL EXPENSE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-2xl p-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-500" />
                Edit Operational Expense
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateExpense} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (PKR) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Expense Category / Title *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Method *</label>
                <select
                  value={editForm.paymentMethod}
                  onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="Cash">Cash in Hand</option>
                  <option value="Bank">Bank Account Transfer</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Description / Notes</label>
                <input
                  type="text"
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
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-slate-950 shadow transition-all active:scale-95 disabled:opacity-50"
                >
                  {editSubmitting ? 'Updating...' : 'Update Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
