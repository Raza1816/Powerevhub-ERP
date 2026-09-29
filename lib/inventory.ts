import { prisma } from './prisma'
import { getMonthKeyFromDate, getCurrentActiveMonth } from './dateUtils'

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
  cable_16mm: { Karachi: 0, Lahore: 0 },
  cable_10mm: { Karachi: 0, Lahore: 0 },
  cable_6mm: { Karachi: 0, Lahore: 0 },
  breaker_box: { Karachi: 0, Lahore: 0 },
  earthing_rod: { Karachi: 0, Lahore: 0 },
  wpb: { Karachi: 0, Lahore: 0 },
  nin_uvr: { Karachi: 0, Lahore: 0 },
  rcbo_breaker: { Karachi: 0, Lahore: 0 },
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

let columnsVerified = false

export async function ensureInventoryLedgerColumns(clientOrTx?: any) {
  if (columnsVerified) return
  const client = clientOrTx || prisma
  try {
    await client.$executeRawUnsafe(`ALTER TABLE "InventoryLedger" ADD COLUMN "referenceId" TEXT;`)
  } catch {
    // Column already exists in SQLite, safe to ignore
  }
  try {
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InventoryLedger_referenceId_idx" ON "InventoryLedger"("referenceId");`)
  } catch {
    // Index already exists, safe to ignore
  }
  columnsVerified = true
}

/**
 * Synchronizes a single date, itemKey, and branch, then cascades closing balances to all subsequent dates.
 * Uses primary-key update/create — completely avoiding SQLite ON CONFLICT clause errors.
 */
export async function syncInventoryDateAndCascade(
  dateStr: string,
  itemKey: string,
  branch: string,
  txClient?: any,
  explicitReferenceId?: string
) {
  const client = txClient || prisma
  await ensureInventoryLedgerColumns(client)
  const monthKey = getMonthKeyFromDate(dateStr)
  const itemDef = STANDARD_INVENTORY_ITEMS.find((i) => i.key === itemKey)
  const itemName = itemDef ? itemDef.name : itemKey
  const unit = itemDef ? itemDef.unit : 'unit'

  // 1. Fetch CRM jobs on this date
  const jobs = await client.crmJob.findMany({
    where: { date: dateStr, branch },
  })
  let usedQty = 0
  if (itemDef?.crmField) {
    jobs.forEach((j: any) => {
      usedQty += Number(j[itemDef.crmField!]) || 0
    })
  }

  // 2. Fetch vendor purchases on this date
  const purchases = await client.vendorPurchase.findMany({
    where: { date: dateStr, branch },
  })
  let restockQty = 0
  const vendors: Array<{ vendor: string; qty: number; id: string }> = []
  purchases.forEach((p: any) => {
    const norm = normalizeInventoryItem(p.itemKey || p.item)
    if (norm.key === itemKey) {
      const q = Number(p.quantity) || 0
      restockQty += q
      vendors.push({ vendor: p.vendorName || 'Vendor', qty: q, id: p.id })
    }
  })

  // 3. Find existing ledger entry on this date
  const existing = await client.inventoryLedger.findFirst({
    where: { date: dateStr, itemKey, branch },
  })

  const isManualAdjustment = existing && existing.notes && (
    existing.notes.toLowerCase().includes('op ') ||
    existing.notes.toLowerCase().includes('opening') ||
    existing.notes.toLowerCase().includes('baseline') ||
    existing.notes.toLowerCase().includes('adjustment')
  )

  let openingStock: number
  if (isManualAdjustment) {
    openingStock = existing.openingStock
  } else {
    const prevEntry = await client.inventoryLedger.findFirst({
      where: { itemKey, branch, date: { lt: dateStr } },
      orderBy: { date: 'desc' },
    })
    openingStock = prevEntry ? prevEntry.closingStock : 0
  }

  const closingStock = Math.round((openingStock + restockQty - usedQty) * 100) / 100

  // Resolve referenceId from purchase or explicit parameter
  const resolvedRefId = explicitReferenceId || (vendors.length === 1 ? vendors[0].id : (vendors.length > 1 ? vendors.map((v) => v.id).join(',') : (existing?.referenceId || null)))

  // If no activity and zero opening, clean up entry
  if (usedQty === 0 && restockQty === 0 && openingStock === 0 && !isManualAdjustment) {
    if (existing) {
      await client.inventoryLedger.delete({ where: { id: existing.id } })
    }
  } else {
    // Build descriptive notes
    let ledgerNotes = ''
    if (vendors.length === 1) {
      ledgerNotes = `Restock via ${vendors[0].vendor}`
    } else if (vendors.length > 1) {
      ledgerNotes = `Restock via ${vendors.map((v) => `${v.vendor} (+${v.qty})`).join(', ')}`
    }
    if (usedQty > 0) {
      ledgerNotes = ledgerNotes
        ? `${ledgerNotes} | CRM Installation Deductions (-${usedQty})`
        : `CRM Installation Deductions (-${usedQty})`
    } else if (isManualAdjustment) {
      ledgerNotes = existing.notes || `Opening stock set for ${branch} warehouse`
    } else if (!ledgerNotes) {
      ledgerNotes = 'Stock balance carryover'
    }

    if (existing) {
      await client.inventoryLedger.update({
        where: { id: existing.id },
        data: {
          openingStock,
          usedQty,
          restockQty,
          closingStock,
          monthKey,
          notes: ledgerNotes,
          referenceId: resolvedRefId,
        },
      })
    } else {
      await client.inventoryLedger.create({
        data: {
          date: dateStr,
          monthKey,
          itemName,
          itemKey,
          unit,
          branch,
          openingStock,
          usedQty,
          restockQty,
          closingStock,
          notes: ledgerNotes,
          referenceId: resolvedRefId,
        },
      })
    }
  }

  // 4. Cascade to all subsequent dates
  const subsequentRows = await client.inventoryLedger.findMany({
    where: { itemKey, branch, date: { gt: dateStr } },
    orderBy: { date: 'asc' },
  })

  let runningClosing = closingStock
  for (const row of subsequentRows) {
    const isRowManual = row.notes && (
      row.notes.toLowerCase().includes('op ') ||
      row.notes.toLowerCase().includes('opening') ||
      row.notes.toLowerCase().includes('baseline') ||
      row.notes.toLowerCase().includes('adjustment')
    )
    const newOpening = isRowManual ? row.openingStock : runningClosing
    const newClosing = Math.round((newOpening + row.restockQty - row.usedQty) * 100) / 100
    runningClosing = newClosing

    await client.inventoryLedger.update({
      where: { id: row.id },
      data: {
        openingStock: newOpening,
        closingStock: newClosing,
      },
    })
  }
}

/**
 * Re-aggregates and synchronizes inventory usage and restocks for a given date.
 */
export async function syncInventoryForDate(dateStr: string, targetBranch?: string) {
  if (!dateStr) return
  const branches = targetBranch ? [targetBranch] : ['Karachi', 'Lahore']

  for (const branch of branches) {
    for (const item of STANDARD_INVENTORY_ITEMS) {
      await syncInventoryDateAndCascade(dateStr, item.key, branch)
    }
  }
}

/**
 * Synchronizes the entire inventory ledger chronologically across all dates with purchases, jobs, or adjustments.
 * Cascades closing balances to subsequent dates, ensuring 100% mathematical integrity.
 * Completely SQLite-safe: uses primary key ID lookups and updates rather than compound upsert constraints.
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

    // For each item, keep a running closing balance starting from 0 (or first adjustment)
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
          openingStock = prevDbEntry ? prevDbEntry.closingStock : 0
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

        // SQLite-safe update or create by ID
        if (existingEntry) {
          await prisma.inventoryLedger.update({
            where: { id: existingEntry.id },
            data: {
              openingStock,
              usedQty,
              restockQty,
              closingStock,
              monthKey,
              notes: ledgerNotes,
            },
          })
        } else {
          await prisma.inventoryLedger.create({
            data: {
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
}

/**
 * Returns the current warehouse stock summary across all standard items.
 * Computes: Available = Opening Stock (0) + Total Restocked - Total CRM Used.
 * If no stock movements exist, all cards STRICTLY display 0 (with Karachi: 0, Lahore: 0).
 */
export async function getCurrentStockLevels(branch: string = 'All') {
  await ensureInventoryLedgerColumns()
  const items = STANDARD_INVENTORY_ITEMS
  const results = []

  // Check if any inventory ledger records exist
  const totalLedgerCount = await prisma.inventoryLedger.count()
  if (totalLedgerCount === 0) {
    // If no stock movements exist, all cards MUST strictly display 0
    for (const item of items) {
      results.push({
        ...item,
        currentStock: 0,
        karachiStock: 0,
        lahoreStock: 0,
        openingStock: 0,
        totalRestocked: 0,
        totalCrmUsed: 0,
        branch,
        lastUpdatedDate: 'N/A',
        isLowStock: true,
      })
    }
    return results
  }

  for (const item of items) {
    // 1. Calculate Karachi stock from InventoryLedger
    const latestKarachi = await prisma.inventoryLedger.findFirst({
      where: { itemKey: item.key, branch: 'Karachi' },
      orderBy: { date: 'desc' },
    })
    const earliestKarachi = await prisma.inventoryLedger.findFirst({
      where: { itemKey: item.key, branch: 'Karachi' },
      orderBy: { date: 'asc' },
    })
    const karachiOpening = earliestKarachi ? earliestKarachi.openingStock : 0

    const karachiRows = await prisma.inventoryLedger.findMany({
      where: { itemKey: item.key, branch: 'Karachi' },
      select: { restockQty: true, usedQty: true },
    })
    const karachiRestocked = karachiRows.reduce((sum, r) => sum + r.restockQty, 0)
    const karachiUsed = karachiRows.reduce((sum, r) => sum + r.usedQty, 0)
    const karachiStock = latestKarachi
      ? latestKarachi.closingStock
      : Math.round((karachiOpening + karachiRestocked - karachiUsed) * 100) / 100

    // 2. Calculate Lahore stock from InventoryLedger
    const latestLahore = await prisma.inventoryLedger.findFirst({
      where: { itemKey: item.key, branch: 'Lahore' },
      orderBy: { date: 'desc' },
    })
    const earliestLahore = await prisma.inventoryLedger.findFirst({
      where: { itemKey: item.key, branch: 'Lahore' },
      orderBy: { date: 'asc' },
    })
    const lahoreOpening = earliestLahore ? earliestLahore.openingStock : 0

    const lahoreRows = await prisma.inventoryLedger.findMany({
      where: { itemKey: item.key, branch: 'Lahore' },
      select: { restockQty: true, usedQty: true },
    })
    const lahoreRestocked = lahoreRows.reduce((sum, r) => sum + r.restockQty, 0)
    const lahoreUsed = lahoreRows.reduce((sum, r) => sum + r.usedQty, 0)
    const lahoreStock = latestLahore
      ? latestLahore.closingStock
      : Math.round((lahoreOpening + lahoreRestocked - lahoreUsed) * 100) / 100

    // 3. Resolve active branch selection
    let currentQty: number
    let openingStock: number
    let totalRestocked: number
    let totalCrmUsed: number

    if (branch === 'Karachi') {
      currentQty = karachiStock
      openingStock = karachiOpening
      totalRestocked = karachiRestocked
      totalCrmUsed = karachiUsed
    } else if (branch === 'Lahore') {
      currentQty = lahoreStock
      openingStock = lahoreOpening
      totalRestocked = lahoreRestocked
      totalCrmUsed = lahoreUsed
    } else {
      currentQty = Math.round((karachiStock + lahoreStock) * 100) / 100
      openingStock = Math.round((karachiOpening + lahoreOpening) * 100) / 100
      totalRestocked = Math.round((karachiRestocked + lahoreRestocked) * 100) / 100
      totalCrmUsed = Math.round((karachiUsed + lahoreUsed) * 100) / 100
    }

    const threshold = branch === 'All'
      ? item.lowStockThreshold
      : Math.round(item.lowStockThreshold / 2)
    const isLowStock = currentQty <= threshold

    const lastUpdatedDate =
      latestKarachi?.date ?? latestLahore?.date ?? 'N/A'

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

/**
 * Ensures that all 8 standard master material definitions exist in the database for both
 * Karachi and Lahore branches with at least baseline records (0 balances).
 * Also ensures DropdownValue (category: INVENTORY_ITEM) and UnitRate records exist.
 */
export async function ensureMasterMaterialsExist(targetMonth?: string) {
  await ensureInventoryLedgerColumns()
  const activeMonth = targetMonth || getCurrentActiveMonth()
  const firstDayDate = `${activeMonth}-01`
  const branches = ['Karachi', 'Lahore']

  // 1. Ensure baseline records exist in InventoryLedger for all 8 items and both branches
  for (const branch of branches) {
    for (const item of STANDARD_INVENTORY_ITEMS) {
      const existing = await prisma.inventoryLedger.findFirst({
        where: {
          itemKey: item.key,
          branch,
          monthKey: activeMonth,
        },
      })

      if (!existing) {
        await prisma.inventoryLedger.create({
          data: {
            date: firstDayDate,
            monthKey: activeMonth,
            itemName: item.name,
            itemKey: item.key,
            unit: item.unit,
            branch,
            openingStock: 0,
            usedQty: 0,
            restockQty: 0,
            closingStock: 0,
            karachiQty: 0,
            lahoreQty: 0,
            notes: `Master material baseline (${branch})`,
          },
        })
      }
    }
  }

  // 2. Ensure DropdownValue entries exist for category INVENTORY_ITEM
  for (let i = 0; i < STANDARD_INVENTORY_ITEMS.length; i++) {
    const item = STANDARD_INVENTORY_ITEMS[i]
    const existingDropdown = await prisma.dropdownValue.findFirst({
      where: { category: 'INVENTORY_ITEM', value: item.name },
    })
    if (!existingDropdown) {
      await prisma.dropdownValue.create({
        data: {
          category: 'INVENTORY_ITEM',
          value: item.name,
          sortOrder: i + 1,
          active: true,
        },
      })
    }
  }

  // 3. Ensure UnitRate entries exist for all 8 items
  const defaultRates: Record<string, number> = {
    cable_16mm: 350,
    cable_10mm: 250,
    cable_6mm: 180,
    breaker_box: 4500,
    earthing_rod: 3500,
    wpb: 1500,
    nin_uvr: 3800,
    rcbo_breaker: 3200,
  }

  for (const item of STANDARD_INVENTORY_ITEMS) {
    const existingRate = await prisma.unitRate.findUnique({
      where: { itemKey: item.key },
    })
    if (!existingRate) {
      await prisma.unitRate.create({
        data: {
          itemKey: item.key,
          itemName: item.name,
          rate: defaultRates[item.key] || 100,
          unit: item.unit,
          active: true,
        },
      })
    }
  }
}

/**
 * Wipes transaction movement records and resets all 8 standard master materials
 * to strictly 0 balances (openingStock: 0, usedQty: 0, restockQty: 0, closingStock: 0, karachiStock: 0, lahoreStock: 0)
 * for both Karachi and Lahore branches. Never leaves master materials missing.
 */
export async function resetInventoryToZero(targetMonth?: string) {
  await ensureInventoryLedgerColumns()
  const activeMonth = targetMonth || getCurrentActiveMonth()
  const firstDayDate = `${activeMonth}-01`
  const branches = ['Karachi', 'Lahore']

  // 1. Wipe all existing records in InventoryLedger
  const deleteResult = await prisma.inventoryLedger.deleteMany({})

  // 2. Immediately re-insert all 8 master material items with strictly 0 balances
  for (const branch of branches) {
    for (const item of STANDARD_INVENTORY_ITEMS) {
      await prisma.inventoryLedger.create({
        data: {
          date: firstDayDate,
          monthKey: activeMonth,
          itemName: item.name,
          itemKey: item.key,
          unit: item.unit,
          branch,
          openingStock: 0,
          usedQty: 0,
          restockQty: 0,
          closingStock: 0,
          karachiQty: 0,
          lahoreQty: 0,
          notes: `Opening inventory baseline (${branch} - Reset to 0)`,
        },
      })
    }
  }

  // 3. Ensure Dropdown and UnitRate masters remain fully intact
  await ensureMasterMaterialsExist(activeMonth)

  // 4. Return the freshly zeroed current stock levels
  const currentStock = await getCurrentStockLevels('All')
  return { count: deleteResult.count, currentStock }
}


