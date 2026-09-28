export function getCurrentActiveMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getMonthKeyFromDate(dateStr: string): string {
  if (!dateStr) return getCurrentActiveMonth()
  const parts = dateStr.split('-')
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`
  }
  return getCurrentActiveMonth()
}

export function isMonthArchived(monthKey: string): boolean {
  const activeMonth = getCurrentActiveMonth()
  return monthKey < activeMonth
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
  set.add(activeMonth)
  
  // Add previous 6 months and next 2 months
  const [actYear, actMonth] = activeMonth.split('-').map(Number)
  for (let i = -6; i <= 2; i++) {
    const d = new Date(actYear, actMonth - 1 + i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    set.add(`${y}-${m}`)
  }

  extraMonths.forEach(m => {
    if (m && m.match(/^\d{4}-\d{2}$/)) set.add(m)
  })

  const sorted = Array.from(set).sort().reverse()

  return sorted.map(monthKey => ({
    value: monthKey,
    label: formatMonthLabel(monthKey),
    isArchived: monthKey < activeMonth,
  }))
}
