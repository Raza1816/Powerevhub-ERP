"use client";

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { ExecutiveDashboard } from '@/components/dashboard/ExecutiveDashboard'
import { CrmTable } from '@/components/crm/CrmTable'
import { InventoryLedgerView } from '@/components/inventory/InventoryLedgerView'
import { VendorProcurementView } from '@/components/vendors/VendorProcurementView'
import { FinancialsView } from '@/components/financials/FinancialsView'
import { SettingsView } from '@/components/settings/SettingsView'
import { JobFormModal } from '@/components/crm/JobFormModal'
import { JobVoucherModal } from '@/components/crm/JobVoucherModal'
import { useAuth } from '@/components/auth/AuthContext'
import { ShieldAlert, Zap } from 'lucide-react'

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const { user, isLoading, isViewer } = useAuth()
  const router = useRouter()

  // Client-Side Auth Guard Fallback
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [isLoading, user, router])

  // Prevent rendering metrics or dashboard elements prior to session verification
  if (isLoading || !user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#090d14] via-[#0e1626] to-[#0a101d] text-slate-100 p-4">
        <div className="flex flex-col items-center max-w-sm w-full p-8 rounded-2xl bg-[#131b2b]/90 border border-slate-800 shadow-2xl backdrop-blur-xl text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-base font-semibold text-white tracking-wide">
            POWER EV HUB ERP
          </h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            Verifying Workstation Security Session...
          </p>
          <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f17]">
      {/* Top Navbar with Month Archive Selector, Currency Switcher, Theme Switcher */}
      <Navbar onTabChange={setActiveTab} activeTab={activeTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && <ExecutiveDashboard onTabChange={setActiveTab} />}
        {activeTab === 'crm' && <CrmTable />}
        {activeTab === 'inventory' && <InventoryLedgerView />}
        {activeTab === 'vendors' && <VendorProcurementView />}
        {activeTab === 'financials' && <FinancialsView />}
        {activeTab === 'settings' && !isViewer && <SettingsView />}
      </main>

      {/* Interactive Modals */}
      <JobFormModal />
      <JobVoucherModal />

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Power EV Hub ERP. All Rights Reserved.</span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
            Engineered for High-Reliability EV Infrastructure Deployment
          </span>
        </div>
      </footer>
    </div>
  )
}
