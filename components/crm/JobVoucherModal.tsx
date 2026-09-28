'use client'

import React, { useState, useEffect } from 'react'
import { useApp } from '@/components/common/AppContext'
import { X, Printer, Zap, CheckCircle2, Phone, MapPin, Calendar, User, ShieldCheck } from 'lucide-react'
import { formatDateDisplay } from '@/lib/dateUtils'

export function JobVoucherModal() {
  const { voucherJobId, setVoucherJobId, formatCurrency } = useApp()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!voucherJobId) return

    setLoading(true)
    fetch(`/api/jobs/${voucherJobId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setJob(data.data)
        }
      })
      .catch((err) => console.error('Failed to load voucher:', err))
      .finally(() => setLoading(false))
  }, [voucherJobId])

  if (!voucherJobId) return null

  const handlePrint = () => {
    window.print()
  }

  const handleClose = () => {
    setVoucherJobId(null)
  }

  const voucherNo = job ? `PEV-${job.monthKey.replace('-', '')}-${String(job.sn).padStart(3, '0')}` : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all text-slate-900 dark:text-slate-100">
        {/* MODAL CONTROLS (HIDDEN ON PRINT) */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 no-print">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Work Order & Billing Voucher Preview
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Voucher</span>
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE VOUCHER SHEET */}
        {loading || !job ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading voucher...</div>
        ) : (
          <div className="p-6 sm:p-8 space-y-6 bg-white text-slate-950 print-card" id="printable-voucher">
            {/* VOUCHER HEADER */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow">
                  <Zap className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <h1 className="font-black text-xl tracking-tight text-slate-900">
                    POWER EV HUB
                  </h1>
                  <p className="text-[11px] text-slate-600 font-medium">
                    EV Charger Infrastructure, Sales & Professional Installation
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Helpline: +92 300 0000000 | Web: www.powerevhub.com
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                  Work Order / Job Sheet
                </div>
                <div className="text-sm font-black text-slate-900 mt-1">
                  Voucher: {voucherNo}
                </div>
                <div className="text-xs text-slate-600">
                  Date: {formatDateDisplay(job.date)}
                </div>
              </div>
            </div>

            {/* CLIENT & TECHNICIAN BOX */}
            <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Client Details</span>
                <div className="font-bold text-sm text-slate-900">{job.clientName}</div>
                {job.contactNo && <div className="text-slate-700">Phone: {job.contactNo}</div>}
                {job.addressArea && <div className="text-slate-700">Site: {job.addressArea}</div>}
                <div className="text-slate-500 text-[11px] mt-1">Lead Source: {job.source}</div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Job Execution Team</span>
                <div className="font-bold text-sm text-slate-900">{job.technicianName}</div>
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border border-emerald-300 bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Status: {job.payStatus} ({job.paymentMethod})</span>
                </div>
              </div>
            </div>

            {/* ITEMIZED MATERIALS & WORK STATEMENT */}
            <div>
              <table className="w-full text-xs text-left border border-slate-200">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-2">Item Description</th>
                    <th className="p-2 text-center">Quantity</th>
                    <th className="p-2 text-right">Unit Rate</th>
                    <th className="p-2 text-right">Total (Locked)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {job.cable10mmMeter > 0 && (
                    <tr>
                      <td className="p-2 font-medium">10mm 4-Core Copper Cable</td>
                      <td className="p-2 text-center">{job.cable10mmMeter} meters</td>
                      <td className="p-2 text-right">{formatCurrency(job.cable10mmUnitCost)}</td>
                      <td className="p-2 text-right font-semibold">{formatCurrency(job.cable10mmTotalCost)}</td>
                    </tr>
                  )}
                  {job.cable6mmMeter > 0 && (
                    <tr>
                      <td className="p-2 font-medium">6mm 3-Core Copper Cable</td>
                      <td className="p-2 text-center">{job.cable6mmMeter} meters</td>
                      <td className="p-2 text-right">{formatCurrency(job.cable6mmUnitCost)}</td>
                      <td className="p-2 text-right font-semibold">{formatCurrency(job.cable6mmTotalCost)}</td>
                    </tr>
                  )}
                  {job.breakerBoxQty > 0 && (
                    <tr>
                      <td className="p-2 font-medium">Distribution Enclosure / DB Breaker Box</td>
                      <td className="p-2 text-center">{job.breakerBoxQty} units</td>
                      <td className="p-2 text-right">{formatCurrency(job.breakerBoxUnitCost)}</td>
                      <td className="p-2 text-right font-semibold">{formatCurrency(job.breakerBoxTotalCost)}</td>
                    </tr>
                  )}
                  {job.earthingRodQty > 0 && (
                    <tr>
                      <td className="p-2 font-medium">Earthing Grounding Rod</td>
                      <td className="p-2 text-center">{job.earthingRodQty} units</td>
                      <td className="p-2 text-right">{formatCurrency(job.earthingRodUnitCost)}</td>
                      <td className="p-2 text-right font-semibold">{formatCurrency(job.earthingRodTotalCost)}</td>
                    </tr>
                  )}
                  {job.wpbQty > 0 && (
                    <tr>
                      <td className="p-2 font-medium">Waterproof Isolator Box (WPB)</td>
                      <td className="p-2 text-center">{job.wpbQty} units</td>
                      <td className="p-2 text-right">{formatCurrency(job.wpbUnitCost)}</td>
                      <td className="p-2 text-right font-semibold">{formatCurrency(job.wpbTotalCost)}</td>
                    </tr>
                  )}
                  {job.ninUvrQty > 0 && (
                    <tr>
                      <td className="p-2 font-medium">Under/Over Voltage Relay (NIN UVR)</td>
                      <td className="p-2 text-center">{job.ninUvrQty} units</td>
                      <td className="p-2 text-right">{formatCurrency(job.ninUvrUnitCost)}</td>
                      <td className="p-2 text-right font-semibold">{formatCurrency(job.ninUvrTotalCost)}</td>
                    </tr>
                  )}
                  {job.rcboBreakerQty > 0 && (
                    <tr>
                      <td className="p-2 font-medium">RCBO Safety Circuit Breaker</td>
                      <td className="p-2 text-center">{job.rcboBreakerQty} units</td>
                      <td className="p-2 text-right">{formatCurrency(job.rcboBreakerUnitCost)}</td>
                      <td className="p-2 text-right font-semibold">{formatCurrency(job.rcboBreakerTotalCost)}</td>
                    </tr>
                  )}
                  {job.additionalSupplyCost > 0 && (
                    <tr>
                      <td className="p-2 font-medium">{job.additionalSupplyName || 'Additional Hardware & Clamps'}</td>
                      <td className="p-2 text-center">1 lot</td>
                      <td className="p-2 text-right">{formatCurrency(job.additionalSupplyCost)}</td>
                      <td className="p-2 text-right font-semibold">{formatCurrency(job.additionalSupplyCost)}</td>
                    </tr>
                  )}
                  {job.miscExp > 0 && (
                    <tr>
                      <td className="p-2 text-slate-500">Site Logistics & Incidental Expenses</td>
                      <td className="p-2 text-center text-slate-500">1 job</td>
                      <td className="p-2 text-right text-slate-500">{formatCurrency(job.miscExp)}</td>
                      <td className="p-2 text-right text-slate-500">{formatCurrency(job.miscExp)}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={3} className="p-2 text-right text-xs">Total Material & Site Cost:</td>
                    <td className="p-2 text-right text-xs">{formatCurrency(job.totalJobCost)}</td>
                  </tr>
                  <tr className="bg-emerald-50 text-emerald-950 font-black text-sm">
                    <td colSpan={3} className="p-2 text-right">Final Invoiced Bill Amount:</td>
                    <td className="p-2 text-right">{formatCurrency(job.billAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* NOTES */}
            {job.notes && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold block text-slate-700 mb-0.5">Job Execution Notes:</span>
                <p className="text-slate-600 italic">&ldquo;{job.notes}&rdquo;</p>
              </div>
            )}

            {/* SIGNATURE BOXES */}
            <div className="grid grid-cols-2 gap-8 pt-8 text-xs border-t border-slate-300">
              <div className="text-center">
                <div className="border-b border-slate-400 pb-8 mb-1"></div>
                <span className="font-bold text-slate-800">Technician Team Lead Signature</span>
                <p className="text-[10px] text-slate-500">{job.technicianName}</p>
              </div>

              <div className="text-center">
                <div className="border-b border-slate-400 pb-8 mb-1"></div>
                <span className="font-bold text-slate-800">Client Acceptance Signature</span>
                <p className="text-[10px] text-slate-500">{job.clientName}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
