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

/**
 * Re-aggregates and synchronizes inventory usage and restocks for a given date.
 */
export async function syncInventoryForDate(dateStr: string) {
  if (!dateStr) return
  const monthKey = getMonthKeyFromDate(dateStr)
  const branches = ['Karachi', 'Lahore']

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
        purchases.forEach((p) => {
          if (
            p.itemKey === item.key ||
            p.item.toLowerCase().includes(item.name.toLowerCase()) ||
            (item.key === 'cable_16mm' && p.item.toLowerCase().includes('16mm'))
          ) {
            restockQty += Number(p.quantity) || 0
          }
        })

        // Resolve opening stock from previous ledger entry for this branch
        const prevEntry = await prisma.inventoryLedger.findFirst({
          where: {
            itemKey: item.key,
            branch,
            date: { lt: dateStr },
          },
          orderBy: { date: 'desc' },
        })
        const openingStock = prevEntry ? prevEntry.closingStock : 0
        const closingStock = Math.round((openingStock + restockQty - usedQty) * 100) / 100

        // Skip creating entries with nothing to record
        if (usedQty === 0 && restockQty === 0 && openingStock === 0) continue

        // Upsert: unique key is (date, itemKey, branch) — avoids duplicate-key 500 errors
        await prisma.inventoryLedger.upsert({
          where: {
            date_itemKey_branch: {
              date: dateStr,
              itemKey: item.key,
              branch,
            },
          },
          update: {
            usedQty,
            restockQty,
            closingStock,
            monthKey,
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
          },
        })
      } catch (itemErr: any) {
        console.error(`[syncInventory] Failed for item ${item.key} / branch ${branch} on ${dateStr}:`, itemErr.message)
        // Continue processing other items — don't let one failure abort the entire sync
      }
    }
  }
}

/**
 * Returns the current warehouse stock summary across all standard items.
 * Supports branch-specific filtering: "Karachi", "Lahore", or "All" (consolidated).
 * Stock levels are derived exclusively from database records tagged with the correct branch —
 * NO percentage splitting or heuristic fallbacks.
 */
export async function getCurrentStockLevels(branch: string = 'All') {
  const items = STANDARD_INVENTORY_ITEMS
  const results = []

  for (const item of items) {
    // Fetch the latest ledger entry for Karachi branch
    const latestKarachi = await prisma.inventoryLedger.findFirst({
      where: { itemKey: item.key, branch: 'Karachi' },
      orderBy: { date: 'desc' },
    })

    // Fetch the latest ledger entry for Lahore branch
    const latestLahore = await prisma.inventoryLedger.findFirst({
      where: { itemKey: item.key, branch: 'Lahore' },
      orderBy: { date: 'desc' },
    })

    const karachiStock = latestKarachi ? latestKarachi.closingStock : 0
    const lahoreStock = latestLahore ? latestLahore.closingStock : 0

    let currentQty: number
    if (branch === 'Karachi') {
      currentQty = karachiStock
    } else if (branch === 'Lahore') {
      currentQty = lahoreStock
    } else {
      // Consolidated: true sum of both warehouses, no splitting
      currentQty = karachiStock + lahoreStock
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
      branch,
      lastUpdatedDate,
      isLowStock,
    })
  }

  return results
}
