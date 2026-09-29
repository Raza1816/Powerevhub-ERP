'use client'

import React, { useState, useEffect } from 'react'
import { useApp } from '@/components/common/AppContext'
import { useBranch } from '@/app/context/BranchContext'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/components/auth/AuthContext'
import {
  Database,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Calendar,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  RefreshCw,
  X,
  MapPin,
} from 'lucide-react'
import { formatDateDisplay, formatMonthLabel, getTodayDateString } from '@/lib/dateUtils'

export function InventoryLedgerView() {
  const { selectedMonth, isArchived, refreshKey, triggerRefresh } = useApp()
  const { selectedBranch } = useBranch()
  const { isViewer } = useAuth()
  const toast = useToast()

  const [inventoryData, setInventoryData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [itemFilter, setItemFilter] = useState('ALL')

  // Stock Adjustment Modal state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [adjustDate, setAdjustDate] = useState(getTodayDateString())
  const [adjustItemKey, setAdjustItemKey] = useState('cable_10mm')
  const [adjustOpeningStock, setAdjustOpeningStock] = useState<number>(100)
  const [adjustNotes, setAdjustNotes] = useState('')
  const [adjustBranch, setAdjustBranch] = useState<'Karachi' | 'Lahore'>(
    selectedBranch === 'Lahore' ? 'Lahore' : 'Karachi'
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSyncLedger = async () => {
    try {
      setIsSyncing(true)
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', branch: selectedBranch }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Inventory Synchronized', 'Warehouse inventory ledger synchronized with purchases and jobs.')
        fetchInventory()
      } else {
        toast.error('Sync Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    } finally {
      setIsSyncing(false)
    }
  }

  const fetchInventory = () => {
    setLoading(true)
    let url = `/api/inventory?month=${selectedMonth}&branch=${encodeURIComponent(selectedBranch)}`
    if (itemFilter !== 'ALL') url += `&itemKey=${encodeURIComponent(itemFilter)}`

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setInventoryData(json)
        }
      })
      .catch((err) => console.error('Failed to load inventory:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchInventory()
  }, [selectedMonth, itemFilter, selectedBranch, refreshKey])

  const handleOpenAdjustModal = (item?: any, date?: string) => {
    if (isArchived || isViewer) {
      toast.error('Read-Only Access', isViewer ? 'Viewer accounts have read-only access.' : 'Stock records in archived months are read-only.')
      return
    }
    if (item) setAdjustItemKey(item.itemKey || item.key)
    if (date) setAdjustDate(date)
    setAdjustOpeningStock(item?.openingStock || 100)
    // Pre-select the globally active branch; fall back to Karachi for 'All'
    setAdjustBranch(selectedBranch === 'Lahore' ? 'Lahore' : 'Karachi')
    setIsAdjustModalOpen(true)
  }

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: adjustDate,
          itemKey: adjustItemKey,
          openingStock: Number(adjustOpeningStock),
          branch: adjustBranch,
          transactionType: 'OPENING_STOCK',
          notes: adjustNotes || `Opening stock set for ${adjustBranch} warehouse`,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(
          'Stock Balance Updated',
          `${adjustBranch} warehouse opening stock recalculated with CRM deductions.`
        )
        setIsAdjustModalOpen(false)
        triggerRefresh()
      } else {
        toast.error('Update Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentStock = inventoryData?.currentStock || []
  const ledger = inventoryData?.ledger || []
  const items = inventoryData?.items || []

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
            <span>
              {selectedBranch === 'All'
                ? 'Central Warehouse Inventory Ledger'
                : `${selectedBranch} Warehouse Inventory Ledger`}
            </span>
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
              {selectedBranch === 'All' ? '🌐 Consolidated (All Warehouses)' : `📍 ${selectedBranch} Warehouse Hub`}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time automated deduction based on CRM job installations & restock procurement.
          </p>
        </div>

        {!isArchived && !isViewer && (
          <button
            onClick={() => handleOpenAdjustModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Set Opening Stock / Adjustment</span>
          </button>
        )}
      </div>

      {/* REAL-TIME WAREHOUSE STOCK LEVEL CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            {selectedBranch === 'All' ? 'Consolidated Warehouse Available Balance' : `${selectedBranch} Warehouse Balance`}
          </h3>
          <span className="text-[11px] text-slate-400">
            {selectedBranch === 'All' ? 'Combined Karachi & Lahore Stocks' : `Live ${selectedBranch} Warehouse Inventory`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {currentStock.map((item: any) => {
            const isLow = item.isLowStock
            return (
              <div
                key={item.key}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isLow
                    ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/30'
                    : 'bg-white dark:bg-[#131b2a] border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {item.name}
                  </span>
                  {isLow ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                      <AlertTriangle className="w-3 h-3" /> Low
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" /> Good
                    </span>
                  )}
                </div>

                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {item.currentStock}{' '}
                  <span className="text-xs font-medium text-slate-400">{item.unit}s</span>
                </div>

                {selectedBranch === 'All' ? (
                  <div className="text-[10px] text-slate-400 mt-2 flex justify-between gap-1 border-t border-slate-100 dark:border-slate-800/80 pt-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Karachi: {item.karachiStock ?? 0}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">Lahore: {item.lahoreStock ?? 0}</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 mt-2 flex justify-between border-t border-slate-100 dark:border-slate-800/80 pt-1.5">
                    <span>Threshold: {item.lowStockThreshold} {item.unit}s</span>
                    <span className="font-medium text-slate-600 dark:text-slate-300">{selectedBranch} Hub</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* DAILY LEDGER AUDIT MATRIX */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Daily Warehouse Inventory Ledger
            </h3>
            <p className="text-[11px] text-slate-400">
              Formula: <b>Closing Stock on Date = Opening Stock + Restocked (Purchases) - Used (CRM Jobs)</b>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
              className="text-xs font-medium px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">All Materials</option>
              {items.map((i: any) => (
                <option key={i.key} value={i.key}>{i.name}</option>
              ))}
            </select>

            {!isArchived && !isViewer && (
              <button
                onClick={handleSyncLedger}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold disabled:opacity-50 transition-all"
                title="Synchronize inventory with all vendor purchases and CRM jobs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Ledger'}</span>
              </button>
            )}

            <button
              onClick={fetchInventory}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              title="Refresh Ledger"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Material Item</th>
                  <th className="py-3 px-3 text-right">Opening Stock</th>
                  <th className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">Restocked (+)</th>
                  <th className="py-3 px-3 text-right text-rose-600 dark:text-rose-400">CRM Used (-)</th>
                  <th className="py-3 px-3 text-right font-bold">Closing Stock</th>
                  <th className="py-3 px-3">Ledger Notes</th>
                  {!isArchived && !isViewer && <th className="py-3 px-3 text-center w-20">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={!isArchived && !isViewer ? 8 : 7} className="py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading ledger history...</span>
                      </div>
                    </td>
                  </tr>
                ) : ledger.length === 0 ? (
                  <tr>
                    <td colSpan={!isArchived && !isViewer ? 8 : 7} className="py-12 text-center text-slate-400">
                      No stock movement entries recorded for {formatMonthLabel(selectedMonth)}.
                    </td>
                  </tr>
                ) : (
                  ledger.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {formatDateDisplay(row.date)}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {row.itemName}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {row.openingStock} {row.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {row.restockQty > 0 ? `+${row.restockQty}` : '0'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">
                        {row.usedQty > 0 ? `-${row.usedQty}` : '0'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {row.closingStock} {row.unit}
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                        {row.notes || (row.usedQty > 0 ? 'CRM Installation Deductions' : 'Opening stock carryover')}
                      </td>
                      {!isArchived && !isViewer && (
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleOpenAdjustModal(row, row.date)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-500"
                            title="Adjust Opening Stock"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ADJUST OPENING STOCK MODAL */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-2xl p-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-500" />
                Set Opening Stock / Balance
              </h3>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={adjustDate}
                  onChange={(e) => setAdjustDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              {/* Branch / Location */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-violet-500" />
                  Branch / Location
                  <span className="text-rose-500 ml-0.5">*</span>
                </label>
                <select
                  required
                  value={adjustBranch}
                  onChange={(e) => setAdjustBranch(e.target.value as 'Karachi' | 'Lahore')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-violet-300 dark:border-violet-700 rounded-xl font-semibold text-violet-700 dark:text-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                >
                  <option value="Karachi">📍 Karachi Warehouse</option>
                  <option value="Lahore">📍 Lahore Warehouse</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Stock balance will be tracked independently per warehouse.</p>
              </div>

              {/* Material Item */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Material Item</label>
                <select
                  value={adjustItemKey}
                  onChange={(e) => setAdjustItemKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                >
                  {items.map((i: any) => (
                    <option key={i.key} value={i.key}>{i.name} ({i.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Opening Stock Quantity
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.5"
                  value={adjustOpeningStock}
                  onChange={(e) => setAdjustOpeningStock(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Adjustment Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Physical stock audit reconciliation"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 font-bold text-slate-950 shadow active:scale-95 transition-all"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Saving...' : `Save — ${adjustBranch} Stock`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
