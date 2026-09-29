import { prisma } from './prisma'
import { getMonthKeyFromDate } from './dateUtils'

export interface InventoryItemDefinition {
  key: string
  name: string
  unit: string
  category: string
  lowStockThreshold: number
  crmField?: string
}

export const STANDARD_INVENTORY_ITEMS: InventoryItemDefinition[] = [
  { key: 'cable_16mm', name: '16mm 4-Core Copper Cable', unit: 'meter', category: 'Cables', lowStockThreshold: 100, crmField: 'cable16mmMeter' },
  { key: 'cable_10mm', name: '10mm Cable', unit: 'meter', category: 'Cables', lowStockThreshold: 150, crmField: 'cable10mmMeter' },
  { key: 'cable_6mm', name: '6mm Cable', unit: 'meter', category: 'Cables', lowStockThreshold: 200, crmField: 'cable6mmMeter' },
  { key: 'breaker_box', name: 'DB Box (Breaker Box)', unit: 'unit', category: 'Hardware', lowStockThreshold: 10, crmField: 'breakerBoxQty' },
  { key: 'earthing_rod', name: 'Earthing Rod', unit: 'unit', category: 'Hardware', lowStockThreshold: 15, crmField: 'earthingRodQty' },
  { key: 'wpb', name: 'WPB (Waterproof Box)', unit: 'unit', category: 'Hardware', lowStockThreshold: 15, crmField: 'wpbQty' },
  { key: 'nin_uvr', name: 'NIN UVR (Voltage Relay)', unit: 'unit', category: 'Electrical', lowStockThreshold: 10, crmField: 'ninUvrQty' },
  { key: 'rcbo_breaker', name: 'RCBO Breaker', unit: 'unit', category: 'Electrical', lowStockThreshold: 12, crmField: 'rcboBreakerQty' },
]

export const DEFAULT_OPENING_STOCKS: Record<string, { Karachi: number; Lahore: number }> = {
  cable_16mm: { Karachi: 100, Lahore: 50 },
  cable_10mm: { Karachi: 500, Lahore: 180 },
  cable_6mm: { Karachi: 350, Lahore: 180 },
  breaker_box: { Karachi: 30, Lahore: 10 },
  earthing_rod: { Karachi: 40, Lahore: 10 },
  wpb: { Karachi: 45, Lahore: 10 },
  nin_uvr: { Karachi: 25, Lahore: 10 },
  rcbo_breaker: { Karachi: 30, Lahore: 10 },
}

/**
 * Normalizes any raw item name or key variant to its standard canonical key, display name, and unit.
 * Maps variants like "10mm 4-Core Copper Cable" cleanly to "10mm Cable" (key: "cable_10mm").
 */
export function normalizeInventoryItem(rawInput: string | undefined | null): { key: string; name: string; unit: string } {
  if (!rawInput) {
    return { key: 'unknown', name: 'Unknown Item', unit: 'unit' }
  }
  const str = rawInput.toLowerCase().trim()

  // 16mm Cable check (must precede 10mm / 6mm / generic cable)
  if (str.includes('16mm') || str === 'cable_16mm') {
    return { key: 'cable_16mm', name: '16mm 4-Core Copper Cable', unit: 'meter' }
  }
  // 10mm Cable check (covers "10mm 4-Core Copper Cable", "10mm 1-Core Copper Cable", "10mm Copper Cable (250m)", etc.)
  if (str.includes('10mm') || str === 'cable_10mm') {
    return { key: 'cable_10mm', name: '10mm Cable', unit: 'meter' }
  }
  // 6mm Cable check (covers "6mm Cable", "6mm 1-Core Copper Cable", etc.)
  if (str.includes('6mm') || str === 'cable_6mm') {
    return { key: 'cable_6mm', name: '6mm Cable', unit: 'meter' }
  }
  // DB Breaker Box check (covers "DB Box (Breaker Box)", "DB Breaker Box", "Breaker Box DB", etc.)
  if (
    str.includes('breaker box') ||
    str.includes('db box') ||
    str.includes('db breaker') ||
    str.includes('breaker_box') ||
    (str.includes('box') && str.includes('db'))
  ) {
    return { key: 'breaker_box', name: 'DB Box (Breaker Box)', unit: 'unit' }
  }
  // Earthing Rod check
  if (str.includes('earthing') || str.includes('earth rod') || str === 'earthing_rod') {
    return { key: 'earthing_rod', name: 'Earthing Rod', unit: 'unit' }
  }
  // Waterproof Box (WPB) check
  if (str.includes('wpb') || str.includes('waterproof') || str === 'wpb') {
    return { key: 'wpb', name: 'WPB (Waterproof Box)', unit: 'unit' }
  }
  // NIN UVR (Voltage Relay) check
  if (str.includes('nin') || str.includes('uvr') || str.includes('voltage relay') || str === 'nin_uvr') {
    return { key: 'nin_uvr', name: 'NIN UVR (Voltage Relay)', unit: 'unit' }
  }
  // RCBO Breaker check
  if (str.includes('rcbo') || str === 'rcbo_breaker') {
    return { key: 'rcbo_breaker', name: 'RCBO Breaker', unit: 'unit' }
  }

  // Exact fallback match against STANDARD_INVENTORY_ITEMS
  const exact = STANDARD_INVENTORY_ITEMS.find(
    (i) => i.key === rawInput || i.name.toLowerCase() === str
  )
  if (exact) {
    return { key: exact.key, name: exact.name, unit: exact.unit }
  }

  return { key: rawInput.replace(/\s+/g, '_').toLowerCase(), name: rawInput, unit: 'unit' }
}

/**
 * Re-aggregates and synchronizes inventory usage and restocks for a given date.
 */
export async function syncInventoryForDate(dateStr: string, targetBranch?: string) {
  if (!dateStr) return
  const monthKey = getMonthKeyFromDate(dateStr)
  const branches = targetBranch ? [targetBranch] : ['Karachi', 'Lahore']

  for (const branch of branches) {
    // 1. Fetch CRM jobs for this date and branch to aggregate usage
    const jobs = await prisma.crmJob.findMany({
      where: { date: dateStr, branch },
    })

    // 2. Fetch Vendor purchases for this date and branch to aggregate restocks
    const purchases = await prisma.vendorPurchase.findMany({
      where: { date: dateStr, branch },
    })

    for (const item of STANDARD_INVENTORY_ITEMS) {
      try {
        let usedQty = 0
        jobs.forEach((job: any) => {
          if (item.key === 'cable_16mm') usedQty += Number(job.cable16mmMeter) || 0
          else if (item.key === 'cable_10mm') usedQty += Number(job.cable10mmMeter) || 0
          else if (item.key === 'cable_6mm') usedQty += Number(job.cable6mmMeter) || 0
          else if (item.key === 'breaker_box') usedQty += Number(job.breakerBoxQty) || 0
          else if (item.key === 'earthing_rod') usedQty += Number(job.earthingRodQty) || 0
          else if (item.key === 'wpb') usedQty += Number(job.wpbQty) || 0
          else if (item.key === 'nin_uvr') usedQty += Number(job.ninUvrQty) || 0
          else if (item.key === 'rcbo_breaker') usedQty += Number(job.rcboBreakerQty) || 0
        })

        let restockQty = 0
        const matchedPurchases: Array<{ vendorName: string; quantity: number }> = []

        purchases.forEach((p) => {
          const norm = normalizeInventoryItem(p.itemKey || p.item)
          if (norm.key === item.key) {
            const qty = Number(p.quantity) || 0
            restockQty += qty
            matchedPurchases.push({ vendorName: p.vendorName || 'Vendor', quantity: qty })
          }
        })

        // Check for manual opening stock adjustment on this date
        const existingEntry = await prisma.inventoryLedger.findFirst({
          where: {
            date: dateStr,
            itemKey: item.key,
            branch,
          },
        })

        let openingStock: number
        const isManualAdjustment = existingEntry && existingEntry.notes && (
          existingEntry.notes.toLowerCase().includes('op ') ||
          existingEntry.notes.toLowerCase().includes('opening') ||
          existingEntry.notes.toLowerCase().includes('baseline') ||
          existingEntry.notes.toLowerCase().includes('adjustment')
        )

        if (isManualAdjustment) {
          openingStock = existingEntry.openingStock
        } else {
          // Resolve opening stock from immediate prior ledger entry
          const prevEntry = await prisma.inventoryLedger.findFirst({
            where: {
              itemKey: item.key,
              branch,
              date: { lt: dateStr },
            },
            orderBy: { date: 'desc' },
          })
          if (prevEntry) {
            openingStock = prevEntry.closingStock
          } else {
            // Default baseline if no prior entry exists
            const branchDefaults = DEFAULT_OPENING_STOCKS[item.key]
            openingStock = branchDefaults ? (branchDefaults[branch as 'Karachi' | 'Lahore'] || 0) : 0
          }
        }

        const closingStock = Math.round((openingStock + restockQty - usedQty) * 100) / 100

        // Build descriptive ledger note
        let ledgerNotes = ''
        if (matchedPurchases.length > 0) {
          if (matchedPurchases.length === 1) {
            ledgerNotes = `Restock via ${matchedPurchases[0].vendorName}`
          } else {
            const vendors = matchedPurchases.map((mp) => `${mp.vendorName} (+${mp.quantity})`).join(', ')
            ledgerNotes = `Restock via ${vendors}`
          }
          if (usedQty > 0) {
            ledgerNotes += ` | CRM Installation Deductions (-${usedQty})`
          }
        } else if (usedQty > 0) {
          ledgerNotes = `CRM Installation Deductions (-${usedQty})`
        } else if (isManualAdjustment) {
          ledgerNotes = existingEntry.notes || `Opening stock set for ${branch} warehouse`
        } else {
          ledgerNotes = 'Stock balance carryover'
        }

        // If no movement and zero opening, delete orphaned empty record if present
        if (usedQty === 0 && restockQty === 0 && openingStock === 0 && !isManualAdjustment) {
          if (existingEntry) {
            await prisma.inventoryLedger.delete({ where: { id: existingEntry.id } })
          }
          continue
        }

        // Upsert ledger entry
        await prisma.inventoryLedger.upsert({
          where: {
            date_itemKey_branch: {
              date: dateStr,
              itemKey: item.key,
              branch,
            },
          },
          update: {
            openingStock,
            usedQty,
            restockQty,
            closingStock,
            monthKey,
            notes: ledgerNotes,
          },
          create: {
            date: dateStr,
            monthKey,
            itemName: item.name,
            itemKey: item.key,
            unit: item.unit,
            branch,
            openingStock,
            usedQty,
            restockQty,
            closingStock,
            notes: ledgerNotes,
          },
        })
      } catch (itemErr: any) {
        console.error(`[syncInventory] Failed for item ${item.key} / branch ${branch} on ${dateStr}:`, itemErr.message)
      }
    }
  }
}

/**
 * Synchronizes the entire inventory ledger chronologically across all dates with purchases, jobs, or adjustments.
 * Cascades closing balances to subsequent dates, ensuring 100% mathematical integrity.
 */
export async function syncAllInventory(targetBranch?: string) {
  const branches = targetBranch && targetBranch !== 'All' ? [targetBranch] : ['Karachi', 'Lahore']

  for (const branch of branches) {
    // Collect all distinct dates from CRM jobs, Vendor purchases, and manual ledger adjustments
    const [jobDates, purchaseDates, ledgerDates] = await Promise.all([
      prisma.crmJob.findMany({
        where: { branch },
        select: { date: true },
        distinct: ['date'],
      }),
      prisma.vendorPurchase.findMany({
        where: { branch },
        select: { date: true },
        distinct: ['date'],
      }),
      prisma.inventoryLedger.findMany({
        where: { branch },
        select: { date: true },
        distinct: ['date'],
      }),
    ])

    const allDatesSet = new Set<string>()
    jobDates.forEach((j) => j.date && allDatesSet.add(j.date))
    purchaseDates.forEach((p) => p.date && allDatesSet.add(p.date))
    ledgerDates.forEach((l) => l.date && allDatesSet.add(l.date))

    const sortedDates = Array.from(allDatesSet).sort()

    // For each item, keep a running closing balance starting from the baseline or first adjustment
    for (const item of STANDARD_INVENTORY_ITEMS) {
      let runningStock: number | null = null

      for (const dateStr of sortedDates) {
        const monthKey = getMonthKeyFromDate(dateStr)

        // 1. Calculate CRM usage for this item on dateStr
        const jobs = await prisma.crmJob.findMany({
          where: { date: dateStr, branch },
        })
        let usedQty = 0
        jobs.forEach((job: any) => {
          if (item.key === 'cable_16mm') usedQty += Number(job.cable16mmMeter) || 0
          else if (item.key === 'cable_10mm') usedQty += Number(job.cable10mmMeter) || 0
          else if (item.key === 'cable_6mm') usedQty += Number(job.cable6mmMeter) || 0
          else if (item.key === 'breaker_box') usedQty += Number(job.breakerBoxQty) || 0
          else if (item.key === 'earthing_rod') usedQty += Number(job.earthingRodQty) || 0
          else if (item.key === 'wpb') usedQty += Number(job.wpbQty) || 0
          else if (item.key === 'nin_uvr') usedQty += Number(job.ninUvrQty) || 0
          else if (item.key === 'rcbo_breaker') usedQty += Number(job.rcboBreakerQty) || 0
        })

        // 2. Calculate Restock from Vendor Purchases for this item on dateStr
        const purchases = await prisma.vendorPurchase.findMany({
          where: { date: dateStr, branch },
        })
        let restockQty = 0
        const matchedPurchases: Array<{ vendorName: string; quantity: number }> = []

        purchases.forEach((p) => {
          const norm = normalizeInventoryItem(p.itemKey || p.item)
          if (norm.key === item.key) {
            const qty = Number(p.quantity) || 0
            restockQty += qty
            matchedPurchases.push({ vendorName: p.vendorName || 'Vendor', quantity: qty })
          }
        })

        // 3. Check for existing ledger entry & manual opening stock adjustment
        const existingEntry = await prisma.inventoryLedger.findFirst({
          where: { date: dateStr, itemKey: item.key, branch },
        })

        const isManualAdjustment = existingEntry && existingEntry.notes && (
          existingEntry.notes.toLowerCase().includes('op ') ||
          existingEntry.notes.toLowerCase().includes('opening') ||
          existingEntry.notes.toLowerCase().includes('baseline') ||
          existingEntry.notes.toLowerCase().includes('adjustment')
        )

        let openingStock: number
        if (isManualAdjustment) {
          openingStock = existingEntry.openingStock
        } else if (runningStock !== null) {
          openingStock = runningStock
        } else {
          // Check if there was any prior entry in DB
          const prevDbEntry = await prisma.inventoryLedger.findFirst({
            where: { itemKey: item.key, branch, date: { lt: dateStr } },
            orderBy: { date: 'desc' },
          })
          if (prevDbEntry) {
            openingStock = prevDbEntry.closingStock
          } else {
            const branchDefaults = DEFAULT_OPENING_STOCKS[item.key]
            openingStock = branchDefaults ? (branchDefaults[branch as 'Karachi' | 'Lahore'] || 0) : 0
          }
        }

        const closingStock = Math.round((openingStock + restockQty - usedQty) * 100) / 100
        runningStock = closingStock

        // If no movement and zero opening, delete orphaned record if present
        if (usedQty === 0 && restockQty === 0 && openingStock === 0 && !isManualAdjustment) {
          if (existingEntry) {
            await prisma.inventoryLedger.delete({ where: { id: existingEntry.id } })
          }
          continue
        }

        // Build descriptive notes
        let ledgerNotes = ''
        if (matchedPurchases.length > 0) {
          if (matchedPurchases.length === 1) {
            ledgerNotes = `Restock via ${matchedPurchases[0].vendorName}`
          } else {
            const vendors = matchedPurchases.map((mp) => `${mp.vendorName} (+${mp.quantity})`).join(', ')
            ledgerNotes = `Restock via ${vendors}`
          }
          if (usedQty > 0) {
            ledgerNotes += ` | CRM Installation Deductions (-${usedQty})`
          }
        } else if (usedQty > 0) {
          ledgerNotes = `CRM Installation Deductions (-${usedQty})`
        } else if (isManualAdjustment) {
          ledgerNotes = existingEntry.notes || `Opening stock set for ${branch} warehouse`
        } else {
          ledgerNotes = 'Stock balance carryover'
        }

        await prisma.inventoryLedger.upsert({
          where: {
            date_itemKey_branch: {
              date: dateStr,
              itemKey: item.key,
              branch,
            },
          },
          update: {
            openingStock,
            usedQty,
            restockQty,
            closingStock,
            monthKey,
            notes: ledgerNotes,
          },
          create: {
            date: dateStr,
            monthKey,
            itemName: item.name,
            itemKey: item.key,
            unit: item.unit,
            branch,
            openingStock,
            usedQty,
            restockQty,
            closingStock,
            notes: ledgerNotes,
          },
        })
      }
    }
  }
}

/**
 * Returns the current warehouse stock summary across all standard items.
 * Computes: availableStock = openingStock + totalRestocked - totalCrmUsed
 * Supports branch-specific filtering: "Karachi", "Lahore", or "All" (consolidated).
 */
export async function getCurrentStockLevels(branch: string = 'All') {
  const items = STANDARD_INVENTORY_ITEMS
  const results = []

  // Fetch all vendor purchases and CRM jobs once for high performance
  const [allPurchases, allJobs] = await Promise.all([
    prisma.vendorPurchase.findMany(),
    prisma.crmJob.findMany(),
  ])

  for (const item of items) {
    // 1. Calculate Karachi stock
    const karachiPurchases = allPurchases.filter((p) => {
      if (p.branch !== 'Karachi') return false
      const norm = normalizeInventoryItem(p.itemKey || p.item)
      return norm.key === item.key
    })
    const karachiRestocked = karachiPurchases.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0)

    let karachiCrmUsed = 0
    allJobs.forEach((job: any) => {
      if (job.branch === 'Karachi' && item.crmField) {
        karachiCrmUsed += Number(job[item.crmField]) || 0
      }
    })

    // Resolve Karachi baseline opening stock (preserving recorded manual adjustment if any)
    const firstKarachiLedger = await prisma.inventoryLedger.findFirst({
      where: { itemKey: item.key, branch: 'Karachi' },
      orderBy: { date: 'asc' },
    })
    const karachiOpening = firstKarachiLedger
      ? firstKarachiLedger.openingStock
      : (DEFAULT_OPENING_STOCKS[item.key]?.Karachi || 0)

    const karachiStock = Math.round((karachiOpening + karachiRestocked - karachiCrmUsed) * 100) / 100

    // 2. Calculate Lahore stock
    const lahorePurchases = allPurchases.filter((p) => {
      if (p.branch !== 'Lahore') return false
      const norm = normalizeInventoryItem(p.itemKey || p.item)
      return norm.key === item.key
    })
    const lahoreRestocked = lahorePurchases.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0)

    let lahoreCrmUsed = 0
    allJobs.forEach((job: any) => {
      if (job.branch === 'Lahore' && item.crmField) {
        lahoreCrmUsed += Number(job[item.crmField]) || 0
      }
    })

    const firstLahoreLedger = await prisma.inventoryLedger.findFirst({
      where: { itemKey: item.key, branch: 'Lahore' },
      orderBy: { date: 'asc' },
    })
    const lahoreOpening = firstLahoreLedger
      ? firstLahoreLedger.openingStock
      : (DEFAULT_OPENING_STOCKS[item.key]?.Lahore || 0)

    const lahoreStock = Math.round((lahoreOpening + lahoreRestocked - lahoreCrmUsed) * 100) / 100

    // 3. Resolve active branch selection
    let currentQty: number
    let openingStock: number
    let totalRestocked: number
    let totalCrmUsed: number

    if (branch === 'Karachi') {
      currentQty = karachiStock
      openingStock = karachiOpening
      totalRestocked = karachiRestocked
      totalCrmUsed = karachiCrmUsed
    } else if (branch === 'Lahore') {
      currentQty = lahoreStock
      openingStock = lahoreOpening
      totalRestocked = lahoreRestocked
      totalCrmUsed = lahoreCrmUsed
    } else {
      currentQty = Math.round((karachiStock + lahoreStock) * 100) / 100
      openingStock = Math.round((karachiOpening + lahoreOpening) * 100) / 100
      totalRestocked = Math.round((karachiRestocked + lahoreRestocked) * 100) / 100
      totalCrmUsed = Math.round((karachiCrmUsed + lahoreCrmUsed) * 100) / 100
    }

    const threshold = branch === 'All'
      ? item.lowStockThreshold
      : Math.round(item.lowStockThreshold / 2)
    const isLowStock = currentQty <= threshold

    // Get latest activity date
    const latestLedger = await prisma.inventoryLedger.findFirst({
      where: branch === 'All' ? { itemKey: item.key } : { itemKey: item.key, branch },
      orderBy: { date: 'desc' },
    })
    const lastUpdatedDate = latestLedger?.date ?? 'N/A'

    results.push({
      ...item,
      currentStock: currentQty,
      karachiStock,
      lahoreStock,
      openingStock,
      totalRestocked,
      totalCrmUsed,
      branch,
      lastUpdatedDate,
      isLowStock,
    })
  }

  return results
}

