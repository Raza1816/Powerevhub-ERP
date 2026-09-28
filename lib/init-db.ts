import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'
import bcrypt from 'bcryptjs'
import { prisma, getResolvedDatabaseUrl } from './prisma'

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

    // Step 1: Check if "User" table exists in sqlite_master
    let userTableExists = false
    try {
      const res: any = await prisma.$queryRawUnsafe(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='User';"
      )
      if (Array.isArray(res) && res.length > 0) {
        userTableExists = true
      }
    } catch {
      userTableExists = false
    }

    // Step 2: If tables are missing or not in sync, execute schema push / creation
    if (!userTableExists) {
      console.log('[Startup Init] Tables missing. Synchronizing database schema...')

      let pushSucceeded = false
      try {
        const prismaBin = path.resolve(process.cwd(), 'node_modules', '.bin', 'prisma')
        const cmd = fs.existsSync(prismaBin)
          ? `"${prismaBin}" db push --schema="${schemaPath}" --accept-data-loss --skip-generate`
          : `npx prisma db push --schema="${schemaPath}" --accept-data-loss --skip-generate`

        execSync(cmd, {
          cwd: process.cwd(),
          env: { ...process.env, DATABASE_URL: dbUrl },
          stdio: 'pipe',
        })
        pushSucceeded = true
        console.log('[Startup Init] ✓ Schema successfully pushed via Prisma CLI.')
      } catch (cliErr: any) {
        console.warn('[Startup Init] Prisma CLI push unavailable or failed, applying raw DDL fallback:', cliErr?.message || cliErr)
      }

      // If push didn't succeed, create tables directly with raw SQL
      if (!pushSucceeded) {
        await applyRawDdl()
      }
    } else {
      console.log('[Startup Init] ✓ Database tables already present.')
    }

    // Step 3: Seed Admin and Viewer users if not present
    await seedStaticUsers()

    // Step 4: Seed default unit rates and dropdowns if empty
    await seedDefaults()

    console.log('[Startup Init] ✓ Database initialization completed successfully.')
  } catch (error) {
    console.error('[Startup Init] Error initializing database:', error)
  }
}

async function applyRawDdl() {
  console.log('[Startup Init] Applying fallback SQLite table DDL...')
  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "username" TEXT NOT NULL UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'viewer',
      "name" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS "UnitRate" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "itemName" TEXT NOT NULL,
      "itemKey" TEXT NOT NULL UNIQUE,
      "rate" REAL NOT NULL,
      "unit" TEXT NOT NULL DEFAULT 'meter',
      "effectiveDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS "UnitRateHistory" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "itemKey" TEXT NOT NULL,
      "itemName" TEXT NOT NULL,
      "oldRate" REAL NOT NULL,
      "newRate" REAL NOT NULL,
      "unit" TEXT NOT NULL,
      "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "notes" TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS "DropdownValue" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "category" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "color" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("category", "value")
    );`,
    `CREATE TABLE IF NOT EXISTS "AppConfig" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "key" TEXT NOT NULL UNIQUE,
      "value" TEXT NOT NULL,
      "description" TEXT,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS "Employee" (
      "branch" TEXT NOT NULL DEFAULT 'Karachi',
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "designation" TEXT NOT NULL,
      "baseSalary" REAL NOT NULL DEFAULT 0,
      "defaultFuelAllocation" REAL NOT NULL DEFAULT 0,
      "contactNo" TEXT,
      "dateOfJoining" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS "GeneralExpense" (
      "branch" TEXT NOT NULL DEFAULT 'Karachi',
      "id" TEXT NOT NULL PRIMARY KEY,
      "date" TEXT NOT NULL,
      "monthKey" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "amount" REAL NOT NULL,
      "paymentMethod" TEXT NOT NULL DEFAULT 'Cash',
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS "InventoryLedger" (
      "branch" TEXT NOT NULL DEFAULT 'Karachi',
      "id" TEXT NOT NULL PRIMARY KEY,
      "date" TEXT NOT NULL,
      "monthKey" TEXT NOT NULL,
      "itemName" TEXT NOT NULL,
      "itemKey" TEXT NOT NULL,
      "unit" TEXT NOT NULL DEFAULT 'meter',
      "karachiQty" REAL NOT NULL DEFAULT 0,
      "lahoreQty" REAL NOT NULL DEFAULT 0,
      "openingStock" REAL NOT NULL DEFAULT 0,
      "usedQty" REAL NOT NULL DEFAULT 0,
      "restockQty" REAL NOT NULL DEFAULT 0,
      "closingStock" REAL NOT NULL DEFAULT 0,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS "PayrollRecord" (
      "branch" TEXT NOT NULL DEFAULT 'Karachi',
      "id" TEXT NOT NULL PRIMARY KEY,
      "employeeId" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "monthKey" TEXT NOT NULL,
      "baseSalary" REAL NOT NULL DEFAULT 0,
      "overtimeAmount" REAL NOT NULL DEFAULT 0,
      "foodIncentive" REAL NOT NULL DEFAULT 0,
      "fuelIncentive" REAL NOT NULL DEFAULT 0,
      "installationIncentive" REAL NOT NULL DEFAULT 0,
      "totalGrossEarnings" REAL NOT NULL DEFAULT 0,
      "advanceDeduction" REAL NOT NULL DEFAULT 0,
      "netPayable" REAL NOT NULL DEFAULT 0,
      "paymentMethod" TEXT NOT NULL DEFAULT 'Bank',
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "SalaryAdvance" (
      "branch" TEXT NOT NULL DEFAULT 'Karachi',
      "id" TEXT NOT NULL PRIMARY KEY,
      "employeeId" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "monthKey" TEXT NOT NULL,
      "amount" REAL NOT NULL,
      "paymentMethod" TEXT NOT NULL DEFAULT 'Cash',
      "deductedAmount" REAL NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'Active',
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "VendorPurchase" (
      "branch" TEXT NOT NULL DEFAULT 'Karachi',
      "id" TEXT NOT NULL PRIMARY KEY,
      "date" TEXT NOT NULL,
      "monthKey" TEXT NOT NULL,
      "vendorName" TEXT NOT NULL,
      "invoiceNo" TEXT NOT NULL DEFAULT '',
      "item" TEXT NOT NULL,
      "itemKey" TEXT NOT NULL,
      "quantity" REAL NOT NULL,
      "unitRate" REAL NOT NULL,
      "totalAmount" REAL NOT NULL,
      "paymentMethod" TEXT NOT NULL DEFAULT 'Bank',
      "settledDate" TEXT,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS "CrmJob" (
      "branch" TEXT NOT NULL DEFAULT 'Karachi',
      "id" TEXT NOT NULL PRIMARY KEY,
      "sn" INTEGER NOT NULL,
      "date" TEXT NOT NULL,
      "monthKey" TEXT NOT NULL,
      "clientName" TEXT NOT NULL,
      "contactNo" TEXT NOT NULL,
      "addressArea" TEXT NOT NULL,
      "source" TEXT NOT NULL,
      "technicianName" TEXT NOT NULL,
      "cable16mmMeter" REAL NOT NULL DEFAULT 0,
      "cable16mmUnitCost" REAL NOT NULL DEFAULT 0,
      "cable16mmTotalCost" REAL NOT NULL DEFAULT 0,
      "cable10mmMeter" REAL NOT NULL DEFAULT 0,
      "cable10mmUnitCost" REAL NOT NULL DEFAULT 0,
      "cable10mmTotalCost" REAL NOT NULL DEFAULT 0,
      "cable6mmMeter" REAL NOT NULL DEFAULT 0,
      "cable6mmUnitCost" REAL NOT NULL DEFAULT 0,
      "cable6mmTotalCost" REAL NOT NULL DEFAULT 0,
      "breakerBoxQty" REAL NOT NULL DEFAULT 0,
      "breakerBoxUnitCost" REAL NOT NULL DEFAULT 0,
      "breakerBoxTotalCost" REAL NOT NULL DEFAULT 0,
      "earthingRodQty" REAL NOT NULL DEFAULT 0,
      "earthingRodUnitCost" REAL NOT NULL DEFAULT 0,
      "earthingRodTotalCost" REAL NOT NULL DEFAULT 0,
      "wpbQty" REAL NOT NULL DEFAULT 0,
      "wpbUnitCost" REAL NOT NULL DEFAULT 0,
      "wpbTotalCost" REAL NOT NULL DEFAULT 0,
      "ninUvrQty" REAL NOT NULL DEFAULT 0,
      "ninUvrUnitCost" REAL NOT NULL DEFAULT 0,
      "ninUvrTotalCost" REAL NOT NULL DEFAULT 0,
      "rcboBreakerQty" REAL NOT NULL DEFAULT 0,
      "rcboBreakerUnitCost" REAL NOT NULL DEFAULT 0,
      "rcboBreakerTotalCost" REAL NOT NULL DEFAULT 0,
      "additionalSupplyName" TEXT NOT NULL DEFAULT '',
      "additionalSupplyCost" REAL NOT NULL DEFAULT 0,
      "miscExp" REAL NOT NULL DEFAULT 0,
      "vehicleBrand" TEXT DEFAULT 'BYD',
      "totalJobCost" REAL NOT NULL DEFAULT 0,
      "billAmount" REAL NOT NULL DEFAULT 0,
      "grossProfit" REAL NOT NULL DEFAULT 0,
      "grossProfitMargin" REAL NOT NULL DEFAULT 0,
      "payStatus" TEXT NOT NULL DEFAULT 'Trade Receivable',
      "paymentStatus" TEXT NOT NULL DEFAULT 'Trade Receivable',
      "paymentMethod" TEXT NOT NULL DEFAULT 'Cash',
      "paidDate" TEXT,
      "isVoucher" BOOLEAN NOT NULL DEFAULT false,
      "voucherGrossAmount" REAL DEFAULT 65000,
      "voucherDeduction" REAL DEFAULT 13850,
      "voucherNetClaim" REAL DEFAULT 51150,
      "voucherSettled" BOOLEAN NOT NULL DEFAULT false,
      "voucherSettledDate" DATETIME,
      "customerExcessPaid" REAL DEFAULT 0,
      "customerExcessReceivable" REAL DEFAULT 0,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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

async function seedStaticUsers() {
  try {
    const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } })
    if (!adminUser) {
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
    }

    const viewerUser = await prisma.user.findUnique({ where: { username: 'viewer' } })
    if (!viewerUser) {
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
    }
  } catch (err) {
    console.error('[Startup Init] Error seeding static users:', err)
  }
}

async function seedDefaults() {
  try {
    const ratesCount = await prisma.unitRate.count()
    if (ratesCount === 0) {
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
      console.log('[Startup Init] ✓ Default Unit Rates seeded')
    }

    const dropdownCount = await prisma.dropdownValue.count()
    if (dropdownCount === 0) {
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
        { category: 'VEHICLE_BRAND', value: 'BYD', sortOrder: 1 },
        { category: 'VEHICLE_BRAND', value: 'MG', sortOrder: 2 },
        { category: 'VEHICLE_BRAND', value: 'Deepal', sortOrder: 3 },
        { category: 'VEHICLE_BRAND', value: 'Audi', sortOrder: 4 },
        { category: 'VEHICLE_BRAND', value: 'Porsche', sortOrder: 5 },
        { category: 'VEHICLE_BRAND', value: 'Hyundai', sortOrder: 6 },
      ]
      for (const d of dropdowns) {
        await prisma.dropdownValue.create({ data: d })
      }
      console.log('[Startup Init] ✓ Default Dropdown Values seeded')
    }
  } catch (err) {
    console.error('[Startup Init] Error seeding defaults:', err)
  }
}
