'use client'

import React from 'react'
import { useApp } from '@/components/common/AppContext'
import { Users, Target, CheckCircle2, TrendingUp } from 'lucide-react'

interface SourceItem {
  source: string
  count: number
  revenue: number
  grossProfit: number
  percentageOfRevenue: number
}

interface TechnicianItem {
  technician: string
  count: number
  revenue: number
  grossProfit: number
  paidCount: number
  avgRevenuePerJob: number
}

export function AnalyticsCharts({
  sources = [],
  technicians = [],
}: {
  sources?: SourceItem[]
  technicians?: TechnicianItem[]
}) {
  const { formatCurrency } = useApp()

  const maxSourceRev = Math.max(...sources.map((s) => s.revenue), 1)
  const maxTechCount = Math.max(...technicians.map((t) => t.count), 1)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* SOURCE ANALYTICS CARD */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-500" />
              Source Channel Performance
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Installation volume & revenue by lead source
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            {sources.length} Channels
          </span>
        </div>

        <div className="space-y-3.5">
          {sources.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">No source records for this month.</div>
          ) : (
            sources.map((src) => {
              const widthPct = Math.min(100, Math.round((src.revenue / maxSourceRev) * 100))
              return (
                <div key={src.source} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                      {src.source}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 dark:text-slate-400">{src.count} Jobs ({src.percentageOfRevenue}%)</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(src.revenue)}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${widthPct}%` }}
                    ></div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* TECHNICIAN WORKLOAD LEADERBOARD */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              Technician Field Workload
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Installations completed & revenue generated per team
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {technicians.length} Teams
          </span>
        </div>

        <div className="space-y-3.5">
          {technicians.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">No technician assignments this month.</div>
          ) : (
            technicians.map((tech, idx) => {
              const widthPct = Math.min(100, Math.round((tech.count / maxTechCount) * 100))
              return (
                <div key={tech.technician} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[11px]">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {tech.technician}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {tech.count} Installations
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(tech.revenue)}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${widthPct}%` }}
                    ></div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
