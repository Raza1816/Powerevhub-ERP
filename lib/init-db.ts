import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'
import bcrypt from 'bcryptjs'
import { prisma, getResolvedDatabaseUrl } from './prisma'
import { syncAllInventory, ensureMasterMaterialsExist } from './inventory'
import { DEFAULT_UNIT_RATES } from './pricing'

let isInitialized = false

export async function initDatabase() {
  if (isInitialized) return
  isInitialized = true

  console.log('[Startup Init] Checking database health and schema status...')

  try {
    const dbUrl = getResolvedDatabaseUrl()
    const prismaDir = path.resolve(process.cwd(), 'prisma')
    const schemaPath = path.resolve(prismaDir, 'schema.prisma')

    if (!fs.existsSync(prismaDir)) {
      fs.mkdirSync(prismaDir, { recursive: true })
    }

    // Step 1: Check if "User" table exists
    let userTableExists = false
    try {
      await prisma.user.count()
      userTableExists = true
    } catch {
      userTableExists = false
    }

    // Step 2: Ensure database schema exists non-destructively
    if (!userTableExists) {
      console.log('[Startup Init] Tables not found. Initializing database schema...')
      let pushSucceeded = false
      try {
        const prismaBin = path.resolve(process.cwd(), 'node_modules', '.bin', 'prisma')
        const cmd = fs.existsSync(prismaBin)
          ? `"${prismaBin}" db push --skip-generate`
          : `npx prisma db push --skip-generate`

        execSync(cmd, {
          cwd: process.cwd(),
          env: { ...process.env, DATABASE_URL: dbUrl },
          stdio: 'pipe',
        })
        pushSucceeded = true
        console.log('[Startup Init] ✓ Schema successfully pushed to database.')
      } catch (cliErr: any) {
        console.warn('[Startup Init] Prisma CLI push unavailable or failed, applying raw MySQL DDL fallback:', cliErr?.message || cliErr)
      }

      if (!pushSucceeded) {
        await applyRawDdl()
      }
    }

    // Step 3: Only seed static accounts if prisma.user.count() === 0
    try {
      const userCount = await prisma.user.count()
      if (userCount === 0) {
        console.log('[Startup Init] prisma.user.count() is 0. Seeding initial accounts...')
        await seedStaticUsers()
      } else {
        console.log(`[Startup Init] ✓ Existing users found (${userCount} user accounts). Skipping account seeding.`)
      }
    } catch (userErr: any) {
      console.warn('[Startup Init] User check notice:', userErr?.message || userErr)
    }

    // Step 4: Seed default unit rates and dropdowns if empty
    await seedDefaults()

    // Step 5: Ensure all 8 master material definitions exist with baseline 0 balances
    try {
      await ensureMasterMaterialsExist()
      console.log('[Startup Init] ✓ All 8 master material definitions verified and seeded.')
    } catch (matErr: any) {
      console.warn('[Startup Init] Master materials verification notice:', matErr.message)
    }

    // Step 6: Automatically sync warehouse inventory with all vendor purchases and CRM jobs
    try {
      await syncAllInventory()
      console.log('[Startup Init] ✓ Warehouse inventory ledger synchronized with vendor purchases.')
    } catch (syncErr: any) {
      console.warn('[Startup Init] Inventory auto-sync notice:', syncErr.message)
    }

    console.log('[Startup Init] ✓ Database initialization completed successfully.')
  } catch (error) {
    console.error('[Startup Init] Error initializing database:', error)
  }
}

async function applyRawDdl() {
  console.log('[Startup Init] Applying fallback MySQL table DDL...')
  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS \`User\` (
      \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
      \`username\` VARCHAR(191) NOT NULL UNIQUE,
      \`passwordHash\` VARCHAR(255) NOT NULL,
      \`role\` VARCHAR(50) NOT NULL DEFAULT 'viewer',
      \`name\` VARCHAR(191) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    );`,
    `CREATE TABLE IF NOT EXISTS \`UnitRate\` (
      \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
      \`itemName\` VARCHAR(191) NOT NULL,
      \`itemKey\` VARCHAR(191) NOT NULL UNIQUE,
      \`rate\` DOUBLE NOT NULL,
      \`unit\` VARCHAR(50) NOT NULL DEFAULT 'meter',
      \`effectiveDate\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`active\` BOOLEAN NOT NULL DEFAULT true,
      \`notes\` TEXT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    );`,
    `CREATE TABLE IF NOT EXISTS \`UnitRateHistory\` (
      \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
      \`itemKey\` VARCHAR(191) NOT NULL,
      \`itemName\` VARCHAR(191) NOT NULL,
      \`oldRate\` DOUBLE NOT NULL,
      \`newRate\` DOUBLE NOT NULL,
      \`unit\` VARCHAR(50) NOT NULL,
      \`changedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`notes\` TEXT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS \`DropdownValue\` (
      \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
      \`category\` VARCHAR(100) NOT NULL,
      \`value\` VARCHAR(100) NOT NULL,
      \`color\` VARCHAR(50) NULL,
      \`active\` BOOLEAN NOT NULL DEFAULT true,
      \`sortOrder\` INT NOT NULL DEFAULT 0,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY \`DropdownValue_category_value_key\` (\`category\`, \`value\`)
    );`,
    `CREATE TABLE IF NOT EXISTS \`AppConfig\` (
      \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
      \`key\` VARCHAR(191) NOT NULL UNIQUE,
      \`value\` TEXT NOT NULL,
      \`description\` TEXT NULL,
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    );`,
    `CREATE TABLE IF NOT EXISTS \`Employee\` (
      \`branch\` VARCHAR(50) NOT NULL DEFAULT 'Karachi',
      \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
      \`name\` VARCHAR(191) NOT NULL,
      \`designation\` VARCHAR(191) NOT NULL,
      \`baseSalary\` DOUBLE NOT NULL DEFAULT 0,
      \`defaultFuelAllocation\` DOUBLE NOT NULL DEFAULT 0,
      \`contactNo\` VARCHAR(50) NULL,
      \`dateOfJoining\` VARCHAR(20) NULL,
      \`active\` BOOLEAN NOT NULL DEFAULT true,
      \`notes\` TEXT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    );`,
    `CREATE TABLE IF NOT EXISTS \`GeneralExpense\` (
      \`branch\` VARCHAR(50) NOT NULL DEFAULT 'Karachi',
      \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
      \`date\` VARCHAR(20) NOT NULL,
      \`monthKey\` VARCHAR(20) NOT NULL,
      \`category\` VARCHAR(191) NOT NULL,
      \`amount\` DOUBLE NOT NULL,
      \`paymentMethod\` VARCHAR(50) NOT NULL DEFAULT 'Cash',
      \`notes\` TEXT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX \`GeneralExpense_monthKey_idx\` (\`monthKey\`),
      INDEX \`GeneralExpense_date_idx\` (\`date\`),
      INDEX \`GeneralExpense_paymentMethod_idx\` (\`paymentMethod\`),
      INDEX \`GeneralExpense_category_idx\` (\`category\`)
    );`,
    `CREATE TABLE IF NOT EXISTS \`InventoryLedger\` (
      \`branch\` VARCHAR(50) NOT NULL DEFAULT 'Karachi',
      \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
      \`date\` VARCHAR(20) NOT NULL,
      \`monthKey\` VARCHAR(20) NOT NULL,
      \`itemName\` VARCHAR(191) NOT NULL,
      \`itemKey\` VARCHAR(100) NOT NULL,
      \`unit\` VARCHAR(50) NOT NULL DEFAULT 'meter',
      \`karachiQty\` DOUBLE NOT NULL DEFAULT 0,
      \`lahoreQty\` DOUBLE NOT NULL DEFAULT 0,
      \`openingStock\` DOUBLE NOT NULL DEFAULT 0,
      \`usedQty\` DOUBLE NOT NULL DEFAULT 0,
      \`restockQty\` DOUBLE NOT NULL DEFAULT 0,
      \`closingStock\` DOUBLE NOT NULL DEFAULT 0,
      \`notes\` TEXT NULL,
      \`referenceId\` VARCHAR(191) NULL,
      \`movementType\` VARCHAR(50) NULL DEFAULT 'CRM_USAGE',
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX \`InventoryLedger_date_itemKey_branch_idx\` (\`date\`, \`itemKey\`, \`branch\`),
      INDEX \`InventoryLedger_monthKey_idx\` (\`monthKey\`),
      INDEX \`InventoryLedger_date_idx\` (\`date\`),
      INDEX \`InventoryLedger_referenceId_idx\` (\`referenceId\`),
      INDEX \`InventoryLedger_movementType_idx\` (\`movementType\`)
    );`,
    `CREATE TABLE IF NOT EXISTS \`SalaryAdvance\` (
      \`branch\` VARCHAR(50) NOT NULL DEFAULT 'Karachi',
      \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
      \`employeeId\` VARCHAR(191) NOT NULL,
      \`date\` VARCHAR(20) NOT NULL,
      \`monthKey\` VARCHAR(20) NOT NULL,
      \`amount\` DOUBLE NOT NULL,
      \`paymentMethod\` VARCHAR(50) NOT NULL DEFAULT 'Cash',
      \`deductedAmount\` DOUBLE NOT NULL DEFAULT 0,
      \`status\` VARCHAR(50) NOT NULL DEFAULT 'Active',
      \`notes\` TEXT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX \`SalaryAdvance_employeeId_idx\` (\`employeeId\`),
      INDEX \`SalaryAdvance_monthKey_idx\` (\`monthKey\`),
      INDEX \`SalaryAdvance_date_idx\` (\`date\`),
      CONSTRAINT \`SalaryAdvance_employeeId_fkey\` FOREIGN KEY (\`employeeId\`) REFERENCES \`Employee\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS \`PayrollRecord\` (
      \`branch\` VARCHAR(50) NOT NULL DEFAULT 'Karachi',
      \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
      \`employeeId\` VARCHAR(191) NOT NULL,
      \`date\` VARCHAR(20) NOT NULL,
      \`monthKey\` VARCHAR(20) NOT NULL,
      \`baseSalary\` DOUBLE NOT NULL DEFAULT 0,
      \`overtimeAmount\` DOUBLE NOT NULL DEFAULT 0,
      \`foodIncentive\` DOUBLE NOT NULL DEFAULT 0,
      \`fuelIncentive\` DOUBLE NOT NULL DEFAULT 0,
      \`installationIncentive\` DOUBLE NOT NULL DEFAULT 0,
      \`totalGrossEarnings\` DOUBLE NOT NULL DEFAULT 0,
      \`advanceDeduction\` DOUBLE NOT NULL DEFAULT 0,
      \`netPayable\` DOUBLE NOT NULL DEFAULT 0,
      \`paymentMethod\` VARCHAR(50) NOT NULL DEFAULT 'Bank',
      \`notes\` TEXT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX \`PayrollRecord_employeeId_idx\` (\`employeeId\`),
      INDEX \`PayrollRecord_monthKey_idx\` (\`monthKey\`),
      INDEX \`PayrollRecord_date_idx\` (\`date\`),
      CONSTRAINT \`PayrollRecord_employeeId_fkey\` FOREIGN KEY (\`employeeId\`) REFERENCES \`Employee\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS \`VendorPurchase\` (
      \`branch\` VARCHAR(50) NOT NULL DEFAULT 'Karachi',
      \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
      \`date\` VARCHAR(20) NOT NULL,
      \`monthKey\` VARCHAR(20) NOT NULL,
      \`vendorName\` VARCHAR(191) NOT NULL,
      \`invoiceNo\` VARCHAR(100) NOT NULL DEFAULT '',
      \`item\` VARCHAR(191) NOT NULL,
      \`itemKey\` VARCHAR(100) NOT NULL,
      \`quantity\` DOUBLE NOT NULL,
      \`unitRate\` DOUBLE NOT NULL,
      \`totalAmount\` DOUBLE NOT NULL,
      \`paymentMethod\` VARCHAR(50) NOT NULL DEFAULT 'Bank',
      \`settledDate\` VARCHAR(20) NULL,
      \`notes\` TEXT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX \`VendorPurchase_monthKey_idx\` (\`monthKey\`),
      INDEX \`VendorPurchase_date_idx\` (\`date\`),
      INDEX \`VendorPurchase_paymentMethod_idx\` (\`paymentMethod\`),
      INDEX \`VendorPurchase_branch_idx\` (\`branch\`)
    );`,
    `CREATE TABLE IF NOT EXISTS \`CrmJob\` (
      \`branch\` VARCHAR(50) NOT NULL DEFAULT 'Karachi',
      \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
      \`sn\` INT NOT NULL,
      \`date\` VARCHAR(20) NOT NULL,
      \`monthKey\` VARCHAR(20) NOT NULL,
      \`clientName\` VARCHAR(191) NOT NULL,
      \`contactNo\` VARCHAR(50) NOT NULL,
      \`addressArea\` TEXT NOT NULL,
      \`source\` VARCHAR(100) NOT NULL,
      \`technicianName\` VARCHAR(100) NOT NULL,
      \`cable16mmMeter\` DOUBLE NOT NULL DEFAULT 0,
      \`cable16mmUnitCost\` DOUBLE NOT NULL DEFAULT 0,
      \`cable16mmTotalCost\` DOUBLE NOT NULL DEFAULT 0,
      \`cable10mmMeter\` DOUBLE NOT NULL DEFAULT 0,
      \`cable10mmUnitCost\` DOUBLE NOT NULL DEFAULT 0,
      \`cable10mmTotalCost\` DOUBLE NOT NULL DEFAULT 0,
      \`cable6mmMeter\` DOUBLE NOT NULL DEFAULT 0,
      \`cable6mmUnitCost\` DOUBLE NOT NULL DEFAULT 0,
      \`cable6mmTotalCost\` DOUBLE NOT NULL DEFAULT 0,
      \`breakerBoxQty\` DOUBLE NOT NULL DEFAULT 0,
      \`breakerBoxUnitCost\` DOUBLE NOT NULL DEFAULT 0,
      \`breakerBoxTotalCost\` DOUBLE NOT NULL DEFAULT 0,
      \`earthingRodQty\` DOUBLE NOT NULL DEFAULT 0,
      \`earthingRodUnitCost\` DOUBLE NOT NULL DEFAULT 0,
      \`earthingRodTotalCost\` DOUBLE NOT NULL DEFAULT 0,
      \`wpbQty\` DOUBLE NOT NULL DEFAULT 0,
      \`wpbUnitCost\` DOUBLE NOT NULL DEFAULT 0,
      \`wpbTotalCost\` DOUBLE NOT NULL DEFAULT 0,
      \`ninUvrQty\` DOUBLE NOT NULL DEFAULT 0,
      \`ninUvrUnitCost\` DOUBLE NOT NULL DEFAULT 0,
      \`ninUvrTotalCost\` DOUBLE NOT NULL DEFAULT 0,
      \`rcboBreakerQty\` DOUBLE NOT NULL DEFAULT 0,
      \`rcboBreakerUnitCost\` DOUBLE NOT NULL DEFAULT 0,
      \`rcboBreakerTotalCost\` DOUBLE NOT NULL DEFAULT 0,
      \`additionalSupplyName\` VARCHAR(191) NOT NULL DEFAULT '',
      \`additionalSupplyCost\` DOUBLE NOT NULL DEFAULT 0,
      \`miscExp\` DOUBLE NOT NULL DEFAULT 0,
      \`vehicleBrand\` VARCHAR(50) NULL DEFAULT 'BYD',
      \`totalJobCost\` DOUBLE NOT NULL DEFAULT 0,
      \`billAmount\` DOUBLE NOT NULL DEFAULT 0,
      \`grossProfit\` DOUBLE NOT NULL DEFAULT 0,
      \`grossProfitMargin\` DOUBLE NOT NULL DEFAULT 0,
      \`payStatus\` VARCHAR(50) NOT NULL DEFAULT 'Trade Receivable',
      \`paymentStatus\` VARCHAR(50) NOT NULL DEFAULT 'Trade Receivable',
      \`paymentMethod\` VARCHAR(50) NOT NULL DEFAULT 'Cash',
      \`paidDate\` VARCHAR(20) NULL,
      \`isVoucher\` BOOLEAN NOT NULL DEFAULT false,
      \`voucherGrossAmount\` DOUBLE NULL DEFAULT 65000,
      \`voucherDeduction\` DOUBLE NULL DEFAULT 13850,
      \`voucherNetClaim\` DOUBLE NULL DEFAULT 51150,
      \`voucherSettled\` BOOLEAN NOT NULL DEFAULT false,
      \`voucherSettledDate\` DATETIME(3) NULL,
      \`customerExcessPaid\` DOUBLE NULL DEFAULT 0,
      \`customerExcessReceivable\` DOUBLE NULL DEFAULT 0,
      \`notes\` TEXT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX \`CrmJob_monthKey_idx\` (\`monthKey\`),
      INDEX \`CrmJob_date_idx\` (\`date\`),
      INDEX \`CrmJob_payStatus_idx\` (\`payStatus\`),
      INDEX \`CrmJob_paymentStatus_idx\` (\`paymentStatus\`),
      INDEX \`CrmJob_vehicleBrand_idx\` (\`vehicleBrand\`),
      INDEX \`CrmJob_isVoucher_idx\` (\`isVoucher\`),
      INDEX \`CrmJob_voucherSettled_idx\` (\`voucherSettled\`),
      INDEX \`CrmJob_source_idx\` (\`source\`),
      INDEX \`CrmJob_technicianName_idx\` (\`technicianName\`)
    );`,
  ]

  for (const sql of ddlStatements) {
    try {
      await prisma.$executeRawUnsafe(sql)
    } catch (e: any) {
      console.warn('[Startup Init] DDL statement notice:', e?.message || e)
    }
  }
}

export async function seedStaticUsers() {
  try {
    const userCount = await prisma.user.count()
    if (userCount > 0) {
      console.log(`[Startup Init] Users already exist (${userCount} user accounts). Skipping account seeding.`)
      return
    }

    const adminHash = bcrypt.hashSync('admin123', 10)
    await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash: adminHash,
        role: 'admin',
        name: 'System Admin',
      },
    })
    console.log('[Startup Init] ✓ Default Admin account created (admin / admin123)')

    const viewerHash = bcrypt.hashSync('viewer123', 10)
    await prisma.user.create({
      data: {
        username: 'viewer',
        passwordHash: viewerHash,
        role: 'viewer',
        name: 'Read-Only Viewer',
      },
    })
    console.log('[Startup Init] ✓ Default Viewer account created (viewer / viewer123)')
  } catch (err) {
    console.error('[Startup Init] Error seeding static users:', err)
  }
}

export async function seedDefaults() {
  try {
    // 1. Ensure all 8 master pricing unit rates exist
    for (const [itemKey, item] of Object.entries(DEFAULT_UNIT_RATES)) {
      const existing = await prisma.unitRate.findUnique({ where: { itemKey } })
      if (!existing) {
        await prisma.unitRate.create({
          data: {
            itemKey,
            itemName: item.name,
            rate: item.rate,
            unit: item.unit,
            active: true,
          },
        })
        console.log(`[Startup Init] ✓ Seeded master price card: ${item.name} (${itemKey}) @ Rs. ${item.rate}`)
      }
    }

    // 2. Ensure dropdown masters (Lead Sources, Technicians, Payment Methods, EV Vehicle Brands) if empty
    const dropdownCategories = ['SOURCE', 'TECHNICIAN', 'PAYMENT_METHOD', 'VEHICLE_BRAND']
    const defaultDropdowns = [
      // Lead Sources
      { category: 'SOURCE', value: 'Direct', sortOrder: 1 },
      { category: 'SOURCE', value: 'MJD/MTP', sortOrder: 2 },
      { category: 'SOURCE', value: 'Sarah South', sortOrder: 3 },
      { category: 'SOURCE', value: 'Dealership Alpha', sortOrder: 4 },
      { category: 'SOURCE', value: 'Social Media / Web', sortOrder: 5 },
      { category: 'SOURCE', value: 'Corporate Referral', sortOrder: 6 },
      // Technicians
      { category: 'TECHNICIAN', value: 'Team Alpha (Lead: Ali)', sortOrder: 1 },
      { category: 'TECHNICIAN', value: 'Team Beta (Lead: Imran)', sortOrder: 2 },
      { category: 'TECHNICIAN', value: 'Team Gamma (Lead: Farhan)', sortOrder: 3 },
      { category: 'TECHNICIAN', value: 'Team Delta (Lead: Usman)', sortOrder: 4 },
      // Payment Methods
      { category: 'PAYMENT_METHOD', value: 'Cash', sortOrder: 1 },
      { category: 'PAYMENT_METHOD', value: 'Bank Transfer', sortOrder: 2 },
      { category: 'PAYMENT_METHOD', value: 'Cheque', sortOrder: 3 },
      { category: 'PAYMENT_METHOD', value: 'Online Portal', sortOrder: 4 },
      // EV Vehicle Brands
      { category: 'VEHICLE_BRAND', value: 'BYD', sortOrder: 1 },
      { category: 'VEHICLE_BRAND', value: 'MG', sortOrder: 2 },
      { category: 'VEHICLE_BRAND', value: 'Deepal', sortOrder: 3 },
      { category: 'VEHICLE_BRAND', value: 'Audi', sortOrder: 4 },
      { category: 'VEHICLE_BRAND', value: 'Porsche', sortOrder: 5 },
      { category: 'VEHICLE_BRAND', value: 'Hyundai', sortOrder: 6 },
    ]

    for (const cat of dropdownCategories) {
      const count = await prisma.dropdownValue.count({ where: { category: cat } })
      if (count === 0) {
        const items = defaultDropdowns.filter((d) => d.category === cat)
        for (const item of items) {
          await prisma.dropdownValue.create({ data: item })
        }
        console.log(`[Startup Init] ✓ Seeded ${items.length} default values for dropdown master category: ${cat}`)
      }
    }
  } catch (err) {
    console.error('[Startup Init] Error seeding defaults:', err)
  }
}
