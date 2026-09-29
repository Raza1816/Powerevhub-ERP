const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const STANDARD_ITEMS = [
  { key: 'cable_16mm', name: '16mm 4-Core Copper Cable', unit: 'meter', openingStock: 0 },
  { key: 'cable_10mm', name: '10mm Cable', unit: 'meter', openingStock: 0 },
  { key: 'cable_6mm', name: '6mm Cable', unit: 'meter', openingStock: 0 },
  { key: 'breaker_box', name: 'DB Box (Breaker Box)', unit: 'unit', openingStock: 0 },
  { key: 'earthing_rod', name: 'Earthing Rod', unit: 'unit', openingStock: 0 },
  { key: 'wpb', name: 'WPB (Waterproof Box)', unit: 'unit', openingStock: 0 },
  { key: 'nin_uvr', name: 'NIN UVR (Voltage Relay)', unit: 'unit', openingStock: 0 },
  { key: 'rcbo_breaker', name: 'RCBO Breaker', unit: 'unit', openingStock: 0 },
]

async function main() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const activeMonth = `${year}-${month}`
  const firstDayDate = `${activeMonth}-01`
  const branches = ['Karachi', 'Lahore']

  console.log(`Seeding Warehouse Inventory Ledger for month ${activeMonth}...`)

  for (const branch of branches) {
    for (const item of STANDARD_ITEMS) {
      const existing = await prisma.inventoryLedger.findFirst({
        where: {
          date: firstDayDate,
          itemKey: item.key,
          branch,
        },
      })

      if (existing) {
        await prisma.inventoryLedger.update({
          where: { id: existing.id },
          data: {
            openingStock: item.openingStock,
            closingStock: item.openingStock + existing.restockQty - existing.usedQty,
            notes: `Standard opening inventory baseline for ${branch}`,
          },
        })
        console.log(`Updated inventory baseline for: ${item.name} (${branch})`)
      } else {
        await prisma.inventoryLedger.create({
          data: {
            date: firstDayDate,
            monthKey: activeMonth,
            itemName: item.name,
            itemKey: item.key,
            unit: item.unit,
            branch,
            openingStock: item.openingStock,
            usedQty: 0,
            restockQty: 0,
            closingStock: item.openingStock,
            notes: `Standard opening inventory baseline for ${branch}`,
          },
        })
        console.log(`Created inventory baseline for: ${item.name} (${branch}: ${item.openingStock} ${item.unit}s)`)
      }
    }
  }

  console.log('Warehouse inventory seeding completed successfully.')
}

main()
  .catch((e) => {
    console.error('Error seeding inventory:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
