import { prisma } from './prisma'
import { getMonthKeyFromDate, getCurrentActiveMonth, getTodayDateString } from './dateUtils'

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

/**
 * Exact Canonical Material Mapping Table between CRM Installation Job form fields
 * and the Master Inventory Ledger items.
 */
export interface CrmMaterialMapping {
  field: string
  key: string
  name: string
  unit: string
}

export const CRM_MATERIAL_MAPPINGS: CrmMaterialMapping[] = [
  { field: 'cable10mmMeter', key: 'cable_10mm', name: '10mm Cable', unit: 'meter' },
  { field: 'cable6mmMeter', key: 'cable_6mm', name: '6mm Cable', unit: 'meter' },
  { field: 'cable16mmMeter', key: 'cable_16mm', name: '16mm 4-Core Copper Cable', unit: 'meter' },
  { field: 'breakerBoxQty', key: 'breaker_box', name: 'DB Box (Breaker Box)', unit: 'unit' },
  { field: 'earthingRodQty', key: 'earthing_rod', name: 'Earthing Rod', unit: 'unit' },
  { field: 'wpbQty', key: 'wpb', name: 'WPB (Waterproof Box)', unit: 'unit' },
  { field: 'ninUvrQty', key: 'nin_uvr', name: 'NIN UVR (Voltage Relay)', unit: 'unit' },
  { field: 'rcboBreakerQty', key: 'rcbo_breaker', name: 'RCBO Breaker', unit: 'unit' },
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
    // Column already exists in SQLite
  }
  try {
    await client.$executeRawUnsafe(`ALTER TABLE "InventoryLedger" ADD COLUMN "movementType" TEXT DEFAULT 'CRM_USAGE';`)
  } catch {
    // Column already exists in SQLite
  }
  try {
    await client.$executeRawUnsafe(`DROP INDEX IF EXISTS "InventoryLedger_date_itemKey_branch_key";`)
  } catch {
    // Safe to ignore
  }
  try {
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InventoryLedger_referenceId_idx" ON "InventoryLedger"("referenceId");`)
  } catch {}
  try {
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InventoryLedger_movementType_idx" ON "InventoryLedger"("movementType");`)
  } catch {}
  try {
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InventoryLedger_date_itemKey_branch_idx" ON "InventoryLedger"("date", "itemKey", "branch");`)
  } catch {}

  columnsVerified = true
}

/**
 * Calculates the final closing stock of the preceding month for a given itemKey and branch.
 * Closing Stock = Opening Stock + Total Restocked - Total CRM Used.
 * Returns 0 if there is no preceding record in the database.
 */
export async function getPrecedingMonthClosingStock(
  itemKey: string,
  branch: string,
  targetMonth: string,
  clientOrTx?: any
): Promise<number> {
  const client = clientOrTx || prisma
  const firstDayOfTargetMonth = `${targetMonth}-01`

  const prevEntry = await client.inventoryLedger.findFirst({
    where: {
      itemKey,
      branch,
      date: { lt: firstDayOfTargetMonth },
    },
    orderBy: [
      { date: 'desc' },
      { createdAt: 'desc' },
    ],
  })

  return prevEntry ? prevEntry.closingStock : 0
}

/**
 * Chronologically recalculates running openingStock and closingStock balances
 * for a specific itemKey and branch across all dates.
 * Mathematical formula:
 * Closing Stock = Opening Stock + Restocked (+) - CRM Used (-)
 */
export async function recalculateItemBalances(
  itemKey: string,
  branch: string,
  clientOrTx?: any
) {
  const client = clientOrTx || prisma
  await ensureInventoryLedgerColumns(client)

  // Fetch all ledger rows for this itemKey and branch
  const rows = await client.inventoryLedger.findMany({
    where: { itemKey, branch },
    orderBy: [
      { date: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  if (rows.length === 0) return

  // Prioritize baseline and manual adjustment rows on the same date to appear first
  rows.sort((a: any, b: any) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date)
    }
    const aIsBaseline =
      a.movementType === 'OPENING_BALANCE' ||
      a.movementType === 'MANUAL_ADJUSTMENT' ||
      (a.notes && a.notes.toLowerCase().includes('baseline'))
    const bIsBaseline =
      b.movementType === 'OPENING_BALANCE' ||
      b.movementType === 'MANUAL_ADJUSTMENT' ||
      (b.notes && b.notes.toLowerCase().includes('baseline'))
    if (aIsBaseline && !bIsBaseline) return -1
    if (!aIsBaseline && bIsBaseline) return 1
    if (aIsBaseline && bIsBaseline) {
      if (a.movementType === 'OPENING_BALANCE' && b.movementType === 'MANUAL_ADJUSTMENT') return -1
      if (a.movementType === 'MANUAL_ADJUSTMENT' && b.movementType === 'OPENING_BALANCE') return 1
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  let runningClosing = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const isBaseline = row.movementType === 'OPENING_BALANCE' || (row.notes && row.notes.includes('opening inventory baseline'))
    const isManualAdjustment = row.movementType === 'MANUAL_ADJUSTMENT' || (row.notes && (
      row.notes.toLowerCase().includes('manual adjustment') ||
      row.notes.toLowerCase().includes('manual override') ||
      row.notes.toLowerCase().includes('user adjustment')
    ))

    let newOpening: number
    if (isBaseline || isManualAdjustment) {
      newOpening = row.openingStock
    } else {
      newOpening = runningClosing
    }

    const restock = Number(row.restockQty) || 0
    const used = Number(row.usedQty) || 0
    const newClosing = Math.round((newOpening + restock - used) * 100) / 100
    runningClosing = newClosing

    if (row.openingStock !== newOpening || row.closingStock !== newClosing || row.karachiQty !== (branch === 'Karachi' ? newClosing : 0) || row.lahoreQty !== (branch === 'Lahore' ? newClosing : 0)) {
      await client.inventoryLedger.update({
        where: { id: row.id },
        data: {
          openingStock: newOpening,
          closingStock: newClosing,
          karachiQty: branch === 'Karachi' ? newClosing : 0,
          lahoreQty: branch === 'Lahore' ? newClosing : 0,
        },
      })
    }
  }
}

/**
 * Synchronizes inventory deduction records for a CRM Installation Job.
 * For each material with quantity > 0:
 * Creates or updates an individual InventoryLedger record with:
 * - date: Job installation date
 * - branch: Job branch ('Karachi' | 'Lahore')
 * - itemName: Canonical material name
 * - itemKey: Canonical material key
 * - quantity: Used quantity (recorded as usedQty)
 * - referenceId: Linked CRM Job ID
 * - movementType: 'CRM_USAGE'
 * - ledgerNotes: "Used for Job #[Job Number] - [Client Name]"
 * Then recalculates the branch balances and cascading closing stocks.
 */
export async function syncCrmJobInventory(job: any, clientOrTx?: any) {
  const client = clientOrTx || prisma
  await ensureInventoryLedgerColumns(client)

  const date = job.date
  const monthKey = job.monthKey || getMonthKeyFromDate(date)
  const branch = job.branch === 'Lahore' ? 'Lahore' : 'Karachi'
  const sn = job.sn
  const clientName = job.clientName || 'Client'
  const ledgerNotes = `Used for Job #${sn} - ${clientName}`

  const affectedKeys: string[] = []

  for (const m of CRM_MATERIAL_MAPPINGS) {
    const qty = Number(job[m.field]) || 0
    affectedKeys.push(m.key)

    const existing = await client.inventoryLedger.findFirst({
      where: {
        referenceId: job.id,
        itemKey: m.key,
      },
    })

    if (qty > 0) {
      if (existing) {
        await client.inventoryLedger.update({
          where: { id: existing.id },
          data: {
            date,
            monthKey,
            branch,
            itemName: m.name,
            itemKey: m.key,
            unit: m.unit,
            usedQty: qty,
            restockQty: 0,
            notes: ledgerNotes,
            movementType: 'CRM_USAGE',
          },
        })
      } else {
        await client.inventoryLedger.create({
          data: {
            date,
            monthKey,
            branch,
            itemName: m.name,
            itemKey: m.key,
            unit: m.unit,
            usedQty: qty,
            restockQty: 0,
            referenceId: job.id,
            movementType: 'CRM_USAGE',
            notes: ledgerNotes,
          },
        })
      }
    } else if (existing) {
      await client.inventoryLedger.delete({ where: { id: existing.id } })
    }
  }

  // Recalculate item running balances for all affected items in this branch
  for (const key of affectedKeys) {
    await recalculateItemBalances(key, branch, client)
  }
}

/**
 * Handles editing a CRM Installation Job's materials, branch, or date.
 * Adjusts or replaces the linked ledger entries and restores/deducts the difference.
 */
export async function syncCrmJobInventoryOnEdit(
  existingJob: any,
  updatedJob: any,
  clientOrTx?: any
) {
  const client = clientOrTx || prisma
  await ensureInventoryLedgerColumns(client)

  const oldBranch = existingJob.branch === 'Lahore' ? 'Lahore' : 'Karachi'
  const newBranch = updatedJob.branch === 'Lahore' ? 'Lahore' : 'Karachi'
  const oldDate = existingJob.date
  const newDate = updatedJob.date

  // If branch or date changed, remove existing ledger entries for this job
  // so they are recreated cleanly under the new branch and date
  if (oldBranch !== newBranch || oldDate !== newDate) {
    const existingEntries = await client.inventoryLedger.findMany({
      where: { referenceId: updatedJob.id },
    })
    if (existingEntries.length > 0) {
      await client.inventoryLedger.deleteMany({
        where: { referenceId: updatedJob.id },
      })
      const oldKeys = Array.from(new Set(existingEntries.map((e: any) => e.itemKey)))
      for (const key of oldKeys) {
        await recalculateItemBalances(key as string, oldBranch, client)
      }
    }
  }

  // Synchronize new usage in target branch
  await syncCrmJobInventory(updatedJob, client)

  // If branch changed, also recalculate all items in new branch
  if (oldBranch !== newBranch) {
    for (const m of CRM_MATERIAL_MAPPINGS) {
      await recalculateItemBalances(m.key, newBranch, client)
    }
  }
}

/**
 * Handles deleting a CRM Installation Job:
 * Deletes all linked InventoryLedger entries with referenceId == job.id
 * and restores the deducted quantities back to the warehouse.
 */
export async function syncCrmJobInventoryOnDelete(job: any, clientOrTx?: any) {
  const client = clientOrTx || prisma
  await ensureInventoryLedgerColumns(client)

  const branch = job.branch === 'Lahore' ? 'Lahore' : 'Karachi'
  const existingEntries = await client.inventoryLedger.findMany({
    where: { referenceId: job.id },
  })

  if (existingEntries.length > 0) {
    await client.inventoryLedger.deleteMany({
      where: { referenceId: job.id },
    })

    const affectedKeys = Array.from(new Set(existingEntries.map((e: any) => e.itemKey)))
    for (const key of affectedKeys) {
      await recalculateItemBalances(key as string, branch, client)
    }
  }
}

/**
 * Synchronizes inventory restock records for a Vendor Purchase.
 */
export async function syncVendorPurchaseInventory(purchase: any, clientOrTx?: any) {
  const client = clientOrTx || prisma
  await ensureInventoryLedgerColumns(client)

  const norm = normalizeInventoryItem(purchase.itemKey || purchase.item)
  const branch = purchase.branch === 'Lahore' ? 'Lahore' : 'Karachi'
  const date = purchase.date
  const monthKey = purchase.monthKey || getMonthKeyFromDate(date)
  const quantity = Number(purchase.quantity) || 0
  const notes = purchase.notes || `Restock via ${purchase.vendorName || 'Vendor'}`

  const existing = await client.inventoryLedger.findFirst({
    where: { referenceId: purchase.id },
  })

  if (quantity > 0) {
    if (existing) {
      await client.inventoryLedger.update({
        where: { id: existing.id },
        data: {
          date,
          monthKey,
          branch,
          itemName: norm.name,
          itemKey: norm.key,
          unit: norm.unit,
          restockQty: quantity,
          usedQty: 0,
          movementType: 'RESTOCK',
          notes,
        },
      })
    } else {
      await client.inventoryLedger.create({
        data: {
          date,
          monthKey,
          branch,
          itemName: norm.name,
          itemKey: norm.key,
          unit: norm.unit,
          restockQty: quantity,
          usedQty: 0,
          referenceId: purchase.id,
          movementType: 'RESTOCK',
          notes,
        },
      })
    }
  } else if (existing) {
    await client.inventoryLedger.delete({ where: { id: existing.id } })
  }

  await recalculateItemBalances(norm.key, branch, client)
}

export async function syncVendorPurchaseInventoryOnEdit(
  existingPurchase: any,
  updatedPurchase: any,
  clientOrTx?: any
) {
  const client = clientOrTx || prisma
  await ensureInventoryLedgerColumns(client)

  const oldBranch = existingPurchase.branch === 'Lahore' ? 'Lahore' : 'Karachi'
  const newBranch = updatedPurchase.branch === 'Lahore' ? 'Lahore' : 'Karachi'
  const oldNorm = normalizeInventoryItem(existingPurchase.itemKey || existingPurchase.item)
  const newNorm = normalizeInventoryItem(updatedPurchase.itemKey || updatedPurchase.item)

  if (oldBranch !== newBranch || oldNorm.key !== newNorm.key || existingPurchase.date !== updatedPurchase.date) {
    await client.inventoryLedger.deleteMany({
      where: { referenceId: updatedPurchase.id },
    })
    await recalculateItemBalances(oldNorm.key, oldBranch, client)
  }

  await syncVendorPurchaseInventory(updatedPurchase, client)

  if (oldBranch !== newBranch || oldNorm.key !== newNorm.key) {
    await recalculateItemBalances(newNorm.key, newBranch, client)
  }
}

export async function syncVendorPurchaseInventoryOnDelete(purchase: any, clientOrTx?: any) {
  const client = clientOrTx || prisma
  await ensureInventoryLedgerColumns(client)

  const norm = normalizeInventoryItem(purchase.itemKey || purchase.item)
  const branch = purchase.branch === 'Lahore' ? 'Lahore' : 'Karachi'

  await client.inventoryLedger.deleteMany({
    where: { referenceId: purchase.id },
  })

  await recalculateItemBalances(norm.key, branch, client)
}

/**
 * Compatibility wrapper for single date sync.
 */
export async function syncInventoryForDate(dateStr: string, targetBranch?: string) {
  if (!dateStr) return
  const branches = targetBranch ? [targetBranch] : ['Karachi', 'Lahore']

  for (const branch of branches) {
    for (const item of STANDARD_INVENTORY_ITEMS) {
      await recalculateItemBalances(item.key, branch)
    }
  }
}

/**
 * Compatibility wrapper for single date/item cascade.
 */
export async function syncInventoryDateAndCascade(
  dateStr: string,
  itemKey: string,
  branch: string,
  txClient?: any,
  explicitReferenceId?: string
) {
  await recalculateItemBalances(itemKey, branch, txClient)
}

/**
 * Synchronizes the entire inventory ledger across all CRM jobs, vendor purchases, and baseline balances.
 * Guarantees that every CRM job with material usage > 0 has its individual CRM_USAGE ledger record
 * and every vendor purchase has its RESTOCK ledger record, with 100% mathematical integrity.
 */
export async function syncAllInventory(targetBranch?: string) {
  await ensureInventoryLedgerColumns()
  const activeMonth = getCurrentActiveMonth()
  const branches = targetBranch && targetBranch !== 'All' ? [targetBranch] : ['Karachi', 'Lahore']

  // 1. Ensure master materials baseline exists for active month
  await ensureMasterMaterialsExist(activeMonth)

  for (const branch of branches) {
    // Fetch all CRM jobs for this branch
    const jobs = await prisma.crmJob.findMany({
      where: { branch },
    })
    for (const job of jobs) {
      await syncCrmJobInventory(job)
    }

    // Fetch all vendor purchases for this branch
    const purchases = await prisma.vendorPurchase.findMany({
      where: { branch },
    })
    for (const purchase of purchases) {
      await syncVendorPurchaseInventory(purchase)
    }

    // Recalculate balances for all standard items in this branch
    for (const item of STANDARD_INVENTORY_ITEMS) {
      await recalculateItemBalances(item.key, branch)
    }
  }
}

/**
 * Returns the current warehouse stock summary across all standard items for a given month.
 * Computes:
 * - Opening Stock (New Month) = Preceding Month Closing Stock (or Baseline)
 * - Available Closing Stock = Opening Stock + Total Restocked - Total CRM Used
 * Computed independently per location:
 * - Karachi Opening Stock = Karachi Previous Closing Stock
 * - Lahore Opening Stock = Lahore Previous Closing Stock
 * - Consolidated = Karachi Opening + Lahore Opening
 */
/**
 * Calculates real-time dynamic stock for a specific material item and branch.
 * Mathematical rule:
 * Branch Stock = Latest Opening/Adjustment Baseline + Sum(RESTOCK for Branch) - Sum(CRM_USED for Branch)
 * When a manual adjustment sets the baseline on a given date, any calculations starting
 * from that point take the adjustment as the ground-truth baseline.
 */
export async function calculateBranchStock(
  itemKey: string,
  branch: string,
  targetMonth: string,
  clientOrTx?: any
) {
  const client = clientOrTx || prisma
  const firstDayDate = `${targetMonth}-01`

  const rows = await client.inventoryLedger.findMany({
    where: {
      itemKey,
      branch,
      monthKey: targetMonth,
    },
    orderBy: [
      { date: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  // Identify all baseline or manual adjustment rows in the month
  const isBaselineRow = (r: any) =>
    r.movementType === 'OPENING_BALANCE' ||
    r.movementType === 'MANUAL_ADJUSTMENT' ||
    (r.usedQty === 0 && r.restockQty === 0 && !r.referenceId) ||
    (r.notes && (
      r.notes.toLowerCase().includes('manual adjustment') ||
      r.notes.toLowerCase().includes('manual override') ||
      r.notes.toLowerCase().includes('opening inventory baseline') ||
      r.notes.toLowerCase().includes('opening stock')
    ))

  const baselineRows = rows.filter(isBaselineRow)

  let latestBaselineRow: any = null
  if (baselineRows.length > 0) {
    // Sort chronologically: by date ascending, then if same date, manual/non-zero supersedes auto-zero baseline, then updatedAt/createdAt
    baselineRows.sort((a: any, b: any) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      const aIsAutoZero =
        (Number(a.openingStock) || 0) === 0 &&
        a.notes &&
        a.notes.toLowerCase().includes('opening inventory baseline')
      const bIsAutoZero =
        (Number(b.openingStock) || 0) === 0 &&
        b.notes &&
        b.notes.toLowerCase().includes('opening inventory baseline')
      if (aIsAutoZero && !bIsAutoZero) return -1
      if (!aIsAutoZero && bIsAutoZero) return 1
      const aIsManual = a.movementType === 'MANUAL_ADJUSTMENT'
      const bIsManual = b.movementType === 'MANUAL_ADJUSTMENT'
      if (aIsManual && !bIsManual) return 1
      if (!aIsManual && bIsManual) return -1
      const aTime = new Date(a.updatedAt || a.createdAt).getTime()
      const bTime = new Date(b.updatedAt || b.createdAt).getTime()
      return aTime - bTime
    })
    latestBaselineRow = baselineRows[baselineRows.length - 1]
  }

  const prevMonthClosing = await getPrecedingMonthClosingStock(itemKey, branch, targetMonth, client)

  let baselineStock = 0
  let baselineDate: string | null = null
  let baselineId: string | null = null

  if (latestBaselineRow) {
    const isUntouchedAutoZero =
      (Number(latestBaselineRow.openingStock) || 0) === 0 &&
      latestBaselineRow.notes &&
      latestBaselineRow.notes.toLowerCase().includes('opening inventory baseline')
    baselineStock = isUntouchedAutoZero && prevMonthClosing > 0
      ? prevMonthClosing
      : (Number(latestBaselineRow.openingStock) || 0)
    baselineDate = latestBaselineRow.date
    baselineId = latestBaselineRow.id
  } else {
    baselineStock = prevMonthClosing
    baselineDate = null
    baselineId = null
  }

  let restockAfterBaseline = 0
  let usedAfterBaseline = 0
  let totalMonthlyRestocked = 0
  let totalMonthlyUsed = 0

  for (const r of rows) {
    const rRestock = Number(r.restockQty) || 0
    const rUsed = Number(r.usedQty) || 0

    totalMonthlyRestocked += rRestock
    totalMonthlyUsed += rUsed

    // Skip any baseline row
    if (r.id === baselineId || isBaselineRow(r)) continue

    // Baseline on a given date establishes the opening stock at the start of that date
    const isAfter = !baselineDate || r.date >= baselineDate

    if (isAfter) {
      restockAfterBaseline += rRestock
      usedAfterBaseline += rUsed
    }
  }

  const currentStock = Math.round((baselineStock + restockAfterBaseline - usedAfterBaseline) * 100) / 100

  // Month opening stock baseline on 1st of month (or prior month closing carryover)
  const firstDayRows = baselineRows.filter((r: any) => r.date === firstDayDate)
  const firstDayRow = firstDayRows.length > 0 ? firstDayRows[firstDayRows.length - 1] : null

  let openingStock = 0
  if (firstDayRow) {
    const firstVal = Number(firstDayRow.openingStock) || 0
    const isUntouchedAutoZero =
      firstVal === 0 &&
      firstDayRow.notes &&
      firstDayRow.notes.toLowerCase().includes('opening inventory baseline')
    if (isUntouchedAutoZero) {
      if (prevMonthClosing > 0) {
        openingStock = prevMonthClosing
      } else {
        const explicitOpeningRow = baselineRows.find(
          (r: any) =>
            r.id !== firstDayRow.id &&
            (Number(r.openingStock) || 0) > 0 &&
            r.notes &&
            r.notes.toLowerCase().includes('opening stock')
        )
        openingStock = explicitOpeningRow ? Number(explicitOpeningRow.openingStock) || 0 : 0
      }
    } else {
      openingStock = firstVal
    }
  } else if (baselineRows.length > 0) {
    openingStock = Number(baselineRows[0].openingStock) || 0
  } else {
    openingStock = prevMonthClosing
  }

  return {
    currentStock,
    openingStock,
    totalRestocked: Math.round(totalMonthlyRestocked * 100) / 100,
    totalCrmUsed: Math.round(totalMonthlyUsed * 100) / 100,
    restockAfterBaseline: Math.round(restockAfterBaseline * 100) / 100,
    usedAfterBaseline: Math.round(usedAfterBaseline * 100) / 100,
    baselineStock,
    baselineDate,
  }
}

/**
 * Returns the current warehouse stock summary across all standard items for a given month.
 * Computes:
 * - Dynamic Card Calculation:
 *   Branch Stock = Latest Opening/Adjustment Baseline + Sum(RESTOCK for Branch) - Sum(CRM_USED for Branch)
 * - If a manual adjustment sets the baseline on a given date, any calculations starting from that point
 *   take the adjustment as the ground-truth baseline.
 * - Consolidated Available Balance = Karachi Stock + Lahore Stock
 */
export async function getCurrentStockLevels(
  branch: string = 'All',
  targetMonth?: string,
  clientOrTx?: any
) {
  const client = clientOrTx || prisma
  await ensureInventoryLedgerColumns(client)
  const activeMonth = targetMonth || getCurrentActiveMonth()
  const items = STANDARD_INVENTORY_ITEMS
  const results = []

  for (const item of items) {
    const karachi = await calculateBranchStock(item.key, 'Karachi', activeMonth, client)
    const lahore = await calculateBranchStock(item.key, 'Lahore', activeMonth, client)

    const karachiStock = karachi.currentStock
    const lahoreStock = lahore.currentStock
    const consolidatedStock = Math.round((karachiStock + lahoreStock) * 100) / 100

    let currentQty: number
    let openingStock: number
    let totalRestocked: number
    let totalCrmUsed: number

    if (branch === 'Karachi') {
      currentQty = karachiStock
      openingStock = karachi.openingStock
      totalRestocked = karachi.totalRestocked
      totalCrmUsed = karachi.totalCrmUsed
    } else if (branch === 'Lahore') {
      currentQty = lahoreStock
      openingStock = lahore.openingStock
      totalRestocked = lahore.totalRestocked
      totalCrmUsed = lahore.totalCrmUsed
    } else {
      currentQty = consolidatedStock
      openingStock = Math.round((karachi.openingStock + lahore.openingStock) * 100) / 100
      totalRestocked = Math.round((karachi.totalRestocked + lahore.totalRestocked) * 100) / 100
      totalCrmUsed = Math.round((karachi.totalCrmUsed + lahore.totalCrmUsed) * 100) / 100
    }

    const threshold = branch === 'All'
      ? item.lowStockThreshold
      : Math.round(item.lowStockThreshold / 2)
    const isLowStock = currentQty <= threshold

    results.push({
      ...item,
      currentStock: currentQty,
      karachiStock,
      lahoreStock,
      openingStock,
      totalRestocked,
      totalCrmUsed,
      branch,
      month: activeMonth,
      lastUpdatedDate: `${activeMonth}-01`,
      isLowStock,
    })
  }

  return results
}

/**
 * Safely adjusts or sets inventory opening stock / target balance for a specific material and branch.
 * Wrapped in a prisma.$transaction:
 * 1. Updates or creates baseline/adjustment record in InventoryLedger.
 * 2. Directly updates master material record for that branch.
 * 3. Cascades running balances forward using recalculateItemBalances.
 * 4. Returns updated master material balances and consolidated available balance.
 */
export async function adjustInventoryBalance(
  params: {
    date?: string
    itemKey: string
    branch?: string
    targetBalance?: number
    openingStock?: number
    notes?: string
    transactionType?: string
  },
  clientOrTx?: any
) {
  const { itemKey, notes, transactionType } = params
  if (!itemKey) {
    throw new Error('itemKey is required for inventory adjustment')
  }

  const branch = params.branch === 'Lahore' ? 'Lahore' : 'Karachi'
  const targetDate = params.date || getTodayDateString()
  const targetMonth = getMonthKeyFromDate(targetDate)
  const firstDayDate = `${targetMonth}-01`

  const targetQty = Number(
    params.targetBalance !== undefined
      ? params.targetBalance
      : (params.openingStock !== undefined ? params.openingStock : 0)
  )

  const itemDef = STANDARD_INVENTORY_ITEMS.find((i) => i.key === itemKey)
  const itemName = itemDef ? itemDef.name : itemKey
  const unit = itemDef ? itemDef.unit : 'unit'

  const isOpeningStock =
    transactionType === 'OPENING_STOCK' ||
    targetDate === firstDayDate ||
    (notes && notes.toLowerCase().includes('opening stock'))

  const resolvedNotes = notes
    ? (notes.toLowerCase().includes('manual') || notes.toLowerCase().includes('opening stock')
        ? notes
        : `Manual adjustment: ${notes}`)
    : (isOpeningStock
        ? `Manual adjustment: Opening stock set for ${branch} warehouse`
        : `Manual adjustment stock set for ${branch} warehouse`)

  await ensureInventoryLedgerColumns(clientOrTx)

  const executeAdjustment = async (tx: any) => {
    let ledgerEntry: any

    if (isOpeningStock && targetDate === firstDayDate) {
      // Find existing baseline entry on first day of month
      const existingOnFirstDay = await tx.inventoryLedger.findFirst({
        where: {
          itemKey,
          branch,
          date: firstDayDate,
          movementType: { in: ['OPENING_BALANCE', 'MANUAL_ADJUSTMENT'] },
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      })

      if (existingOnFirstDay) {
        ledgerEntry = await tx.inventoryLedger.update({
          where: { id: existingOnFirstDay.id },
          data: {
            openingStock: targetQty,
            closingStock: targetQty,
            karachiQty: branch === 'Karachi' ? targetQty : 0,
            lahoreQty: branch === 'Lahore' ? targetQty : 0,
            notes: resolvedNotes,
            movementType: 'OPENING_BALANCE',
          },
        })
      } else {
        ledgerEntry = await tx.inventoryLedger.create({
          data: {
            date: firstDayDate,
            monthKey: targetMonth,
            itemName,
            itemKey,
            unit,
            branch,
            openingStock: targetQty,
            usedQty: 0,
            restockQty: 0,
            closingStock: targetQty,
            karachiQty: branch === 'Karachi' ? targetQty : 0,
            lahoreQty: branch === 'Lahore' ? targetQty : 0,
            movementType: 'OPENING_BALANCE',
            notes: resolvedNotes,
          },
        })
      }
    } else {
      // Manual adjustment on targetDate
      const existingAdj = await tx.inventoryLedger.findFirst({
        where: {
          date: targetDate,
          itemKey,
          branch,
          movementType: 'MANUAL_ADJUSTMENT',
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      })

      if (existingAdj) {
        ledgerEntry = await tx.inventoryLedger.update({
          where: { id: existingAdj.id },
          data: {
            openingStock: targetQty,
            closingStock: targetQty,
            karachiQty: branch === 'Karachi' ? targetQty : 0,
            lahoreQty: branch === 'Lahore' ? targetQty : 0,
            notes: resolvedNotes,
            movementType: 'MANUAL_ADJUSTMENT',
          },
        })
      } else {
        ledgerEntry = await tx.inventoryLedger.create({
          data: {
            date: targetDate,
            monthKey: targetMonth,
            itemName,
            itemKey,
            unit,
            branch,
            openingStock: targetQty,
            usedQty: 0,
            restockQty: 0,
            closingStock: targetQty,
            karachiQty: branch === 'Karachi' ? targetQty : 0,
            lahoreQty: branch === 'Lahore' ? targetQty : 0,
            movementType: 'MANUAL_ADJUSTMENT',
            notes: resolvedNotes,
          },
        })
      }
    }

    // Clean up any legacy duplicate baseline rows on that date for this item & branch
    const existingDuplicates = await tx.inventoryLedger.findMany({
      where: {
        date: targetDate,
        itemKey,
        branch,
        movementType: { in: ['OPENING_BALANCE', 'MANUAL_ADJUSTMENT'] },
        id: { not: ledgerEntry.id },
      },
    })
    for (const dup of existingDuplicates) {
      await tx.inventoryLedger.delete({ where: { id: dup.id } })
    }

    // Recalculate running balances chronologically for this item and branch
    await recalculateItemBalances(itemKey, branch, tx)

    // Calculate dynamic stock levels across all materials
    const currentStock = await getCurrentStockLevels('All', targetMonth, tx)

    const updatedItem = currentStock.find((s: any) => s.key === itemKey)
    const karachiStock = updatedItem ? updatedItem.karachiStock : (branch === 'Karachi' ? targetQty : 0)
    const lahoreStock = updatedItem ? updatedItem.lahoreStock : (branch === 'Lahore' ? targetQty : 0)
    const availableStock = Math.round((karachiStock + lahoreStock) * 100) / 100

    return {
      entry: ledgerEntry,
      currentStock,
      karachiStock,
      lahoreStock,
      availableStock,
      branchStock: branch === 'Karachi' ? karachiStock : lahoreStock,
    }
  }

  // If already inside an existing Prisma transaction, reuse it
  if (clientOrTx && typeof clientOrTx.$transaction !== 'function') {
    return await executeAdjustment(clientOrTx)
  }

  return await prisma.$transaction(async (tx) => {
    return await executeAdjustment(tx)
  })
}

/**
 * Ensures that all 8 standard master material definitions exist in the database for both
 * Karachi and Lahore branches with baseline opening stock records.
 */
export async function ensureMasterMaterialsExist(targetMonth?: string, clientOrTx?: any) {
  const client = clientOrTx || prisma
  await ensureInventoryLedgerColumns(client)
  const activeMonth = targetMonth || getCurrentActiveMonth()
  const firstDayDate = `${activeMonth}-01`
  const branches = ['Karachi', 'Lahore']

  // Clean up any legacy duplicate baseline rows created before schema update
  await client.inventoryLedger.deleteMany({
    where: {
      movementType: 'CRM_USAGE',
      notes: { contains: 'baseline' },
      usedQty: 0,
      restockQty: 0,
      referenceId: null,
    },
  })

  // Deduplicate any multiple baseline rows on firstDayDate for the same itemKey and branch
  for (const branch of branches) {
    for (const item of STANDARD_INVENTORY_ITEMS) {
      const allOnFirstDay = await client.inventoryLedger.findMany({
        where: {
          itemKey: item.key,
          branch,
          date: firstDayDate,
          movementType: { in: ['OPENING_BALANCE', 'MANUAL_ADJUSTMENT'] },
        },
        orderBy: [
          { updatedAt: 'desc' },
          { createdAt: 'desc' },
        ],
      })
      if (allOnFirstDay.length > 1) {
        allOnFirstDay.sort((a: any, b: any) => {
          const aIsManual = a.movementType === 'MANUAL_ADJUSTMENT'
          const bIsManual = b.movementType === 'MANUAL_ADJUSTMENT'
          if (aIsManual && !bIsManual) return -1
          if (!aIsManual && bIsManual) return 1
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        })
        const toDelete = allOnFirstDay.slice(1)
        for (const d of toDelete) {
          await client.inventoryLedger.delete({ where: { id: d.id } })
        }
      }
    }
  }

  // 1. Ensure baseline records exist in InventoryLedger for all 8 items and both branches
  for (const branch of branches) {
    for (const item of STANDARD_INVENTORY_ITEMS) {
      const rollForwardOpening = await getPrecedingMonthClosingStock(item.key, branch, activeMonth)

      const existingBaseline = await client.inventoryLedger.findFirst({
        where: {
          itemKey: item.key,
          branch,
          monthKey: activeMonth,
          movementType: { in: ['OPENING_BALANCE', 'MANUAL_ADJUSTMENT'] },
        },
      })

      if (!existingBaseline) {
        await client.inventoryLedger.create({
          data: {
            date: firstDayDate,
            monthKey: activeMonth,
            itemName: item.name,
            itemKey: item.key,
            unit: item.unit,
            branch,
            openingStock: rollForwardOpening,
            usedQty: 0,
            restockQty: 0,
            closingStock: rollForwardOpening,
            karachiQty: branch === 'Karachi' ? rollForwardOpening : 0,
            lahoreQty: branch === 'Lahore' ? rollForwardOpening : 0,
            movementType: 'OPENING_BALANCE',
            notes: `Opening inventory baseline (${branch})`,
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
 * to strictly 0 balances (openingStock: 0, usedQty: 0, restockQty: 0, closingStock: 0)
 * for both Karachi and Lahore branches.
 */
export async function resetInventoryToZero(targetMonth?: string) {
  await ensureInventoryLedgerColumns()
  const activeMonth = targetMonth || getCurrentActiveMonth()
  const firstDayDate = `${activeMonth}-01`
  const branches = ['Karachi', 'Lahore']

  const deleteResult = await prisma.inventoryLedger.deleteMany({})

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
          movementType: 'OPENING_BALANCE',
          notes: `Opening inventory baseline (${branch} - Reset to 0)`,
        },
      })
    }
  }

  await ensureMasterMaterialsExist(activeMonth)
  const currentStock = await getCurrentStockLevels('All', activeMonth)
  return { count: deleteResult.count, currentStock }
}
