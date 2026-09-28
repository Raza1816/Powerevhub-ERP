import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentActiveMonth } from '@/lib/dateUtils'
import { calculateJobCosts } from '@/lib/pricing'
import { STANDARD_INVENTORY_ITEMS, syncInventoryForDate } from '@/lib/inventory'
import { ensureDefaultUsers } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const activeMonth = getCurrentActiveMonth()
    const [currYear, currMonth] = activeMonth.split('-').map(Number)

    // Calculate previous months for historical archives
    const prevDate1 = new Date(currYear, currMonth - 2, 1)
    const prevMonth1 = `${prevDate1.getFullYear()}-${String(prevDate1.getMonth() + 1).padStart(2, '0')}`

    const prevDate2 = new Date(currYear, currMonth - 3, 1)
    const prevMonth2 = `${prevDate2.getFullYear()}-${String(prevDate2.getMonth() + 1).padStart(2, '0')}`

    // 1. Clear existing CRM data if requested or seed clean
    await prisma.crmJob.deleteMany({})
    await prisma.vendorPurchase.deleteMany({})
    await prisma.inventoryLedger.deleteMany({})
    await prisma.unitRateHistory.deleteMany({})
    await prisma.unitRate.deleteMany({})
    await prisma.dropdownValue.deleteMany({})
    await prisma.generalExpense.deleteMany({})
    await prisma.salaryAdvance.deleteMany({})
    await prisma.payrollRecord.deleteMany({})
    await prisma.employee.deleteMany({})

    // 2. Seed Master Rates
    await prisma.unitRate.createMany({
      data: [
        { itemKey: 'cable_10mm', itemName: '10mm Cable', rate: 250, unit: 'meter', active: true, notes: 'Standard 10mm 4-core copper rate' },
        { itemKey: 'cable_6mm', itemName: '6mm Cable', rate: 180, unit: 'meter', active: true, notes: 'Standard 6mm 3-core copper rate' },
        { itemKey: 'breaker_box', itemName: 'DB Breaker Box', rate: 4500, unit: 'unit', active: true, notes: 'Standard IP65 Weatherproof DB' },
        { itemKey: 'earthing_rod', itemName: 'Earthing Rod', rate: 3500, unit: 'unit', active: true, notes: 'Copper Bonded 10ft Grounding Rod' },
        { itemKey: 'wpb', itemName: 'WPB Box', rate: 1500, unit: 'unit', active: true, notes: 'Waterproof Isolator Enclosure Box' },
        { itemKey: 'nin_uvr', itemName: 'NIN UVR', rate: 3800, unit: 'unit', active: true, notes: 'Digital Under/Over Voltage Protection Relay' },
        { itemKey: 'rcbo_breaker', itemName: 'RCBO Breaker', rate: 3200, unit: 'unit', active: true, notes: 'Residual Current Breaker with Overcurrent' },
      ],
    })

    // Seed Rate History
    await prisma.unitRateHistory.createMany({
      data: [
        { itemKey: 'cable_10mm', itemName: '10mm Cable', oldRate: 230, newRate: 250, unit: 'meter', notes: 'Supplier copper price index adjustment' },
        { itemKey: 'breaker_box', itemName: 'DB Breaker Box', oldRate: 4200, newRate: 4500, unit: 'unit', notes: 'Enclosure material cost inflation' },
        { itemKey: 'earthing_rod', itemName: 'Earthing Rod', oldRate: 3200, newRate: 3500, unit: 'unit', notes: 'Raw copper alloy import tariff increase' },
      ],
    })

    // 3. Seed Dropdown Options
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

    // 4. Sample Jobs Generator Helper
    const sampleJobsActive = [
      {
        sn: 1,
        date: `${activeMonth}-02`,
        clientName: 'Dr. Tariq Mahmood',
        contactNo: '+92 300 8451290',
        addressArea: 'Phase 5, DHA Lahore',
        source: 'Direct',
        technicianName: 'Team Alpha (Lead: Ali)',
        cable10mmMeter: 24,
        cable6mmMeter: 0,
        breakerBoxQty: 1,
        earthingRodQty: 1,
        wpbQty: 1,
        ninUvrQty: 1,
        rcboBreakerQty: 1,
        additionalSupplyName: '25mm PVC Conduit & Heavy Clamps',
        additionalSupplyCost: 3500,
        miscExp: 1200,
        billAmount: 58000,
        payStatus: 'Paid',
        paymentMethod: 'Bank Transfer',
        notes: '22kW Wallbox installation. Inspection passed successfully.',
      },
      {
        sn: 2,
        date: `${activeMonth}-05`,
        clientName: 'Zubair Commercial Plaza',
        contactNo: '+92 321 9923841',
        addressArea: 'Gulberg III, Main Boulevard',
        source: 'MJD/MTP',
        technicianName: 'Team Beta (Lead: Imran)',
        cable10mmMeter: 45,
        cable6mmMeter: 0,
        breakerBoxQty: 2,
        earthingRodQty: 2,
        wpbQty: 2,
        ninUvrQty: 2,
        rcboBreakerQty: 2,
        additionalSupplyName: 'Metal Trunking & 63A 4-Pole Isolator',
        additionalSupplyCost: 9200,
        miscExp: 2500,
        billAmount: 125000,
        payStatus: 'Paid',
        paymentMethod: 'Cash',
        notes: 'Dual 22kW Fast Chargers installed for office parking.',
      },
      {
        sn: 3,
        date: `${activeMonth}-08`,
        clientName: 'Mrs. Ayesha Haroon',
        contactNo: '+92 333 4109822',
        addressArea: 'Sector F-7/2, Islamabad',
        source: 'Sarah South',
        technicianName: 'Team Alpha (Lead: Ali)',
        cable10mmMeter: 0,
        cable6mmMeter: 18,
        breakerBoxQty: 1,
        earthingRodQty: 1,
        wpbQty: 1,
        ninUvrQty: 1,
        rcboBreakerQty: 1,
        additionalSupplyName: 'Flexible Conduit & Cable Lugs',
        additionalSupplyCost: 2400,
        miscExp: 800,
        billAmount: 42000,
        payStatus: 'Trade Receivable',
        paymentMethod: 'Bank Transfer',
        notes: '7kW Single Phase EV Charger. Invoice submitted to client.',
      },
      {
        sn: 4,
        date: `${activeMonth}-11`,
        clientName: 'Engr. Kamran Siddiqui',
        contactNo: '+92 345 5567812',
        addressArea: 'Bahria Town Phase 4, Rawalpindi',
        source: 'Dealership Alpha',
        technicianName: 'Team Gamma (Lead: Farhan)',
        cable10mmMeter: 32,
        cable6mmMeter: 0,
        breakerBoxQty: 1,
        earthingRodQty: 1,
        wpbQty: 1,
        ninUvrQty: 1,
        rcboBreakerQty: 1,
        additionalSupplyName: 'Heavy Duty GI Pipe & Cable Trenching',
        additionalSupplyCost: 6500,
        miscExp: 1500,
        billAmount: 76000,
        payStatus: 'Paid',
        paymentMethod: 'Cash',
        notes: 'Audi e-tron Home Charger 11kW setup.',
      },
      {
        sn: 5,
        date: `${activeMonth}-14`,
        clientName: 'Naveed Auto Showroom',
        contactNo: '+92 301 7788991',
        addressArea: 'Jail Road, Lahore',
        source: 'Direct',
        technicianName: 'Team Delta (Lead: Usman)',
        cable10mmMeter: 50,
        cable6mmMeter: 0,
        breakerBoxQty: 2,
        earthingRodQty: 2,
        wpbQty: 2,
        ninUvrQty: 2,
        rcboBreakerQty: 2,
        additionalSupplyName: 'Industrial Distribution Box & Lightning Arrester',
        additionalSupplyCost: 11000,
        miscExp: 3000,
        billAmount: 145000,
        payStatus: 'Trade Receivable',
        paymentMethod: 'Cheque',
        notes: 'Commercial Demo Pod Charging Station. Cheque clearance pending.',
      },
      {
        sn: 6,
        date: `${activeMonth}-17`,
        clientName: 'Brig. (R) Asadullah Khan',
        contactNo: '+92 300 5511234',
        addressArea: 'Askari 10, Lahore Cantt',
        source: 'Social Media / Web',
        technicianName: 'Team Beta (Lead: Imran)',
        cable10mmMeter: 16,
        cable6mmMeter: 0,
        breakerBoxQty: 1,
        earthingRodQty: 1,
        wpbQty: 1,
        ninUvrQty: 1,
        rcboBreakerQty: 1,
        additionalSupplyName: 'UV Resistant Corrugated Pipes',
        additionalSupplyCost: 2800,
        miscExp: 900,
        billAmount: 49000,
        payStatus: 'Paid',
        paymentMethod: 'Bank Transfer',
        notes: 'BYD Atto 3 7kW Charger installed in residential garage.',
      },
      {
        sn: 7,
        date: `${activeMonth}-19`,
        clientName: 'Hashim Logistics Hub',
        contactNo: '+92 322 8877665',
        addressArea: 'Sundar Industrial Estate',
        source: 'Corporate Referral',
        technicianName: 'Team Alpha (Lead: Ali)',
        cable10mmMeter: 60,
        cable6mmMeter: 0,
        breakerBoxQty: 2,
        earthingRodQty: 2,
        wpbQty: 2,
        ninUvrQty: 2,
        rcboBreakerQty: 2,
        additionalSupplyName: 'Industrial Cable Tray & 80A Isolator Switch',
        additionalSupplyCost: 14500,
        miscExp: 3500,
        billAmount: 175000,
        payStatus: 'Paid',
        paymentMethod: 'Bank Transfer',
        notes: 'EV Fleet Van charging terminal installation.',
      },
    ]

    // Insert active month jobs with locked rate 250 / 180 / 4500
    for (const j of sampleJobsActive) {
      const calc = calculateJobCosts({
        cable10mmMeter: j.cable10mmMeter,
        cable10mmUnitCost: 250,
        cable6mmMeter: j.cable6mmMeter,
        cable6mmUnitCost: 180,
        breakerBoxQty: j.breakerBoxQty,
        breakerBoxUnitCost: 4500,
        earthingRodQty: j.earthingRodQty,
        earthingRodUnitCost: 3500,
        wpbQty: j.wpbQty,
        wpbUnitCost: 1500,
        ninUvrQty: j.ninUvrQty,
        ninUvrUnitCost: 3800,
        rcboBreakerQty: j.rcboBreakerQty,
        rcboBreakerUnitCost: 3200,
        additionalSupplyCost: j.additionalSupplyCost,
        miscExp: j.miscExp,
        billAmount: j.billAmount,
      })

      await prisma.crmJob.create({
        data: {
          sn: j.sn,
          date: j.date,
          monthKey: activeMonth,
          clientName: j.clientName,
          contactNo: j.contactNo,
          addressArea: j.addressArea,
          source: j.source,
          technicianName: j.technicianName,
          cable10mmMeter: j.cable10mmMeter,
          cable10mmUnitCost: 250,
          cable10mmTotalCost: calc.cable10mmTotalCost,
          cable6mmMeter: j.cable6mmMeter,
          cable6mmUnitCost: 180,
          cable6mmTotalCost: calc.cable6mmTotalCost,
          breakerBoxQty: j.breakerBoxQty,
          breakerBoxUnitCost: 4500,
          breakerBoxTotalCost: calc.breakerBoxTotalCost,
          earthingRodQty: j.earthingRodQty,
          earthingRodUnitCost: 3500,
          earthingRodTotalCost: calc.earthingRodTotalCost,
          wpbQty: j.wpbQty,
          wpbUnitCost: 1500,
          wpbTotalCost: calc.wpbTotalCost,
          ninUvrQty: j.ninUvrQty,
          ninUvrUnitCost: 3800,
          ninUvrTotalCost: calc.ninUvrTotalCost,
          rcboBreakerQty: j.rcboBreakerQty,
          rcboBreakerUnitCost: 3200,
          rcboBreakerTotalCost: calc.rcboBreakerTotalCost,
          additionalSupplyName: j.additionalSupplyName,
          additionalSupplyCost: j.additionalSupplyCost,
          miscExp: j.miscExp,
          totalJobCost: calc.totalJobCost,
          billAmount: j.billAmount,
          grossProfit: calc.grossProfit,
          grossProfitMargin: calc.grossProfitMargin,
          payStatus: j.payStatus,
          paymentMethod: j.paymentMethod,
          paidDate: j.payStatus === 'Paid' ? j.date : null,
          notes: j.notes,
        },
      })
    }

    // 5. Seed Archived Month 1 (e.g. Previous Month) with its own Sn starting at 1!
    const sampleJobsArchived1 = [
      {
        sn: 1,
        date: `${prevMonth1}-04`,
        clientName: 'Sarmad Bilal',
        contactNo: '+92 300 1122334',
        addressArea: 'DHA Phase 6, Lahore',
        source: 'Direct',
        technicianName: 'Team Alpha (Lead: Ali)',
        cable10mmMeter: 20,
        cable6mmMeter: 0,
        breakerBoxQty: 1,
        additionalSupplyCost: 2500,
        miscExp: 1000,
        billAmount: 50000,
        payStatus: 'Paid',
        paymentMethod: 'Bank Transfer',
      },
      {
        sn: 2,
        date: `${prevMonth1}-12`,
        clientName: 'Apex Solar & EV Solutions',
        contactNo: '+92 321 4455667',
        addressArea: 'I-9 Industrial Area, Islamabad',
        source: 'MJD/MTP',
        technicianName: 'Team Beta (Lead: Imran)',
        cable10mmMeter: 35,
        cable6mmMeter: 0,
        breakerBoxQty: 1,
        additionalSupplyCost: 5000,
        miscExp: 1500,
        billAmount: 82000,
        payStatus: 'Paid',
        paymentMethod: 'Cash',
      },
      {
        sn: 3,
        date: `${prevMonth1}-22`,
        clientName: 'Dr. Shahzad Afzal',
        contactNo: '+92 333 7788112',
        addressArea: 'F-10/3, Islamabad',
        source: 'Sarah South',
        technicianName: 'Team Gamma (Lead: Farhan)',
        cable10mmMeter: 0,
        cable6mmMeter: 22,
        breakerBoxQty: 1,
        additionalSupplyCost: 3000,
        miscExp: 1100,
        billAmount: 46000,
        payStatus: 'Paid',
        paymentMethod: 'Bank Transfer',
      },
    ]

    for (const j of sampleJobsArchived1) {
      const calc = calculateJobCosts({
        cable10mmMeter: j.cable10mmMeter,
        cable10mmUnitCost: 230,
        cable6mmMeter: j.cable6mmMeter,
        cable6mmUnitCost: 180,
        breakerBoxQty: j.breakerBoxQty,
        breakerBoxUnitCost: 4200,
        earthingRodQty: 1,
        earthingRodUnitCost: 3200,
        wpbQty: 1,
        wpbUnitCost: 1500,
        ninUvrQty: 1,
        ninUvrUnitCost: 3800,
        rcboBreakerQty: 1,
        rcboBreakerUnitCost: 3200,
        additionalSupplyCost: j.additionalSupplyCost,
        miscExp: j.miscExp,
        billAmount: j.billAmount,
      })

      await prisma.crmJob.create({
        data: {
          sn: j.sn,
          date: j.date,
          monthKey: prevMonth1,
          clientName: j.clientName,
          contactNo: j.contactNo,
          addressArea: j.addressArea,
          source: j.source,
          technicianName: j.technicianName,
          cable10mmMeter: j.cable10mmMeter,
          cable10mmUnitCost: 230,
          cable10mmTotalCost: calc.cable10mmTotalCost,
          cable6mmMeter: j.cable6mmMeter,
          cable6mmUnitCost: 180,
          cable6mmTotalCost: calc.cable6mmTotalCost,
          breakerBoxQty: j.breakerBoxQty,
          breakerBoxUnitCost: 4200,
          breakerBoxTotalCost: calc.breakerBoxTotalCost,
          earthingRodQty: 1,
          earthingRodUnitCost: 3200,
          earthingRodTotalCost: calc.earthingRodTotalCost,
          wpbQty: 1,
          wpbUnitCost: 1500,
          wpbTotalCost: calc.wpbTotalCost,
          ninUvrQty: 1,
          ninUvrUnitCost: 3800,
          ninUvrTotalCost: calc.ninUvrTotalCost,
          rcboBreakerQty: 1,
          rcboBreakerUnitCost: 3200,
          rcboBreakerTotalCost: calc.rcboBreakerTotalCost,
          additionalSupplyName: 'Conduit & Accessories',
          additionalSupplyCost: j.additionalSupplyCost,
          miscExp: j.miscExp,
          totalJobCost: calc.totalJobCost,
          billAmount: j.billAmount,
          grossProfit: calc.grossProfit,
          grossProfitMargin: calc.grossProfitMargin,
          payStatus: j.payStatus,
          paymentMethod: j.paymentMethod,
          paidDate: j.date,
          notes: 'Archived historical job record.',
        },
      })
    }

    // 6. Seed Vendor Purchases
    const samplePurchases = [
      {
        date: `${activeMonth}-01`,
        monthKey: activeMonth,
        vendorName: 'Pakistan Cables Limited',
        invoiceNo: 'PCL-2026-891',
        item: '10mm 4-Core Copper Cable (300m Roll)',
        itemKey: 'cable_10mm',
        quantity: 300,
        unitRate: 215,
        totalAmount: 64500,
        paymentMethod: 'Bank',
        notes: 'Monthly bulk cable delivery',
      },
      {
        date: `${activeMonth}-03`,
        monthKey: activeMonth,
        vendorName: 'Schneider Electric Distributor',
        invoiceNo: 'SCH-7782',
        item: 'DB Box Weatherproof IP65',
        itemKey: 'breaker_box',
        quantity: 15,
        unitRate: 3800,
        totalAmount: 57000,
        paymentMethod: 'Bank',
        notes: 'Enclosures stock batch',
      },
      {
        date: `${activeMonth}-07`,
        monthKey: activeMonth,
        vendorName: 'Hafiz Electrical Supplies',
        invoiceNo: 'HES-1044',
        item: 'Earthing Rods Copper Coated 10ft',
        itemKey: 'earthing_rod',
        quantity: 20,
        unitRate: 1400,
        totalAmount: 28000,
        paymentMethod: 'Cash',
        notes: 'Cash purchase for earthing stock',
      },
      {
        date: `${activeMonth}-10`,
        monthKey: activeMonth,
        vendorName: 'Pakistan Cables Limited',
        invoiceNo: 'PCL-2026-904',
        item: '6mm 3-Core Copper Cable (200m Roll)',
        itemKey: 'cable_6mm',
        quantity: 200,
        unitRate: 150,
        totalAmount: 30000,
        paymentMethod: 'Bank',
        notes: 'Single phase cable restocking',
      },
      {
        date: `${activeMonth}-15`,
        monthKey: activeMonth,
        vendorName: 'Al-Madina Hardware Mart',
        invoiceNo: 'MHM-552',
        item: 'WPB (Waterproof Boxes) & UV Conduit',
        itemKey: 'wpb',
        quantity: 25,
        unitRate: 650,
        totalAmount: 16250,
        paymentMethod: 'Cash',
        notes: 'Cash hardware restock',
      },
      // Previous Month Purchases
      {
        date: `${prevMonth1}-02`,
        monthKey: prevMonth1,
        vendorName: 'Pakistan Cables Limited',
        invoiceNo: 'PCL-2026-710',
        item: '10mm Copper Cable (250m)',
        itemKey: 'cable_10mm',
        quantity: 250,
        unitRate: 200,
        totalAmount: 50000,
        paymentMethod: 'Bank',
      },
      {
        date: `${prevMonth1}-10`,
        monthKey: prevMonth1,
        vendorName: 'Schneider Electric Distributor',
        invoiceNo: 'SCH-6910',
        item: 'Breaker Box DB',
        itemKey: 'breaker_box',
        quantity: 10,
        unitRate: 3600,
        totalAmount: 36000,
        paymentMethod: 'Bank',
      },
    ]

    for (const p of samplePurchases) {
      await prisma.vendorPurchase.create({ data: p })
    }

    // 7. Seed General Operational Expenses (OpEx)
    const sampleExpenses = [
      {
        date: `${activeMonth}-01`,
        monthKey: activeMonth,
        category: 'Office Rent',
        amount: 65000,
        paymentMethod: 'Bank',
        notes: 'Main Operations Hub rent for current month (Bank Transfer)',
      },
      {
        date: `${activeMonth}-04`,
        monthKey: activeMonth,
        category: 'Generator Fuel',
        amount: 14500,
        paymentMethod: 'Cash',
        notes: '70L Diesel for backup generator during loadshedding',
      },
      {
        date: `${activeMonth}-09`,
        monthKey: activeMonth,
        category: 'Stationery & Printing',
        amount: 4800,
        paymentMethod: 'Cash',
        notes: 'Installation voucher job sheets, safety hazard stickers & file folders',
      },
      {
        date: `${activeMonth}-12`,
        monthKey: activeMonth,
        category: 'Tea & Refreshments',
        amount: 6200,
        paymentMethod: 'Cash',
        notes: 'Technician morning tea, mineral water, and guest refreshments',
      },
      {
        date: `${activeMonth}-16`,
        monthKey: activeMonth,
        category: 'Office Maintenance & Comms',
        amount: 5500,
        paymentMethod: 'Bank',
        notes: 'High-speed fiber internet and office electrical consumables',
      },
    ]

    for (const exp of sampleExpenses) {
      await prisma.generalExpense.create({ data: exp })
    }

    // 8. Seed Employee Master Profiles
    const emp1 = await prisma.employee.create({
      data: {
        name: 'Ali Raza',
        designation: 'Lead Electrician & Field In-Charge',
        baseSalary: 60000,
        defaultFuelAllocation: 15000,
        contactNo: '+92 300 4567891',
        dateOfJoining: '2024-01-15',
        notes: 'Senior certified electrician with 8+ years EV charging experience.',
      },
    })

    const emp2 = await prisma.employee.create({
      data: {
        name: 'Imran Khan',
        designation: 'Senior EV Charger Installer',
        baseSalary: 50000,
        defaultFuelAllocation: 15000,
        contactNo: '+92 321 6543210',
        dateOfJoining: '2024-03-01',
        notes: 'Specialist in 22kW three-phase commercial charger installations.',
      },
    })

    const emp3 = await prisma.employee.create({
      data: {
        name: 'Farhan Ahmed',
        designation: 'Field Operations Supervisor',
        baseSalary: 55000,
        defaultFuelAllocation: 20000,
        contactNo: '+92 333 7891234',
        dateOfJoining: '2024-02-10',
        notes: 'Oversees site surveys, load approvals, and client sign-offs.',
      },
    })

    const emp4 = await prisma.employee.create({
      data: {
        name: 'Usman Malik',
        designation: 'Junior EV Technician',
        baseSalary: 38000,
        defaultFuelAllocation: 10000,
        contactNo: '+92 345 1234567',
        dateOfJoining: '2024-06-01',
        notes: 'Assists in cable trenching, conduit routing, and DB mounting.',
      },
    })

    // 9. Seed Salary Advances
    await prisma.salaryAdvance.create({
      data: {
        employeeId: emp1.id,
        date: `${activeMonth}-03`,
        monthKey: activeMonth,
        amount: 15000,
        paymentMethod: 'Cash',
        deductedAmount: 10000,
        status: 'Active', // 5,000 remaining
        notes: 'Advance for household repairs',
      },
    })

    await prisma.salaryAdvance.create({
      data: {
        employeeId: emp4.id,
        date: `${activeMonth}-06`,
        monthKey: activeMonth,
        amount: 8000,
        paymentMethod: 'Cash',
        deductedAmount: 0,
        status: 'Active', // 8,000 outstanding
        notes: 'Emergency advance',
      },
    })

    // 10. Seed Payroll Records
    await prisma.payrollRecord.create({
      data: {
        employeeId: emp1.id,
        date: `${activeMonth}-15`,
        monthKey: activeMonth,
        baseSalary: 60000,
        overtimeAmount: 3500,
        foodIncentive: 2500,
        fuelIncentive: 7500, // Mid-month 50% fuel payout
        installationIncentive: 5000,
        totalGrossEarnings: 78500,
        advanceDeduction: 10000,
        netPayable: 68500,
        paymentMethod: 'Bank',
        notes: 'Mid-month payroll run with 50% fuel and advance recovery.',
      },
    })

    await prisma.payrollRecord.create({
      data: {
        employeeId: emp2.id,
        date: `${activeMonth}-15`,
        monthKey: activeMonth,
        baseSalary: 50000,
        overtimeAmount: 2000,
        foodIncentive: 2500,
        fuelIncentive: 7500,
        installationIncentive: 4000,
        totalGrossEarnings: 66000,
        advanceDeduction: 0,
        netPayable: 66000,
        paymentMethod: 'Bank',
        notes: 'Standard pay run with field incentives.',
      },
    })

    await prisma.payrollRecord.create({
      data: {
        employeeId: emp3.id,
        date: `${activeMonth}-15`,
        monthKey: activeMonth,
        baseSalary: 55000,
        overtimeAmount: 0,
        foodIncentive: 2500,
        fuelIncentive: 10000,
        installationIncentive: 6000,
        totalGrossEarnings: 73500,
        advanceDeduction: 0,
        netPayable: 73500,
        paymentMethod: 'Bank',
        notes: 'Supervisor compensation package.',
      },
    })

    // 11. Seed Initial Warehouse Opening Stock Ledger on first day of month
    const initialOpeningStocks: Record<string, number> = {
      cable_10mm: 500,
      cable_6mm: 350,
      breaker_box: 30,
      earthing_rod: 40,
      wpb: 45,
      nin_uvr: 25,
      rcbo_breaker: 30,
    }

    for (const item of STANDARD_INVENTORY_ITEMS) {
      const opening = initialOpeningStocks[item.key] || 100
      await prisma.inventoryLedger.create({
        data: {
          date: `${activeMonth}-01`,
          monthKey: activeMonth,
          itemName: item.name,
          itemKey: item.key,
          unit: item.unit,
          openingStock: opening,
          usedQty: 0,
          restockQty: 0,
          closingStock: opening,
          notes: 'Beginning of month opening stock',
        },
      })
    }

    // Sync all dates where jobs or purchases occurred
    const activeDates = Array.from(
      new Set([
        ...sampleJobsActive.map((j) => j.date),
        ...samplePurchases.filter((p) => p.monthKey === activeMonth).map((p) => p.date),
      ])
    )

    for (const d of activeDates) {
      await syncInventoryForDate(d)
    }

    await ensureDefaultUsers()

    return NextResponse.json({
      success: true,
      message: 'Comprehensive sample data seeded successfully for Power EV Hub ERP!',
      activeMonth,
      archivedMonth: prevMonth1,
    })
  } catch (error: any) {
    console.error('Error seeding data:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
