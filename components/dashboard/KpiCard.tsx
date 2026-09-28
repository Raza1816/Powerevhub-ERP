'use client'

import React from 'react'
import { LucideIcon, HelpCircle } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  colorClass?: string
  trend?: string
  trendType?: 'positive' | 'negative' | 'neutral'
  formulaTooltip?: string
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorClass = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  trend,
  trendType = 'positive',
  formulaTooltip,
}: KpiCardProps) {
  return (
    <div className="relative group p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2a] shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>{title}</span>
            {formulaTooltip && (
              <div className="relative group/tool inline-block">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tool:block w-48 p-2 text-[11px] leading-snug bg-slate-900 text-slate-100 rounded-lg shadow-xl border border-slate-700 z-50 pointer-events-none">
                  {formulaTooltip}
                </div>
              </div>
            )}
          </div>
          
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1 tracking-tight">
            {value}
          </div>

          {subtitle && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </div>
          )}

          {trend && (
            <div className={`text-xs font-medium mt-1.5 flex items-center gap-1 ${
              trendType === 'positive' ? 'text-emerald-600 dark:text-emerald-400' :
              trendType === 'negative' ? 'text-rose-600 dark:text-rose-400' :
              'text-slate-500 dark:text-slate-400'
            }`}>
              <span>{trend}</span>
            </div>
          )}
        </div>

        <div className={`p-3 rounded-xl border ${colorClass} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
