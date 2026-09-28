const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding initial data for Power EV Hub...')
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const activeMonth = `${year}-${month}`

  // Check unit rates
  const existingRates = await prisma.unitRate.count()
  if (existingRates === 0) {
    await prisma.unitRate.createMany({
      data: [
        { itemKey: 'cable_10mm', itemName: '10mm Cable', rate: 250, unit: 'meter', active: true },
        { itemKey: 'cable_6mm', itemName: '6mm Cable', rate: 180, unit: 'meter', active: true },
        { itemKey: 'breaker_box', itemName: 'DB Breaker Box', rate: 4500, unit: 'unit', active: true },
        { itemKey: 'earthing_rod', itemName: 'Earthing Rod', rate: 3500, unit: 'unit', active: true },
        { itemKey: 'wpb', itemName: 'WPB Box', rate: 1500, unit: 'unit', active: true },
        { itemKey: 'nin_uvr', itemName: 'NIN UVR', rate: 3800, unit: 'unit', active: true },
        { itemKey: 'rcbo_breaker', itemName: 'RCBO Breaker', rate: 3200, unit: 'unit', active: true },
      ],
    })
    console.log('Default Unit Rates created.')
  }

  // Check dropdowns
  const existingDropdowns = await prisma.dropdownValue.count()
  if (existingDropdowns === 0) {
    const dropdowns = [
      { category: 'SOURCE', value: 'Direct', sortOrder: 1 },
      { category: 'SOURCE', value: 'MJD/MTP', sortOrder: 2 },
      { category: 'SOURCE', value: 'Sarah South', sortOrder: 3 },
      { category: 'SOURCE', value: 'Dealership Alpha', sortOrder: 4 },
      { category: 'SOURCE', value: 'Social Media / Web', sortOrder: 5 },
      { category: 'SOURCE', value: 'Corporate Referral', sortOrder: 6 },
      { category: 'TECHNICIAN', value: 'Team Alpha (Lead: Ali)', sortOrder: 1 },
      { category: 'TECHNICIAN', value: 'Team Beta (Lead: Imran)', sortOrder: 2 },
      { category: 'TECHNICIAN', value: 'Team Gamma (Lead: Farhan)', sortOrder: 3 },
      { category: 'TECHNICIAN', value: 'Team Delta (Lead: Usman)', sortOrder: 4 },
      { category: 'PAYMENT_METHOD', value: 'Cash', sortOrder: 1 },
      { category: 'PAYMENT_METHOD', value: 'Bank Transfer', sortOrder: 2 },
      { category: 'PAYMENT_METHOD', value: 'Cheque', sortOrder: 3 },
      { category: 'PAYMENT_METHOD', value: 'Online Portal', sortOrder: 4 },
    ]
    for (const d of dropdowns) {
      await prisma.dropdownValue.create({ data: d })
    }
    console.log('Default Dropdown Values created.')
  }

  console.log(`Ready. Active Month: ${activeMonth}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
