export const FOUNDATIONAL_CYCLE = '2026-10'

export function getCurrentActiveMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const current = `${year}-${month}`
  return current < FOUNDATIONAL_CYCLE ? FOUNDATIONAL_CYCLE : current
}

export function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const current = `${year}-${month}-${day}`
  return current < `${FOUNDATIONAL_CYCLE}-01` ? `${FOUNDATIONAL_CYCLE}-01` : current
}

export function getMonthKeyFromDate(dateStr: string): string {
  if (!dateStr) return getCurrentActiveMonth()
  const parts = dateStr.split('-')
  if (parts.length >= 2) {
    const key = `${parts[0]}-${parts[1]}`
    return key < FOUNDATIONAL_CYCLE ? FOUNDATIONAL_CYCLE : key
  }
  return getCurrentActiveMonth()
}

/**
 * Strict read-only mode is disabled across all concluded cycles.
 * Users with admin role retain full CRUD permissions across historical cycles.
 */
export function isMonthArchived(_monthKey: string): boolean {
  return false
}

export function isPastCycle(monthKey: string): boolean {
  return monthKey < getCurrentActiveMonth()
}

export function formatMonthLabel(monthKey: string): string {
  if (!monthKey || !monthKey.includes('-')) return monthKey
  const [year, month] = monthKey.split('-')
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    if (!y || !m || !d) return dateStr
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return dateStr
  }
}

export function getAvailableMonthOptions(activeMonth: string, extraMonths: string[] = []): { value: string; label: string; isArchived: boolean }[] {
  const set = new Set<string>()
  const safeActiveMonth = activeMonth < FOUNDATIONAL_CYCLE ? FOUNDATIONAL_CYCLE : activeMonth
  set.add(safeActiveMonth)
  
  // Add upcoming 3 months, only if >= FOUNDATIONAL_CYCLE
  const [actYear, actMonth] = safeActiveMonth.split('-').map(Number)
  for (let i = 0; i <= 3; i++) {
    const d = new Date(actYear, actMonth - 1 + i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const key = `${y}-${m}`
    if (key >= FOUNDATIONAL_CYCLE) {
      set.add(key)
    }
  }

  extraMonths.forEach(m => {
    if (m && m.match(/^\d{4}-\d{2}$/) && m >= FOUNDATIONAL_CYCLE) {
      set.add(m)
    }
  })

  const sorted = Array.from(set).sort().reverse()

  return sorted.map(monthKey => ({
    value: monthKey,
    label: formatMonthLabel(monthKey),
    isArchived: false,
  }))
}

