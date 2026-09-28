"use client";

import React, { useState } from 'react'
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

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const { isViewer } = useAuth()

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
