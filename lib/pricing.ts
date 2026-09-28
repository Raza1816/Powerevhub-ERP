import { prisma } from './prisma'

export interface ActiveUnitRates {
  cable16mmRate: number
  cable10mmRate: number
  cable6mmRate: number
  breakerBoxRate: number
  earthingRodRate: number
  wpbRate: number
  ninUvrRate: number
  rcboBreakerRate: number
}

// Default standard rates if database table not yet populated (cost only, no selling rate markup)
export const DEFAULT_UNIT_RATES: Record<string, { rate: number; name: string; unit: string }> = {
  cable_16mm: { rate: 420, name: '16mm 4-Core Copper Cable', unit: 'meter' },
  cable_10mm: { rate: 250, name: '10mm Cable', unit: 'meter' },
  cable_6mm: { rate: 180, name: '6mm Cable', unit: 'meter' },
  breaker_box: { rate: 4500, name: 'DB Breaker Box', unit: 'unit' },
  earthing_rod: { rate: 3500, name: 'Earthing Rod', unit: 'unit' },
  wpb: { rate: 1500, name: 'WPB Box', unit: 'unit' },
  nin_uvr: { rate: 3800, name: 'NIN UVR', unit: 'unit' },
  rcbo_breaker: { rate: 3200, name: 'RCBO Breaker', unit: 'unit' },
}

/**
 * Fetch the currently active global unit rates from database.
 * Used when creating NEW jobs.
 */
export async function getActiveUnitRates(): Promise<ActiveUnitRates> {
  const rates = await prisma.unitRate.findMany({
    where: { active: true },
  })

  let cable16mmRate = DEFAULT_UNIT_RATES.cable_16mm.rate
  let cable10mmRate = DEFAULT_UNIT_RATES.cable_10mm.rate
  let cable6mmRate = DEFAULT_UNIT_RATES.cable_6mm.rate
  let breakerBoxRate = DEFAULT_UNIT_RATES.breaker_box.rate
  let earthingRodRate = DEFAULT_UNIT_RATES.earthing_rod.rate
  let wpbRate = DEFAULT_UNIT_RATES.wpb.rate
  let ninUvrRate = DEFAULT_UNIT_RATES.nin_uvr.rate
  let rcboBreakerRate = DEFAULT_UNIT_RATES.rcbo_breaker.rate

  for (const r of rates) {
    if (r.itemKey === 'cable_16mm') cable16mmRate = r.rate
    if (r.itemKey === 'cable_10mm') cable10mmRate = r.rate
    if (r.itemKey === 'cable_6mm') cable6mmRate = r.rate
    if (r.itemKey === 'breaker_box') breakerBoxRate = r.rate
    if (r.itemKey === 'earthing_rod') earthingRodRate = r.rate
    if (r.itemKey === 'wpb' || r.itemKey === 'wpb_box') wpbRate = r.rate
    if (r.itemKey === 'nin_uvr') ninUvrRate = r.rate
    if (r.itemKey === 'rcbo_breaker') rcboBreakerRate = r.rate
  }

  return {
    cable16mmRate,
    cable10mmRate,
    cable6mmRate,
    breakerBoxRate,
    earthingRodRate,
    wpbRate,
    ninUvrRate,
    rcboBreakerRate,
  }
}

export interface JobCostCalculationInput {
  cable16mmMeter?: number
  cable16mmUnitCost?: number
  cable10mmMeter?: number
  cable10mmUnitCost?: number
  cable6mmMeter?: number
  cable6mmUnitCost?: number
  breakerBoxQty?: number
  breakerBoxUnitCost?: number
  earthingRodQty?: number
  earthingRodUnitCost?: number
  wpbQty?: number
  wpbUnitCost?: number
  ninUvrQty?: number
  ninUvrUnitCost?: number
  rcboBreakerQty?: number
  rcboBreakerUnitCost?: number
  additionalSupplyCost?: number
  miscExp?: number
  billAmount?: number
}

export interface JobCostCalculationResult {
  cable16mmTotalCost: number
  cable10mmTotalCost: number
  cable6mmTotalCost: number
  breakerBoxTotalCost: number
  earthingRodTotalCost: number
  wpbTotalCost: number
  ninUvrTotalCost: number
  rcboBreakerTotalCost: number
  totalJobCost: number
  billAmount: number
  grossProfit: number
  grossProfitMargin: number
}

/**
 * Calculate itemized and total job financials based on locked unit costs.
 */
export function calculateJobCosts(input: JobCostCalculationInput): JobCostCalculationResult {
  const cable16mmMeter = Number(input.cable16mmMeter) || 0
  const cable16mmUnitCost = Number(input.cable16mmUnitCost) || 0
  const cable16mmTotalCost = Math.round(cable16mmMeter * cable16mmUnitCost * 100) / 100

  const cable10mmMeter = Number(input.cable10mmMeter) || 0
  const cable10mmUnitCost = Number(input.cable10mmUnitCost) || 0
  const cable10mmTotalCost = Math.round(cable10mmMeter * cable10mmUnitCost * 100) / 100

  const cable6mmMeter = Number(input.cable6mmMeter) || 0
  const cable6mmUnitCost = Number(input.cable6mmUnitCost) || 0
  const cable6mmTotalCost = Math.round(cable6mmMeter * cable6mmUnitCost * 100) / 100

  const breakerBoxQty = Number(input.breakerBoxQty) || 0
  const breakerBoxUnitCost = Number(input.breakerBoxUnitCost) || 0
  const breakerBoxTotalCost = Math.round(breakerBoxQty * breakerBoxUnitCost * 100) / 100

  const earthingRodQty = Number(input.earthingRodQty) || 0
  const earthingRodUnitCost = Number(input.earthingRodUnitCost) || 0
  const earthingRodTotalCost = Math.round(earthingRodQty * earthingRodUnitCost * 100) / 100

  const wpbQty = Number(input.wpbQty) || 0
  const wpbUnitCost = Number(input.wpbUnitCost) || 0
  const wpbTotalCost = Math.round(wpbQty * wpbUnitCost * 100) / 100

  const ninUvrQty = Number(input.ninUvrQty) || 0
  const ninUvrUnitCost = Number(input.ninUvrUnitCost) || 0
  const ninUvrTotalCost = Math.round(ninUvrQty * ninUvrUnitCost * 100) / 100

  const rcboBreakerQty = Number(input.rcboBreakerQty) || 0
  const rcboBreakerUnitCost = Number(input.rcboBreakerUnitCost) || 0
  const rcboBreakerTotalCost = Math.round(rcboBreakerQty * rcboBreakerUnitCost * 100) / 100

  const additionalSupplyCost = Number(input.additionalSupplyCost) || 0
  const miscExp = Number(input.miscExp) || 0

  const totalJobCost = Math.round(
    (cable16mmTotalCost +
      cable10mmTotalCost +
      cable6mmTotalCost +
      breakerBoxTotalCost +
      earthingRodTotalCost +
      wpbTotalCost +
      ninUvrTotalCost +
      rcboBreakerTotalCost +
      additionalSupplyCost +
      miscExp) *
      100
  ) / 100

  const billAmount = Number(input.billAmount) || 0
  const grossProfit = Math.round((billAmount - totalJobCost) * 100) / 100
  const grossProfitMargin = billAmount > 0 ? Math.round((grossProfit / billAmount) * 10000) / 100 : 0

  return {
    cable16mmTotalCost,
    cable10mmTotalCost,
    cable6mmTotalCost,
    breakerBoxTotalCost,
    earthingRodTotalCost,
    wpbTotalCost,
    ninUvrTotalCost,
    rcboBreakerTotalCost,
    totalJobCost,
    billAmount,
    grossProfit,
    grossProfitMargin,
  }
}

/**
 * Auto-increments serial number (Sn.) per job within the active month,
 * resetting to 1 at the start of each calendar month.
 */
export async function getNextMonthlySn(monthKey: string): Promise<number> {
  const latestJob = await prisma.crmJob.findFirst({
    where: { monthKey },
    orderBy: { sn: 'desc' },
    select: { sn: true },
  })

  if (!latestJob || !latestJob.sn) {
    return 1
  }

  return latestJob.sn + 1
}
