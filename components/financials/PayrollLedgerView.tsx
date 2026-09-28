'use client'

import React, { useState, useEffect } from 'react'
import { useApp } from '@/components/common/AppContext'
import { useToast } from '@/components/common/Toast'
import { useBranch } from '@/app/context/BranchContext'
import { useAuth } from '@/components/auth/AuthContext'
import {
  Users,
  UserPlus,
  DollarSign,
  CreditCard,
  Wallet,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit2,
  X,
  FileText,
  Printer,
  ChevronRight,
  TrendingUp,
  Fuel,
  Utensils,
  Award,
  Zap,
  Info,
} from 'lucide-react'
import { formatDateDisplay, formatMonthLabel, getTodayDateString } from '@/lib/dateUtils'

export function PayrollLedgerView() {
  const { selectedMonth, isArchived, formatCurrency, refreshKey, triggerRefresh } = useApp()
  const toast = useToast()
  const { selectedBranch } = useBranch()
  const { isViewer } = useAuth()

  const [activeSection, setActiveSection] = useState<'employees' | 'payroll_runs' | 'advances'>('employees')

  const [employees, setEmployees] = useState<any[]>([])
  const [payrollRecords, setPayrollRecords] = useState<any[]>([])
  const [advances, setAdvances] = useState<any[]>([])
  const [payrollSummary, setPayrollSummary] = useState<any>({})
  const [advanceSummary, setAdvanceSummary] = useState<any>({})
  const [loading, setLoading] = useState(true)

  // 1. Employee Profile Modal
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false)
  const [employeeSubmitting, setEmployeeSubmitting] = useState(false)
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null)
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    designation: '',
    baseSalary: '',
    defaultFuelAllocation: '',
    contactNo: '',
    dateOfJoining: getTodayDateString(),
    notes: '',
  })

  // 2. Salary Advance Modal
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false)
  const [advanceSubmitting, setAdvanceSubmitting] = useState(false)
  const [advanceForm, setAdvanceForm] = useState({
    date: getTodayDateString(),
    employeeId: '',
    amount: '',
    paymentMethod: 'Cash',
    notes: '',
  })

  // 3. Dynamic Payroll Processing Modal
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false)
  const [payrollSubmitting, setPayrollSubmitting] = useState(false)
  const [payrollForm, setPayrollForm] = useState({
    date: getTodayDateString(),
    employeeId: '',
    baseSalary: 0,
    overtimeAmount: 0,
    foodIncentive: 0,
    fuelIncentive: 0,
    installationIncentive: 0,
    advanceDeduction: 0,
    paymentMethod: 'Bank',
    notes: '',
  })

  // 4. Payslip Voucher Modal
  const [payslipRecord, setPayslipRecord] = useState<any>(null)

  // Load data
  const fetchData = async () => {
    try {
      setLoading(true)
      const branchParam = selectedBranch !== 'All' ? `&branch=${encodeURIComponent(selectedBranch)}` : ''
      const [empRes, payRes, advRes] = await Promise.all([
        fetch(`/api/employees?month=${selectedMonth}${branchParam}`),
        fetch(`/api/payroll/records?month=${selectedMonth}${branchParam}`),
        fetch(`/api/payroll/advances?month=${selectedMonth}${branchParam}`),
      ])

      const [empData, payData, advData] = await Promise.all([
        empRes.json(),
        payRes.json(),
        advRes.json(),
      ])

      if (empData.success) setEmployees(empData.employees || [])
      if (payData.success) {
        setPayrollRecords(payData.records || [])
        setPayrollSummary(payData.summary || {})
      }
      if (advData.success) {
        setAdvances(advData.advances || [])
        setAdvanceSummary(advData.summary || {})
      }
    } catch (err) {
      console.error('Failed to load payroll data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedMonth, refreshKey, selectedBranch])

  // Open Create/Edit Employee Modal
  const openEmployeeModal = (emp?: any) => {
    if (isViewer) {
      toast.error('Read-Only Access', 'Viewer accounts have read-only access.')
      return
    }
    if (emp) {
      setEditingEmployeeId(emp.id)
      setEmployeeForm({
        name: emp.name,
        designation: emp.designation,
        baseSalary: emp.baseSalary?.toString() || '',
        defaultFuelAllocation: emp.defaultFuelAllocation?.toString() || '',
        contactNo: emp.contactNo || '',
        dateOfJoining: emp.dateOfJoining || getTodayDateString(),
        notes: emp.notes || '',
      })
    } else {
      setEditingEmployeeId(null)
      setEmployeeForm({
        name: '',
        designation: '',
        baseSalary: '',
        defaultFuelAllocation: '',
        contactNo: '',
        dateOfJoining: getTodayDateString(),
        notes: '',
      })
    }
    setIsEmployeeModalOpen(true)
  }

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeForm.name.trim() || !employeeForm.designation.trim()) {
      toast.error('Validation Error', 'Name and Designation are required.')
      return
    }

    try {
      setEmployeeSubmitting(true)
      const url = editingEmployeeId ? `/api/employees/${editingEmployeeId}` : '/api/employees'
      const method = editingEmployeeId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeForm),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(
          editingEmployeeId ? 'Profile Updated' : 'Employee Profile Created',
          `${employeeForm.name} profile saved successfully.`
        )
        setIsEmployeeModalOpen(false)
        triggerRefresh()
      } else {
        toast.error('Save Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    } finally {
      setEmployeeSubmitting(false)
    }
  }

  // Open Salary Advance Modal
  const openAdvanceModal = (employeeId?: string) => {
    if (isViewer) {
      toast.error('Read-Only Access', 'Viewer accounts have read-only access.')
      return
    }
    setAdvanceForm({
      date: getTodayDateString(),
      employeeId: employeeId || (employees[0]?.id || ''),
      amount: '',
      paymentMethod: 'Cash',
      notes: '',
    })
    setIsAdvanceModalOpen(true)
  }

  const handleSaveAdvance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!advanceForm.employeeId) {
      toast.error('Validation Error', 'Please select an employee.')
      return
    }
    const numAmt = parseFloat(advanceForm.amount)
    if (isNaN(numAmt) || numAmt <= 0) {
      toast.error('Validation Error', 'Please enter a valid advance amount.')
      return
    }

    try {
      setAdvanceSubmitting(true)
      const res = await fetch('/api/payroll/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(advanceForm),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(
          'Salary Advance Recorded',
          `${formatCurrency(numAmt)} advance given. Deducted from Available ${advanceForm.paymentMethod} and added to employee advance balance.`
        )
        setIsAdvanceModalOpen(false)
        triggerRefresh()
      } else {
        toast.error('Save Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    } finally {
      setAdvanceSubmitting(false)
    }
  }

  // Open Payroll Processing Modal
  const openPayrollModal = (emp?: any) => {
    if (isViewer) {
      toast.error('Read-Only Access', 'Viewer accounts have read-only access.')
      return
    }
    const targetEmp = emp || employees[0]
    if (!targetEmp) {
      toast.error('No Employees', 'Please create an employee profile first.')
      return
    }

    const currentAdvanceBalance = targetEmp.outstandingAdvanceBalance || 0
    const baseSal = targetEmp.baseSalary || 0
    // Auto calculate advance deduction (up to advance balance or base salary)
    const autoAdvanceDed = Math.min(currentAdvanceBalance, baseSal)

    setPayrollForm({
      date: getTodayDateString(),
      employeeId: targetEmp.id,
      baseSalary: baseSal,
      overtimeAmount: 0,
      foodIncentive: 0,
      fuelIncentive: targetEmp.defaultFuelAllocation || 0,
      installationIncentive: 0,
      advanceDeduction: autoAdvanceDed,
      paymentMethod: 'Bank',
      notes: '',
    })
    setIsPayrollModalOpen(true)
  }

  const handlePayrollEmployeeChange = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId)
    if (emp) {
      const adv = emp.outstandingAdvanceBalance || 0
      const base = emp.baseSalary || 0
      setPayrollForm((prev) => ({
        ...prev,
        employeeId,
        baseSalary: base,
        fuelIncentive: emp.defaultFuelAllocation || 0,
        advanceDeduction: Math.min(adv, base),
      }))
    }
  }

  // Live Payroll calculations
  const selectedEmp = employees.find((e) => e.id === payrollForm.employeeId)
  const currentAdvance = selectedEmp?.outstandingAdvanceBalance || 0
  const grossEarnings = Math.round(
    (Number(payrollForm.baseSalary || 0) +
      Number(payrollForm.overtimeAmount || 0) +
      Number(payrollForm.foodIncentive || 0) +
      Number(payrollForm.fuelIncentive || 0) +
      Number(payrollForm.installationIncentive || 0)) *
      100
  ) / 100
  const netPayable = Math.max(0, Math.round((grossEarnings - Number(payrollForm.advanceDeduction || 0)) * 100) / 100)
  const remainingAdvanceAfter = Math.max(0, currentAdvance - Number(payrollForm.advanceDeduction || 0))

  const handleExecutePayroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payrollForm.employeeId) {
      toast.error('Validation Error', 'Please select an employee.')
      return
    }

    try {
      setPayrollSubmitting(true)
      const res = await fetch('/api/payroll/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payrollForm),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(
          'Payroll Processed!',
          `Net payout ${formatCurrency(netPayable)} paid via ${payrollForm.paymentMethod}. Gross staff expense ${formatCurrency(grossEarnings)} logged.`
        )
        setIsPayrollModalOpen(false)
        triggerRefresh()
      } else {
        toast.error('Payroll Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    } finally {
      setPayrollSubmitting(false)
    }
  }

  const handleDeletePayroll = async (id: string) => {
    if (isArchived || isViewer) {
      toast.error('Read-Only Access', isViewer ? 'Viewer accounts have read-only access.' : 'Historical records are read-only.')
      return
    }
    if (!confirm('Are you sure you want to delete this payroll record? Advance deductions will be restored.')) return

    try {
      const res = await fetch(`/api/payroll/records/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Payroll Record Deleted', 'Ledger and advance balances restored.')
        triggerRefresh()
      } else {
        toast.error('Delete Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    }
  }

  const handleDeleteAdvance = async (id: string) => {
    if (isArchived || isViewer) {
      toast.error('Read-Only Access', isViewer ? 'Viewer accounts have read-only access.' : 'Historical records are read-only.')
      return
    }
    if (!confirm('Are you sure you want to delete this salary advance record?')) return

    try {
      const res = await fetch(`/api/payroll/advances/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Advance Record Deleted', 'Salary advance removed from ledger.')
        triggerRefresh()
      } else {
        toast.error('Delete Failed', data.error)
      }
    } catch (err: any) {
      toast.error('Network Error', err.message)
    }
  }

  // Total company wide advance balance
  const totalCompanyAdvanceBalance = employees.reduce((sum, e) => sum + (e.outstandingAdvanceBalance || 0), 0)
  const totalMonthlyBaseCommitment = employees.reduce((sum, e) => sum + (e.baseSalary || 0), 0)

  return (
    <div className="space-y-6">
      {/* HEADER & MAIN ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
            <span>Employee Profiles & Payroll Ledger</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {formatMonthLabel(selectedMonth)}
            </span>
            {selectedBranch !== 'All' && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                📍 {selectedBranch}
              </span>
            )}
            {selectedBranch === 'All' && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">
                🌐 All Branches
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage employee master profiles, disburse salary advances, run flexible payrolls (with Overtime, Food, Fuel, & Installation Incentives), and track live advance balances.
          </p>
        </div>

        {!isArchived && !isViewer && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openEmployeeModal()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm transition-all"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
              <span>+ New Employee</span>
            </button>

            <button
              onClick={() => openAdvanceModal()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-sm transition-all"
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>+ Record Advance</span>
            </button>

            <button
              onClick={() => openPayrollModal()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <DollarSign className="w-4 h-4 stroke-[2.5]" />
              <span>Run Payroll</span>
            </button>
          </div>
        )}
      </div>

      {/* 4 SUMMARY STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Gross Payroll Processed */}
        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-sm">
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
            Gross Payroll Processed
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {formatCurrency(payrollSummary.totalGrossPayroll || 0)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Net Paid: {formatCurrency(payrollSummary.totalNetPaid || 0)} in {formatMonthLabel(selectedMonth)}
          </div>
        </div>

        {/* 2. Monthly Base Commitment */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Base Commitment
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
            {formatCurrency(totalMonthlyBaseCommitment)}
          </div>
          <div className="text-xs text-slate-400 mt-1">{employees.length} Active Staff Members</div>
        </div>

        {/* 3. Live Outstanding Advances */}
        <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Outstanding Advances
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono">
            {formatCurrency(totalCompanyAdvanceBalance)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Total Employee Loan Receivables</div>
        </div>

        {/* 4. Incentives Disbursed This Month */}
        <div className="p-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 dark:bg-cyan-950/20 shadow-sm">
          <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 uppercase tracking-wider">
            Incentives & OT Disbursed
          </div>
          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1 font-mono">
            {formatCurrency(
              (payrollSummary.totalOvertime || 0) +
                (payrollSummary.totalFoodIncentive || 0) +
                (payrollSummary.totalFuelIncentive || 0) +
                (payrollSummary.totalInstallationIncentive || 0)
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1">Overtime + Food + Fuel + Install</div>
        </div>
      </div>

      {/* SUB-SECTION NAV PILLS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveSection('employees')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeSection === 'employees'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Employee Profiles ({employees.length})
        </button>

        <button
          onClick={() => setActiveSection('payroll_runs')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeSection === 'payroll_runs'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Payroll Run History ({payrollRecords.length})
        </button>

        <button
          onClick={() => setActiveSection('advances')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeSection === 'advances'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Salary Advance Log ({advances.length})
        </button>
      </div>

      {/* SECTION 1: EMPLOYEE MASTER PROFILES */}
      {activeSection === 'employees' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.length === 0 ? (
              <div className="col-span-full p-12 text-center text-slate-400 bg-white dark:bg-[#131b2a] rounded-2xl border border-slate-200 dark:border-slate-800">
                No employee profiles registered yet. Click &ldquo;+ New Employee&rdquo; to add your team members.
              </div>
            ) : (
              employees.map((emp) => {
                const hasAdvance = (emp.outstandingAdvanceBalance || 0) > 0
                return (
                  <div
                    key={emp.id}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm hover:border-emerald-500/30 transition-all flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{emp.name}</h3>
                          <span className="inline-block text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                            {emp.designation}
                          </span>
                        </div>

                        {!isArchived && !isViewer && (
                          <button
                            onClick={() => openEmployeeModal(emp)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Edit Employee"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Financial info */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>Monthly Base Salary:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                            {formatCurrency(emp.baseSalary)}
                          </span>
                        </div>

                        {emp.defaultFuelAllocation > 0 && (
                          <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>Default Fuel Baseline:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                              {formatCurrency(emp.defaultFuelAllocation)}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800/60">
                          <span className="text-slate-500 font-medium">Outstanding Advance:</span>
                          <span
                            className={`font-bold font-mono px-2 py-0.5 rounded-md text-xs ${
                              hasAdvance
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {formatCurrency(emp.outstandingAdvanceBalance || 0)}
                          </span>
                        </div>

                        {emp.contactNo && (
                          <div className="text-[11px] text-slate-400 pt-1">Contact: {emp.contactNo}</div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {!isArchived && !isViewer && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => openAdvanceModal(emp.id)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors text-center"
                        >
                          + Advance
                        </button>
                        <button
                          onClick={() => openPayrollModal(emp)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors text-center shadow-sm"
                        >
                          Run Payroll
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: PAYROLL RUN HISTORY */}
      {activeSection === 'payroll_runs' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Employee</th>
                    <th className="py-3 px-3 text-right">Base</th>
                    <th className="py-3 px-3 text-right">OT / Food</th>
                    <th className="py-3 px-3 text-right">Fuel</th>
                    <th className="py-3 px-3 text-right">Install Inc.</th>
                    <th className="py-3 px-3 text-right font-semibold text-slate-800 dark:text-slate-200">Gross Earnings</th>
                    <th className="py-3 px-3 text-right text-amber-600 dark:text-amber-400">Advance Ded.</th>
                    <th className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">Net Paid</th>
                    <th className="py-3 px-3 text-center">Method</th>
                    <th className="py-3 px-3 text-center w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {payrollRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        No payroll payouts processed for {formatMonthLabel(selectedMonth)}.
                      </td>
                    </tr>
                  ) : (
                    payrollRecords.map((r) => {
                      const isCash = (r.paymentMethod || '').toLowerCase().includes('cash')
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                            {formatDateDisplay(r.date)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{r.employee?.name}</div>
                            <div className="text-[10px] text-slate-400">{r.employee?.designation}</div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatCurrency(r.baseSalary)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatCurrency((r.overtimeAmount || 0) + (r.foodIncentive || 0))}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatCurrency(r.fuelIncentive)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatCurrency(r.installationIncentive)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold font-mono text-slate-900 dark:text-slate-100">
                            {formatCurrency(r.totalGrossEarnings)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                            {r.advanceDeduction > 0 ? `-${formatCurrency(r.advanceDeduction)}` : '0'}
                          </td>
                          <td className="py-3 px-3 text-right font-black font-mono text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(r.netPayable)}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {isCash ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <Wallet className="w-2.5 h-2.5" /> Cash
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                                <Building2 className="w-2.5 h-2.5" /> Bank
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setPayslipRecord(r)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-colors"
                                title="View Payslip Voucher"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              {!isArchived && !isViewer && (
                                <button
                                  onClick={() => handleDeletePayroll(r.id)}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"
                                  title="Delete Payroll Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: SALARY ADVANCE LOG */}
      {activeSection === 'advances' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Employee</th>
                    <th className="py-3 px-3 text-right font-bold">Advance Amount</th>
                    <th className="py-3 px-3 text-right">Deducted in Payroll</th>
                    <th className="py-3 px-3 text-center">Payment Method</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3">Notes</th>
                    {!isArchived && <th className="py-3 px-3 text-center w-20">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {advances.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No salary advances recorded for {formatMonthLabel(selectedMonth)}.
                      </td>
                    </tr>
                  ) : (
                    advances.map((a) => {
                      const isSettled = a.status === 'Settled' || a.deductedAmount >= a.amount
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                            {formatDateDisplay(a.date)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{a.employee?.name}</div>
                            <div className="text-[10px] text-slate-400">{a.employee?.designation}</div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                            {formatCurrency(a.amount)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatCurrency(a.deductedAmount || 0)}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {a.paymentMethod}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {isSettled ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Settled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Clock className="w-2.5 h-2.5" /> Active
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                            {a.notes || '—'}
                          </td>
                          {!isArchived && !isViewer && (
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => handleDeleteAdvance(a.id)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"
                                title="Delete Advance"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
      )}

      {/* MODAL 1: ADD / EDIT EMPLOYEE MASTER PROFILE */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-2xl p-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-500" />
                {editingEmployeeId ? 'Edit Employee Profile' : 'New Employee Profile'}
              </h3>
              <button onClick={() => setIsEmployeeModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Employee Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ali Raza"
                  value={employeeForm.name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Designation * (Free-Text Input)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Electrician, Installer, Supervisor, Manager"
                  value={employeeForm.designation}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Base Salary (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    placeholder="e.g. 50000"
                    value={employeeForm.baseSalary}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, baseSalary: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Default Fuel Baseline (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 15000"
                    value={employeeForm.defaultFuelAllocation}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, defaultFuelAllocation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Details</label>
                  <input
                    type="text"
                    placeholder="+92 300 1234567"
                    value={employeeForm.contactNo}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, contactNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Date of Joining</label>
                  <input
                    type="date"
                    value={employeeForm.dateOfJoining}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, dateOfJoining: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="Optional employee notes..."
                  value={employeeForm.notes}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={employeeSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-slate-950 shadow transition-all active:scale-95 disabled:opacity-50"
                >
                  {employeeSubmitting ? 'Saving...' : editingEmployeeId ? 'Update Profile' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD SALARY ADVANCE */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-2xl p-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Record Salary Advance
              </h3>
              <button onClick={() => setIsAdvanceModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdvance} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={advanceForm.date}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Advance Amount (PKR) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    placeholder="e.g. 10000"
                    value={advanceForm.amount}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono text-amber-600 dark:text-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Employee Selection *</label>
                <select
                  value={advanceForm.employeeId}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.designation}) — Current Adv: {formatCurrency(emp.outstandingAdvanceBalance || 0)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Method *</label>
                <select
                  value={advanceForm.paymentMethod}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="Cash">Cash in Hand</option>
                  <option value="Bank">Bank Account Transfer</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Family medical emergency advance"
                  value={advanceForm.notes}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              {/* Financial Impact */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <span className="font-bold">Financial Impact:</span> Deducts from Available {advanceForm.paymentMethod} balance immediately and adds to employee&apos;s Outstanding Advance Balance (Loan Receivable).
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={advanceSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 shadow transition-all active:scale-95 disabled:opacity-50"
                >
                  {advanceSubmitting ? 'Recording...' : 'Disburse Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DYNAMIC PAYROLL & INCENTIVES PROCESSING */}
      {isPayrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl my-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-2xl p-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Process Payroll & Variable Incentives</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Calculates gross earnings, auto-deducts advance balance, and issues net payout.
                  </p>
                </div>
              </div>
              <button onClick={() => setIsPayrollModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecutePayroll} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Payout Date *</label>
                  <input
                    type="date"
                    required
                    value={payrollForm.date}
                    onChange={(e) => setPayrollForm({ ...payrollForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Employee Selection *</label>
                  <select
                    value={payrollForm.employeeId}
                    onChange={(e) => handlePayrollEmployeeChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.designation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LIVE EMPLOYEE BANNER */}
              {selectedEmp && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Designation</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedEmp.designation}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Live Advance Balance</span>
                    <span className={`font-bold font-mono ${currentAdvance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {formatCurrency(currentAdvance)}
                    </span>
                  </div>
                </div>
              )}

              {/* EARNINGS HEADS */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  1. Base Salary & Variable Incentives
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Base Salary Payout</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={payrollForm.baseSalary}
                      onChange={(e) => setPayrollForm({ ...payrollForm, baseSalary: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Overtime Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={payrollForm.overtimeAmount}
                      onChange={(e) => setPayrollForm({ ...payrollForm, overtimeAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Food Incentive</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={payrollForm.foodIncentive}
                      onChange={(e) => setPayrollForm({ ...payrollForm, foodIncentive: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-medium text-slate-700 dark:text-slate-300">
                        Fuel Incentive (PKR)
                      </label>
                      {selectedEmp?.defaultFuelAllocation > 0 && (
                        <div className="flex gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setPayrollForm({ ...payrollForm, fuelIncentive: Math.round(selectedEmp.defaultFuelAllocation / 2) })}
                            className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-500"
                          >
                            50% ({formatCurrency(Math.round(selectedEmp.defaultFuelAllocation / 2))})
                          </button>
                          <button
                            type="button"
                            onClick={() => setPayrollForm({ ...payrollForm, fuelIncentive: selectedEmp.defaultFuelAllocation })}
                            className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-500"
                          >
                            100% ({formatCurrency(selectedEmp.defaultFuelAllocation)})
                          </button>
                        </div>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={payrollForm.fuelIncentive}
                      onChange={(e) => setPayrollForm({ ...payrollForm, fuelIncentive: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Installation Incentive</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={payrollForm.installationIncentive}
                      onChange={(e) => setPayrollForm({ ...payrollForm, installationIncentive: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* DEDUCTIONS & ADVANCE ADJUSTMENT */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    2. Loan Advance Deductions
                  </h4>
                  {currentAdvance > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayrollForm({ ...payrollForm, advanceDeduction: Math.min(currentAdvance, grossEarnings) })}
                      className="text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
                    >
                      Max Deduct ({formatCurrency(Math.min(currentAdvance, grossEarnings))})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Advance Deduction (PKR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={currentAdvance}
                      step="any"
                      value={payrollForm.advanceDeduction}
                      onChange={(e) => setPayrollForm({ ...payrollForm, advanceDeduction: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-amber-500/40 rounded-xl font-bold font-mono text-amber-600 dark:text-amber-400"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px]">
                    <span className="text-amber-700 dark:text-amber-300 font-medium block">Advance Balance After Payout:</span>
                    <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                      {formatCurrency(remainingAdvanceAfter)}
                    </span>
                  </div>
                </div>
              </div>

              {/* PAYMENT METHOD & COMPUTED NET PAYABLE */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Total Gross Earnings:</span>
                    <span className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                      {formatCurrency(grossEarnings)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold block">Net Payable Payout:</span>
                    <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(netPayable)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-500/20">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Disbursement Method *</label>
                    <select
                      value={payrollForm.paymentMethod}
                      onChange={(e) => setPayrollForm({ ...payrollForm, paymentMethod: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    >
                      <option value="Bank">Bank Account Transfer</option>
                      <option value="Cash">Cash in Hand</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Remarks / Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Month-end salary"
                      value={payrollForm.notes}
                      onChange={(e) => setPayrollForm({ ...payrollForm, notes: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPayrollModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payrollSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-slate-950 shadow transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{payrollSubmitting ? 'Processing Payout...' : 'Confirm & Disburse Payroll'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PAYSLIP VOUCHER PREVIEW & PRINT */}
      {payslipRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg my-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 no-print">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Official Employee Pay Slip
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Pay Slip</span>
                </button>
                <button
                  onClick={() => setPayslipRecord(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 bg-white text-slate-950 print-card" id="printable-payslip">
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                    <Zap className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h1 className="font-black text-base text-slate-900">POWER EV HUB</h1>
                    <p className="text-[10px] text-slate-600 font-medium">Employee Salary & Incentive Pay Voucher</p>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <div className="font-bold text-slate-900">Month: {formatMonthLabel(payslipRecord.monthKey)}</div>
                  <div className="text-[11px] text-slate-500">Date: {formatDateDisplay(payslipRecord.date)}</div>
                </div>
              </div>

              {/* Employee Meta */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Employee Name</span>
                  <div className="font-bold text-sm text-slate-900">{payslipRecord.employee?.name}</div>
                  <div className="text-slate-600">{payslipRecord.employee?.designation}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Disbursement Mode</span>
                  <div className="font-bold text-slate-900">{payslipRecord.paymentMethod}</div>
                  <div className="text-[11px] text-emerald-700 font-bold">Status: Disbursed</div>
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-xs text-left border border-slate-200">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-2">Pay Component</th>
                    <th className="p-2 text-right">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2 font-medium">Base Salary Disbursed</td>
                    <td className="p-2 text-right font-mono">{formatCurrency(payslipRecord.baseSalary)}</td>
                  </tr>
                  {payslipRecord.overtimeAmount > 0 && (
                    <tr>
                      <td className="p-2 font-medium">Overtime Allowance</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(payslipRecord.overtimeAmount)}</td>
                    </tr>
                  )}
                  {payslipRecord.foodIncentive > 0 && (
                    <tr>
                      <td className="p-2 font-medium">Food Allowance / Incentive</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(payslipRecord.foodIncentive)}</td>
                    </tr>
                  )}
                  {payslipRecord.fuelIncentive > 0 && (
                    <tr>
                      <td className="p-2 font-medium">Fuel Allowance / Incentive</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(payslipRecord.fuelIncentive)}</td>
                    </tr>
                  )}
                  {payslipRecord.installationIncentive > 0 && (
                    <tr>
                      <td className="p-2 font-medium">Field Installation Incentive</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(payslipRecord.installationIncentive)}</td>
                    </tr>
                  )}
                  <tr className="bg-slate-50 font-bold">
                    <td className="p-2 text-slate-800">Total Gross Earnings</td>
                    <td className="p-2 text-right font-mono text-slate-900">{formatCurrency(payslipRecord.totalGrossEarnings)}</td>
                  </tr>
                  {payslipRecord.advanceDeduction > 0 && (
                    <tr className="text-amber-700">
                      <td className="p-2 font-medium">Less: Salary Advance Deduction</td>
                      <td className="p-2 text-right font-mono">-{formatCurrency(payslipRecord.advanceDeduction)}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-emerald-50 border-t-2 border-slate-900 text-slate-900 font-black">
                  <tr>
                    <td className="p-2.5 text-sm">Net Payable Disbursed:</td>
                    <td className="p-2.5 text-right text-base text-emerald-800 font-mono">
                      {formatCurrency(payslipRecord.netPayable)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {payslipRecord.notes && (
                <div className="text-[11px] text-slate-500 italic">
                  Notes: &ldquo;{payslipRecord.notes}&rdquo;
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-xs border-t border-slate-300">
                <div className="text-center">
                  <div className="border-b border-slate-400 pb-8 mb-1"></div>
                  <span className="font-bold text-slate-800">Authorized Signature</span>
                  <p className="text-[10px] text-slate-500">Power EV Hub Management</p>
                </div>
                <div className="text-center">
                  <div className="border-b border-slate-400 pb-8 mb-1"></div>
                  <span className="font-bold text-slate-800">Employee Signature</span>
                  <p className="text-[10px] text-slate-500">{payslipRecord.employee?.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
