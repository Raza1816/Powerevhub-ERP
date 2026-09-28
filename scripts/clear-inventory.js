const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Clearing all Warehouse Inventory Ledger database records...')
  const result = await prisma.inventoryLedger.deleteMany({})
  console.log(`Successfully cleared ${result.count} inventory ledger records from the database.`)
}

main()
  .catch((e) => {
    console.error('Error clearing inventory ledger:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
