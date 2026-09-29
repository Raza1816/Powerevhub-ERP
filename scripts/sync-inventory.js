const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const STANDARD_ITEMS = [
  { key: 'cable_16mm', name: '16mm 4-Core Copper Cable', unit: 'meter', lowStockThreshold: 100, crmField: 'cable16mmMeter' },
  { key: 'cable_10mm', name: '10mm Cable', unit: 'meter', lowStockThreshold: 150, crmField: 'cable10mmMeter' },
  { key: 'cable_6mm', name: '6mm Cable', unit: 'meter', lowStockThreshold: 200, crmField: 'cable6mmMeter' },
  { key: 'breaker_box', name: 'DB Box (Breaker Box)', unit: 'unit', lowStockThreshold: 10, crmField: 'breakerBoxQty' },
  { key: 'earthing_rod', name: 'Earthing Rod', unit: 'unit', lowStockThreshold: 15, crmField: 'earthingRodQty' },
  { key: 'wpb', name: 'WPB (Waterproof Box)', unit: 'unit', lowStockThreshold: 15, crmField: 'wpbQty' },
  { key: 'nin_uvr', name: 'NIN UVR (Voltage Relay)', unit: 'unit', lowStockThreshold: 10, crmField: 'ninUvrQty' },
  { key: 'rcbo_breaker', name: 'RCBO Breaker', unit: 'unit', lowStockThreshold: 12, crmField: 'rcboBreakerQty' },
]

const DEFAULT_OPENING_STOCKS = {
  cable_16mm: { Karachi: 0, Lahore: 0 },
  cable_10mm: { Karachi: 0, Lahore: 0 },
  cable_6mm: { Karachi: 0, Lahore: 0 },
  breaker_box: { Karachi: 0, Lahore: 0 },
  earthing_rod: { Karachi: 0, Lahore: 0 },
  wpb: { Karachi: 0, Lahore: 0 },
  nin_uvr: { Karachi: 0, Lahore: 0 },
  rcbo_breaker: { Karachi: 0, Lahore: 0 },
}

function normalizeInventoryItem(rawInput) {
  if (!rawInput) return { key: 'unknown', name: 'Unknown Item', unit: 'unit' }
  const str = rawInput.toLowerCase().trim()

  if (str.includes('16mm') || str === 'cable_16mm') {
    return { key: 'cable_16mm', name: '16mm 4-Core Copper Cable', unit: 'meter' }
  }
  if (str.includes('10mm') || str === 'cable_10mm') {
    return { key: 'cable_10mm', name: '10mm Cable', unit: 'meter' }
  }
  if (str.includes('6mm') || str === 'cable_6mm') {
    return { key: 'cable_6mm', name: '6mm Cable', unit: 'meter' }
  }
  if (
    str.includes('breaker box') ||
    str.includes('db box') ||
    str.includes('db breaker') ||
    str.includes('breaker_box') ||
    (str.includes('box') && str.includes('db'))
  ) {
    return { key: 'breaker_box', name: 'DB Box (Breaker Box)', unit: 'unit' }
  }
  if (str.includes('earthing') || str.includes('earth rod') || str === 'earthing_rod') {
    return { key: 'earthing_rod', name: 'Earthing Rod', unit: 'unit' }
  }
  if (str.includes('wpb') || str.includes('waterproof') || str === 'wpb') {
    return { key: 'wpb', name: 'WPB (Waterproof Box)', unit: 'unit' }
  }
  if (str.includes('nin') || str.includes('uvr') || str.includes('voltage relay') || str === 'nin_uvr') {
    return { key: 'nin_uvr', name: 'NIN UVR (Voltage Relay)', unit: 'unit' }
  }
  if (str.includes('rcbo') || str === 'rcbo_breaker') {
    return { key: 'rcbo_breaker', name: 'RCBO Breaker', unit: 'unit' }
  }

  const exact = STANDARD_ITEMS.find((i) => i.key === rawInput || i.name.toLowerCase() === str)
  if (exact) return { key: exact.key, name: exact.name, unit: exact.unit }

  return { key: rawInput.replace(/\s+/g, '_').toLowerCase(), name: rawInput, unit: 'unit' }
}

function getMonthKey(dateStr) {
  if (!dateStr) return '2026-09'
  return dateStr.substring(0, 7)
}

async function main() {
  console.log('=====================================================')
  console.log('  POWER EV HUB — INVENTORY & PROCUREMENT SYNC UTILITY')
  console.log('=====================================================\n')

  const branches = ['Karachi', 'Lahore']
  let totalPurchasesSynced = 0
  let totalLedgerEntriesUpserted = 0

  for (const branch of branches) {
    console.log(`Processing warehouse branch: ${branch}...`)

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

    const allDatesSet = new Set()
    jobDates.forEach((j) => j.date && allDatesSet.add(j.date))
    purchaseDates.forEach((p) => p.date && allDatesSet.add(p.date))
    ledgerDates.forEach((l) => l.date && allDatesSet.add(l.date))

    const sortedDates = Array.from(allDatesSet).sort()
    console.log(`Found ${sortedDates.length} distinct activity dates for ${branch}.`)

    for (const item of STANDARD_ITEMS) {
      let runningStock = null

      for (const dateStr of sortedDates) {
        const monthKey = getMonthKey(dateStr)

        // 1. CRM Usage
        const jobs = await prisma.crmJob.findMany({
          where: { date: dateStr, branch },
        })
        let usedQty = 0
        jobs.forEach((job) => {
          if (item.crmField && job[item.crmField]) {
            usedQty += Number(job[item.crmField]) || 0
          }
        })

        // 2. Vendor Restock
        const purchases = await prisma.vendorPurchase.findMany({
          where: { date: dateStr, branch },
        })
        let restockQty = 0
        const matchedPurchases = []

        purchases.forEach((p) => {
          const norm = normalizeInventoryItem(p.itemKey || p.item)
          if (norm.key === item.key) {
            const qty = Number(p.quantity) || 0
            restockQty += qty
            matchedPurchases.push({ vendorName: p.vendorName || 'Vendor', quantity: qty })
            totalPurchasesSynced++
          }
        })

        // 3. Opening stock
        const existingEntry = await prisma.inventoryLedger.findFirst({
          where: { date: dateStr, itemKey: item.key, branch },
        })

        const isManualAdjustment = existingEntry && existingEntry.notes && (
          existingEntry.notes.toLowerCase().includes('op ') ||
          existingEntry.notes.toLowerCase().includes('opening') ||
          existingEntry.notes.toLowerCase().includes('baseline') ||
          existingEntry.notes.toLowerCase().includes('adjustment')
        )

        let openingStock
        if (isManualAdjustment) {
          openingStock = existingEntry.openingStock
        } else if (runningStock !== null) {
          openingStock = runningStock
        } else {
          const prevDbEntry = await prisma.inventoryLedger.findFirst({
            where: { itemKey: item.key, branch, date: { lt: dateStr } },
            orderBy: { date: 'desc' },
          })
          if (prevDbEntry) {
            openingStock = prevDbEntry.closingStock
          } else {
            const branchDefaults = DEFAULT_OPENING_STOCKS[item.key]
            openingStock = branchDefaults ? (branchDefaults[branch] || 0) : 0
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

        totalLedgerEntriesUpserted++
      }
    }
  }

  console.log('\nSync finished!')
  console.log(`Total vendor purchases matched: ${totalPurchasesSynced}`)
  console.log(`Total inventory ledger records synchronized: ${totalLedgerEntriesUpserted}\n`)

  console.log('Current Warehouse Stock Levels Summary:')
  for (const item of STANDARD_ITEMS) {
    const karachi = await prisma.inventoryLedger.findFirst({
      where: { itemKey: item.key, branch: 'Karachi' },
      orderBy: { date: 'desc' },
    })
    const lahore = await prisma.inventoryLedger.findFirst({
      where: { itemKey: item.key, branch: 'Lahore' },
      orderBy: { date: 'desc' },
    })
    const kStock = karachi ? karachi.closingStock : 0
    const lStock = lahore ? lahore.closingStock : 0
    console.log(`- ${item.name}: Consolidated ${kStock + lStock} ${item.unit}s (Karachi: ${kStock}, Lahore: ${lStock})`)
  }
}

main()
  .catch((err) => {
    console.error('Error during inventory sync:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
