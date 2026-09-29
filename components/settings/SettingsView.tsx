'use client'

import React, { useState, useEffect } from 'react'
import { useApp } from '@/components/common/AppContext'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/components/auth/AuthContext'
import {
  RotateCcw,
  Lock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  History,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  Key,
  Layers,
  Sparkles,
  Server,
  X,
  Check,
} from 'lucide-react'
import { formatDateDisplay } from '@/lib/dateUtils'

export function SettingsView() {
  const { formatCurrency, refreshKey, triggerRefresh } = useApp()
  const { isViewer } = useAuth()
  const toast = useToast()

  const [settingsData, setSettingsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // User Security Management state
  const [adminUsername, setAdminUsername] = useState('admin')
  const [adminPassword, setAdminPassword] = useState('')
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [savingAdmin, setSavingAdmin] = useState(false)

  const [viewerUsername, setViewerUsername] = useState('viewer')
  const [viewerPassword, setViewerPassword] = useState('')
  const [showViewerPassword, setShowViewerPassword] = useState(false)
  const [savingViewer, setSavingViewer] = useState(false)

  // Rate Edit Modal state
  const [isRateModalOpen, setIsRateModalOpen] = useState(false)
  const [selectedRateItem, setSelectedRateItem] = useState<any>(null)
  const [newRateValue, setNewRateValue] = useState<number>(0)
  const [rateNotes, setRateNotes] = useState('')
  const [savingRate, setSavingRate] = useState(false)

  // Dropdown Add state
  const [isAddDropdownModalOpen, setIsAddDropdownModalOpen] = useState(false)
  const [dropdownCategory, setDropdownCategory] = useState('SOURCE')
  const [dropdownValue, setDropdownValue] = useState('')
  const [savingDropdown, setSavingDropdown] = useState(false)

  // Data Seeding state
  const [isSeeding, setIsSeeding] = useState(false)
  // Inventory Reset state
  const [isResettingInventory, setIsResettingInventory] = useState(false)

  const handleResetInventory = async () => {
    if (
      !confirm(
        'Are you sure you want to reset the Warehouse Inventory Ledger? This will delete all stock movement records and reset all warehouse card balances (opening stock, available stock, Karachi & Lahore stocks) to 0.'
      )
    ) {
      return
    }

    try {
      setIsResettingInventory(true)
      const res = await fetch('/api/inventory/clear', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(
          'Inventory Ledger Reset',
          data.message || 'All warehouse movement records have been cleared and all card balances reset to 0.'
        )
        triggerRefresh()
      } else {
        toast.error('Reset Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    } finally {
      setIsResettingInventory(false)
    }
  }

  const fetchSettings = () => {
    setLoading(true)
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSettingsData(data)
        }
      })
      .catch((err) => console.error('Failed to load settings:', err))
      .finally(() => setLoading(false))
  }

  const fetchUsers = () => {
    fetch('/api/auth/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.users)) {
          const admin = data.users.find((u: any) => u.role === 'admin')
          const viewer = data.users.find((u: any) => u.role === 'viewer')
          if (admin) setAdminUsername(admin.username)
          if (viewer) setViewerUsername(viewer.username)
        }
      })
      .catch((err) => console.error('Failed to load users:', err))
  }

  useEffect(() => {
    fetchSettings()
    fetchUsers()
  }, [refreshKey])

  const handleUpdateCredentials = async (targetRole: 'admin' | 'viewer') => {
    const isTargetAdmin = targetRole === 'admin'
    const username = isTargetAdmin ? adminUsername : viewerUsername
    const password = isTargetAdmin ? adminPassword : viewerPassword
    const setSaving = isTargetAdmin ? setSavingAdmin : setSavingViewer

    if (!username.trim()) {
      toast.error('Validation Error', 'Username cannot be blank.')
      return
    }

    if (password && password.trim().length > 0 && password.trim().length < 4) {
      toast.error('Validation Error', 'New password must be at least 4 characters long.')
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/auth/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole,
          username: username.trim(),
          password: password ? password.trim() : undefined,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(
          'Credentials Updated',
          data.message || `${targetRole.toUpperCase()} credentials saved successfully!`
        )
        if (isTargetAdmin) {
          setAdminPassword('')
          if (data.user?.username) setAdminUsername(data.user.username)
        } else {
          setViewerPassword('')
          if (data.user?.username) setViewerUsername(data.user.username)
        }
      } else {
        toast.error('Update Failed', data.error || 'Could not update credentials.')
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleOpenRateModal = (item: any) => {
    setSelectedRateItem(item)
    setNewRateValue(item.rate)
    setRateNotes('')
    setIsRateModalOpen(true)
  }

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRateItem) return

    try {
      setSavingRate(true)
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_UNIT_RATE',
          itemKey: selectedRateItem.itemKey,
          newRate: Number(newRateValue),
          notes: rateNotes || 'Admin master rate adjustment',
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(
          'Master Unit Rate Updated',
          `New jobs will lock in rate ${formatCurrency(newRateValue)}/${selectedRateItem.unit}. Historical jobs retain their fixed rates.`
        )
        setIsRateModalOpen(false)
        triggerRefresh()
      } else {
        toast.error('Update Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    } finally {
      setSavingRate(false)
    }
  }

  const handleAddDropdown = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dropdownValue.trim()) return

    try {
      setSavingDropdown(true)
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_DROPDOWN',
          category: dropdownCategory,
          value: dropdownValue.trim(),
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Option Added', `Added "${dropdownValue}" to ${dropdownCategory} dropdown.`)
        setIsAddDropdownModalOpen(false)
        setDropdownValue('')
        triggerRefresh()
      } else {
        toast.error('Error', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    } finally {
      setSavingDropdown(false)
    }
  }

  const handleDeleteDropdown = async (id: string, value: string, category?: string) => {
    if (!confirm(`Delete option "${value}"?`)) return

    // Optimistically remove from state immediately without full page refresh
    setSettingsData((prev: any) => {
      if (!prev?.dropdowns) return prev
      const updated = { ...prev.dropdowns }
      const catsToUpdate = category ? [category] : Object.keys(updated)
      catsToUpdate.forEach((cat) => {
        if (updated[cat]) {
          updated[cat] = updated[cat].filter((d: any) => d.id !== id && d.value !== value)
        }
      })
      return { ...prev, dropdowns: updated }
    })

    try {
      const url = `/api/settings?id=${encodeURIComponent(id)}&category=${encodeURIComponent(category || '')}&value=${encodeURIComponent(value)}`
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Option Deleted', `Removed "${value}".`)
        triggerRefresh()
      } else {
        toast.error('Error', data.error || 'Failed to delete option.')
        fetchSettings() // rollback on error
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
      fetchSettings()
    }
  }

  const handleSeedDemoData = async () => {
    if (!confirm('This will seed realistic demo records for current and historical months. Proceed?')) return

    try {
      setIsSeeding(true)
      const res = await fetch('/api/seed', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success('Demo Data Seeded', 'Populated active & archived jobs, price history, and stock records.')
        triggerRefresh()
      } else {
        toast.error('Seeding Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    } finally {
      setIsSeeding(false)
    }
  }

  const unitRates = settingsData?.unitRates || []
  const rateHistory = settingsData?.rateHistory || []
  const dropdowns = settingsData?.dropdowns || {}

  if (isViewer) {
    return (
      <div className="p-12 text-center bg-white dark:bg-[#131b2a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Access Restricted</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          Admin Settings & Master Configuration is strictly restricted to Administrator accounts. Viewer accounts have complete read-only access to operations and reports.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-16">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Admin Settings & Master Price Versioning</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure global material unit rates, versioning history, and system dropdown masters.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleResetInventory}
            disabled={isResettingInventory}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-colors disabled:opacity-50"
            title="Clear all records from Warehouse Inventory Ledger table"
          >
            <Trash2 className={`w-3.5 h-3.5 ${isResettingInventory ? 'animate-spin' : ''}`} />
            <span>{isResettingInventory ? 'Clearing Ledger...' : 'Reset Inventory Ledger'}</span>
          </button>

          <button
            onClick={handleSeedDemoData}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 text-cyan-400 ${isSeeding ? 'animate-spin' : ''}`} />
            <span>{isSeeding ? 'Seeding Demo Data...' : 'Reset & Seed Demo Data'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: GLOBAL UNIT RATES & PRICE VERSIONING */}
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
          <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-emerald-800 dark:text-emerald-300">
              Rule 2: Effective Unit Cost Lock-In (Price Versioning)
            </h4>
            <p className="text-emerald-900/80 dark:text-emerald-200/80 mt-0.5 leading-relaxed">
              Modifications to unit rates apply <b>ONLY to new CRM entries</b> created after the change. Existing CRM entries permanently lock in the unit rates present at the time of creation so historical gross profit reports remain 100% fixed and audit-compliant.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {unitRates.map((item: any) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {item.itemName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Active Rate
                  </span>
                </div>

                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
                  {formatCurrency(item.rate)}{' '}
                  <span className="text-xs font-semibold text-slate-400">/ {item.unit}</span>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  Effective Date: {formatDateDisplay(item.effectiveDate ? item.effectiveDate.split('T')[0] : '')}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => handleOpenRateModal(item)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Update Rate</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* PRICE VERSION AUDIT HISTORY LOG */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm p-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            Unit Rate Version History (Audit Trail)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2">Item Name</th>
                  <th className="py-2">Previous Rate</th>
                  <th className="py-2 text-emerald-500">New Rate</th>
                  <th className="py-2">Effective Date</th>
                  <th className="py-2">Change Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {rateHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">
                      No price modifications recorded yet.
                    </td>
                  </tr>
                ) : (
                  rateHistory.map((h: any) => (
                    <tr key={h.id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-2.5 font-semibold">{h.itemName}</td>
                      <td className="py-2.5 line-through text-slate-400">{formatCurrency(h.oldRate)}/{h.unit}</td>
                      <td className="py-2.5 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(h.newRate)}/{h.unit}</td>
                      <td className="py-2.5">{formatDateDisplay(h.changedAt ? h.changedAt.split('T')[0] : '')}</td>
                      <td className="py-2.5 text-slate-500">{h.notes || 'Admin rate modification'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: EDITABLE DROPDOWNS & MASTER VALUES (RULE 6) */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            System Dropdown Masters (Sources, Technicians, Payment Methods, EV Vehicle Brands)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Add or remove choices for lead sources, technician teams, payment methods, and EV vehicle brands.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. SOURCES */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Lead Sources
              </span>
              <button
                onClick={() => {
                  setDropdownCategory('SOURCE')
                  setDropdownValue('')
                  setIsAddDropdownModalOpen(true)
                }}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-500"
                title="Add New Source"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {(dropdowns.SOURCE || []).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{d.value}</span>
                  <button
                    onClick={() => handleDeleteDropdown(d.id, d.value, 'SOURCE')}
                    className="text-slate-400 hover:text-rose-500 p-1"
                    title="Delete Option"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 2. TECHNICIANS */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Technician Teams
              </span>
              <button
                onClick={() => {
                  setDropdownCategory('TECHNICIAN')
                  setDropdownValue('')
                  setIsAddDropdownModalOpen(true)
                }}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-500"
                title="Add New Technician Team"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {(dropdowns.TECHNICIAN || []).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{d.value}</span>
                  <button
                    onClick={() => handleDeleteDropdown(d.id, d.value, 'TECHNICIAN')}
                    className="text-slate-400 hover:text-rose-500 p-1"
                    title="Delete Option"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 3. PAYMENT METHODS */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Payment Methods
              </span>
              <button
                onClick={() => {
                  setDropdownCategory('PAYMENT_METHOD')
                  setDropdownValue('')
                  setIsAddDropdownModalOpen(true)
                }}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-500"
                title="Add New Payment Method"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {(dropdowns.PAYMENT_METHOD || []).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{d.value}</span>
                  <button
                    onClick={() => handleDeleteDropdown(d.id, d.value, 'PAYMENT_METHOD')}
                    className="text-slate-400 hover:text-rose-500 p-1"
                    title="Delete Option"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 4. EV VEHICLE BRANDS */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                EV Vehicle Brands
              </span>
              <button
                onClick={() => {
                  setDropdownCategory('VEHICLE_BRAND')
                  setDropdownValue('')
                  setIsAddDropdownModalOpen(true)
                }}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-500"
                title="Add New EV Vehicle Brand"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {(dropdowns.VEHICLE_BRAND || []).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{d.value}</span>
                  <button
                    onClick={() => handleDeleteDropdown(d.id, d.value, 'VEHICLE_BRAND')}
                    className="text-slate-400 hover:text-rose-500 p-1"
                    title="Delete Option"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. USER & SECURITY MANAGEMENT */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              User & Security Management
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage system access credentials for Admin (Full Access) and Viewer (Read-Only) roles.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Lock className="w-3 h-3" />
            Hashed via Bcrypt
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Admin Account */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Admin Account</h4>
                  <p className="text-[11px] text-slate-400">Full Unrestricted Access</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Active Role: Admin
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Admin Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="admin"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Admin Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Key className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full pl-9 pr-10 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleUpdateCredentials('admin')}
                disabled={savingAdmin}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {savingAdmin ? (
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Save Admin Credentials</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Viewer Account */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Viewer Account</h4>
                  <p className="text-[11px] text-slate-400">Complete 100% Read-Only</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                Active Role: Viewer
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Viewer Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={viewerUsername}
                    onChange={(e) => setViewerUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="viewer"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Viewer Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Key className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showViewerPassword ? 'text' : 'password'}
                    value={viewerPassword}
                    onChange={(e) => setViewerPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full pl-9 pr-10 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowViewerPassword(!showViewerPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showViewerPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleUpdateCredentials('viewer')}
                disabled={savingViewer}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {savingViewer ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Save Viewer Credentials</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* UPDATE RATE MODAL */}
      {isRateModalOpen && selectedRateItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-2xl p-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-500" />
                Update Master Rate: {selectedRateItem.itemName}
              </h3>
              <button onClick={() => setIsRateModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-slate-500">Current Active Rate:</div>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(selectedRateItem.rate)} / {selectedRateItem.unit}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  New Master Unit Rate ({selectedRateItem.unit}) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={newRateValue}
                  onChange={(e) => setNewRateValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-base font-bold bg-slate-50 dark:bg-slate-900 border border-emerald-500/40 rounded-xl text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Price Revision Reason / Supplier Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Copper price index increase by 8%"
                  value={rateNotes}
                  onChange={(e) => setRateNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRate}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 font-bold text-slate-950 shadow"
                >
                  {savingRate ? 'Saving...' : 'Set Effective Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD DROPDOWN MODAL */}
      {isAddDropdownModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-2xl p-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                Add New {dropdownCategory} Option
              </h3>
              <button onClick={() => setIsAddDropdownModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDropdown} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  disabled
                  value={dropdownCategory}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold opacity-80"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Option Name / Value *
                </label>
                <input
                  type="text"
                  required
                  placeholder={`e.g. ${dropdownCategory === 'SOURCE' ? 'Social Media Campaign' : dropdownCategory === 'TECHNICIAN' ? 'Team Epsilon (Lead: Tariq)' : dropdownCategory === 'VEHICLE_BRAND' ? 'BYD / MG / Deepal / Audi' : 'Easypaisa / JazzCash'}`}
                  value={dropdownValue}
                  onChange={(e) => setDropdownValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddDropdownModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDropdown}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 font-bold text-slate-950 shadow"
                >
                  {savingDropdown ? 'Saving...' : 'Add Dropdown Choice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
