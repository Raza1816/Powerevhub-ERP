const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function purgeSeptember() {
  console.log('--- PURGING SEPTEMBER 2026 & PRE-OCTOBER 2026 DATA ---')

  // 1. Delete all jobs before 2026-10
  const deletedJobs = await prisma.crmJob.deleteMany({
    where: {
      OR: [
        { monthKey: { lt: '2026-10' } },
        { date: { lt: '2026-10-01' } },
      ],
    },
  })
  console.log(`Deleted CRM Jobs: ${deletedJobs.count}`)

  // 2. Delete all purchases before 2026-10
  const deletedPurchases = await prisma.vendorPurchase.deleteMany({
    where: {
      OR: [
        { monthKey: { lt: '2026-10' } },
        { date: { lt: '2026-10-01' } },
      ],
    },
  })
  console.log(`Deleted Vendor Purchases: ${deletedPurchases.count}`)

  // 3. Delete all inventory ledger rows before 2026-10
  const deletedLedger = await prisma.inventoryLedger.deleteMany({
    where: {
      OR: [
        { monthKey: { lt: '2026-10' } },
        { date: { lt: '2026-10-01' } },
      ],
    },
  })
  console.log(`Deleted Inventory Ledger Records: ${deletedLedger.count}`)

  // 4. Delete all general expenses before 2026-10
  const deletedExpenses = await prisma.generalExpense.deleteMany({
    where: {
      OR: [
        { monthKey: { lt: '2026-10' } },
        { date: { lt: '2026-10-01' } },
      ],
    },
  })
  console.log(`Deleted General Expenses: ${deletedExpenses.count}`)

  // 5. Delete all payroll records before 2026-10
  const deletedPayroll = await prisma.payrollRecord.deleteMany({
    where: {
      OR: [
        { monthKey: { lt: '2026-10' } },
        { date: { lt: '2026-10-01' } },
      ],
    },
  })
  console.log(`Deleted Payroll Records: ${deletedPayroll.count}`)

  // 6. Delete all salary advances before 2026-10
  const deletedAdvances = await prisma.salaryAdvance.deleteMany({
    where: {
      OR: [
        { monthKey: { lt: '2026-10' } },
        { date: { lt: '2026-10-01' } },
      ],
    },
  })
  console.log(`Deleted Salary Advances: ${deletedAdvances.count}`)

  console.log('--- PURGE COMPLETE ---')
}

purgeSeptember()
  .catch((err) => {
    console.error('Purge error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
