import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentActiveMonth, isMonthArchived } from '@/lib/dateUtils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || getCurrentActiveMonth()
    const branch = searchParams.get('branch')
    const isArchived = isMonthArchived(month)

    const branchFilter = branch && branch !== 'All' ? { branch } : {}

    // 1. Fetch all CRM jobs for the selected month
    const jobs = await prisma.crmJob.findMany({
      where: { monthKey: month, ...branchFilter },
      orderBy: { date: 'asc' },
    })

    // 2. Fetch all Vendor Purchases for the selected month
    const purchases = await prisma.vendorPurchase.findMany({
      where: { monthKey: month, ...branchFilter },
      orderBy: { date: 'asc' },
    })

    // 3. Fetch General Operational Expenses (OpEx) for the selected month
    const expenses = await prisma.generalExpense.findMany({
      where: { monthKey: month, ...branchFilter },
      orderBy: { date: 'asc' },
    })

    // 4. Fetch Salary Advances for the selected month
    const salaryAdvances = await prisma.salaryAdvance.findMany({
      where: { monthKey: month, ...branchFilter },
      orderBy: { date: 'asc' },
    })

    // 5. Fetch Payroll Records for the selected month
    const payrollRecords = await prisma.payrollRecord.findMany({
      where: { monthKey: month, ...branchFilter },
      include: {
        employee: {
          select: { name: true, designation: true },
        },
      },
      orderBy: { date: 'asc' },
    })

    // 6. Compute CRM Job KPIs
    const totalInstallations = jobs.length
    let totalRevenue = 0
    let totalPaidRevenue = 0
    let clientPaymentsCash = 0
    let clientPaymentsBank = 0

    let customerTradeReceivables = 0
    let bydVoucherReceivables = 0
    let unsettledVoucherCount = 0
    let totalSettledVoucherAmount = 0

    let total16mmCost = 0
    let total10mmCost = 0
    let total6mmCost = 0
    let totalBreakerCost = 0
    let totalEarthingRodCost = 0
    let totalWpbCost = 0
    let totalNinUvrCost = 0
    let totalRcboBreakerCost = 0
    let totalAdditionalSupplyCost = 0
    let totalMiscExpenses = 0
    let totalJobCosts = 0
    let totalGrossProfit = 0

    let total16mmMeters = 0
    let total10mmMeters = 0
    let total6mmMeters = 0
    let totalBreakersCount = 0
    let totalEarthingRodsCount = 0
    let totalWpbCount = 0
    let totalNinUvrCount = 0
    let totalRcboBreakerCount = 0

    const sourceMap: Record<string, { count: number; revenue: number; grossProfit: number }> = {}
    const technicianMap: Record<string, { count: number; revenue: number; grossProfit: number; paidCount: number }> = {}

    for (const job of jobs) {
      totalRevenue += job.billAmount
      total16mmCost += (job.cable16mmTotalCost || 0)
      total10mmCost += job.cable10mmTotalCost
      total6mmCost += job.cable6mmTotalCost
      totalBreakerCost += job.breakerBoxTotalCost
      totalEarthingRodCost += job.earthingRodTotalCost || 0
      totalWpbCost += job.wpbTotalCost || 0
      totalNinUvrCost += job.ninUvrTotalCost || 0
      totalRcboBreakerCost += job.rcboBreakerTotalCost || 0
      totalAdditionalSupplyCost += job.additionalSupplyCost
      totalMiscExpenses += job.miscExp
      totalJobCosts += job.totalJobCost
      totalGrossProfit += job.grossProfit

      total16mmMeters += (job.cable16mmMeter || 0)
      total10mmMeters += job.cable10mmMeter
      total6mmMeters += job.cable6mmMeter
      totalBreakersCount += job.breakerBoxQty
      totalEarthingRodsCount += job.earthingRodQty || 0
      totalWpbCount += job.wpbQty || 0
      totalNinUvrCount += job.ninUvrQty || 0
      totalRcboBreakerCount += job.rcboBreakerQty || 0

      const isVoucherJob = job.isVoucher || job.payStatus === 'Voucher' || job.paymentStatus === 'Voucher'

      if (isVoucherJob) {
        // BYD Voucher workflow
        if (job.voucherSettled) {
          // Reimbursed by BYD
          const settledClaim = job.voucherNetClaim || 51150
          totalSettledVoucherAmount += settledClaim
          totalPaidRevenue += settledClaim
          const pm = (job.paymentMethod || '').toLowerCase()
          if (pm.includes('cash')) {
            clientPaymentsCash += settledClaim
          } else {
            clientPaymentsBank += settledClaim
          }
        } else {
          // Unsettled BYD claim
          const pendingClaim = job.voucherNetClaim || 51150
          bydVoucherReceivables += pendingClaim
          unsettledVoucherCount += 1
        }

        // Customer excess handling
        const excessPaid = job.customerExcessPaid || 0
        const excessReceivable = job.customerExcessReceivable || 0
        if (excessPaid > 0) {
          totalPaidRevenue += excessPaid
          const pm = (job.paymentMethod || '').toLowerCase()
          if (pm.includes('cash')) {
            clientPaymentsCash += excessPaid
          } else {
            clientPaymentsBank += excessPaid
          }
        }
        if (excessReceivable > 0) {
          customerTradeReceivables += excessReceivable
        }
      } else {
        // Standard (Non-voucher) job
        if (job.payStatus === 'Paid' || job.paymentStatus === 'Paid') {
          totalPaidRevenue += job.billAmount
          const pm = (job.paymentMethod || '').toLowerCase()
          if (pm.includes('cash')) {
            clientPaymentsCash += job.billAmount
          } else {
            clientPaymentsBank += job.billAmount
          }
        } else {
          customerTradeReceivables += job.billAmount
        }
      }

      // Source stats
      const src = job.source || 'Direct'
      if (!sourceMap[src]) sourceMap[src] = { count: 0, revenue: 0, grossProfit: 0 }
      sourceMap[src].count += 1
      sourceMap[src].revenue += job.billAmount
      sourceMap[src].grossProfit += job.grossProfit

      // Technician stats
      const tech = job.technicianName || 'Unassigned'
      if (!technicianMap[tech]) technicianMap[tech] = { count: 0, revenue: 0, grossProfit: 0, paidCount: 0 }
      technicianMap[tech].count += 1
      technicianMap[tech].revenue += job.billAmount
      technicianMap[tech].grossProfit += job.grossProfit
      if (job.payStatus === 'Paid' || job.paymentStatus === 'Paid') technicianMap[tech].paidCount += 1
    }

    const totalTradeReceivables = Math.round((customerTradeReceivables + bydVoucherReceivables) * 100) / 100

    // 7. Compute Vendor Purchases & Accounts Payable
    let totalPurchases = 0
    let vendorCashPurchases = 0
    let vendorBankPurchases = 0
    let vendorUnpaidPurchases = 0

    for (const p of purchases) {
      totalPurchases += p.totalAmount
      const pm = (p.paymentMethod || '').toLowerCase()
      if (pm.includes('cash')) {
        vendorCashPurchases += p.totalAmount
      } else if (pm.includes('bank')) {
        vendorBankPurchases += p.totalAmount
      } else if (pm.includes('unpaid') || pm.includes('credit')) {
        vendorUnpaidPurchases += p.totalAmount
      } else {
        vendorUnpaidPurchases += p.totalAmount
      }
    }

    // 8. Compute General Operational Expenses (OpEx)
    let totalGeneralExpenses = 0
    let cashGeneralExpenses = 0
    let bankGeneralExpenses = 0
    const opExCategoryMap: Record<string, number> = {}

    for (const exp of expenses) {
      totalGeneralExpenses += exp.amount
      const pm = (exp.paymentMethod || '').toLowerCase()
      if (pm.includes('cash')) {
        cashGeneralExpenses += exp.amount
      } else {
        bankGeneralExpenses += exp.amount
      }

      const cat = exp.category || 'General'
      opExCategoryMap[cat] = (opExCategoryMap[cat] || 0) + exp.amount
    }

    const opExCategoryList = Object.entries(opExCategoryMap).map(([category, amount]) => ({
      category,
      amount,
    })).sort((a, b) => b.amount - a.amount)

    // 9. Compute Salary Advances
    let totalSalaryAdvances = 0
    let cashSalaryAdvances = 0
    let bankSalaryAdvances = 0

    for (const adv of salaryAdvances) {
      totalSalaryAdvances += adv.amount
      const pm = (adv.paymentMethod || '').toLowerCase()
      if (pm.includes('cash')) {
        cashSalaryAdvances += adv.amount
      } else {
        bankSalaryAdvances += adv.amount
      }
    }

    // 10. Compute Staff Payroll
    let totalGrossPayroll = 0
    let totalNetPayroll = 0
    let totalAdvanceDeductions = 0
    let payrollBaseSalaries = 0
    let payrollOvertime = 0
    let payrollFood = 0
    let payrollFuel = 0
    let payrollInstallation = 0
    let cashPayrollOutflow = 0
    let bankPayrollOutflow = 0

    for (const pay of payrollRecords) {
      totalGrossPayroll += pay.totalGrossEarnings
      totalNetPayroll += pay.netPayable
      totalAdvanceDeductions += pay.advanceDeduction
      payrollBaseSalaries += pay.baseSalary
      payrollOvertime += pay.overtimeAmount
      payrollFood += pay.foodIncentive
      payrollFuel += pay.fuelIncentive
      payrollInstallation += pay.installationIncentive

      const pm = (pay.paymentMethod || '').toLowerCase()
      if (pm.includes('cash')) {
        cashPayrollOutflow += pay.netPayable
      } else {
        bankPayrollOutflow += pay.netPayable
      }
    }

    // 11. Expenditure Categorization (3-Tier Master Framework)
    const directProcurementTotal = Math.round(totalPurchases * 100) / 100
    const directProcurementSettled = Math.round((vendorCashPurchases + vendorBankPurchases) * 100) / 100
    const directProcurementUnpaid = Math.round(vendorUnpaidPurchases * 100) / 100

    const operationalOverheadTotal = Math.round((totalGeneralExpenses + totalMiscExpenses) * 100) / 100
    const payrollStaffExpensesTotal = Math.round(totalGrossPayroll * 100) / 100

    const totalOverallExpenditure = Math.round(
      (directProcurementTotal + operationalOverheadTotal + payrollStaffExpensesTotal) * 100
    ) / 100

    const expenditureBreakdown = {
      directProcurement: {
        total: directProcurementTotal,
        settled: directProcurementSettled,
        unpaid: directProcurementUnpaid,
        cash: vendorCashPurchases,
        bank: vendorBankPurchases,
        percentage: totalOverallExpenditure > 0
          ? Math.round((directProcurementTotal / totalOverallExpenditure) * 1000) / 10
          : 0,
      },
      operationalOverhead: {
        total: operationalOverheadTotal,
        generalOpEx: totalGeneralExpenses,
        siteMiscExpenses: totalMiscExpenses,
        cash: cashGeneralExpenses,
        bank: bankGeneralExpenses + totalMiscExpenses,
        categoryList: opExCategoryList,
        percentage: totalOverallExpenditure > 0
          ? Math.round((operationalOverheadTotal / totalOverallExpenditure) * 1000) / 10
          : 0,
      },
      payrollStaff: {
        total: payrollStaffExpensesTotal,
        baseSalaries: payrollBaseSalaries,
        overtime: payrollOvertime,
        food: payrollFood,
        fuel: payrollFuel,
        installation: payrollInstallation,
        advanceDeductions: totalAdvanceDeductions,
        netPaid: totalNetPayroll,
        cashNet: cashPayrollOutflow,
        bankNet: bankPayrollOutflow,
        percentage: totalOverallExpenditure > 0
          ? Math.round((payrollStaffExpensesTotal / totalOverallExpenditure) * 1000) / 10
          : 0,
      },
      totalOverallExpenditure,
    }

    // 12. Treasury / Cash & Bank Balances Formula
    // Available Cash = (Client Cash) - (Vendor Cash) - (OpEx Cash) - (Salary Advances Cash) - (Net Payroll Cash)
    const cashTotalOutflow = Math.round(
      (vendorCashPurchases + cashGeneralExpenses + cashSalaryAdvances + cashPayrollOutflow) * 100
    ) / 100
    const availableCash = Math.round((clientPaymentsCash - cashTotalOutflow) * 100) / 100

    // Available Bank = (Client Bank) - (Vendor Bank) - (Misc Exp) - (OpEx Bank) - (Salary Advances Bank) - (Net Payroll Bank)
    const bankTotalOutflow = Math.round(
      (vendorBankPurchases + totalMiscExpenses + bankGeneralExpenses + bankSalaryAdvances + bankPayrollOutflow) * 100
    ) / 100
    const availableBank = Math.round((clientPaymentsBank - bankTotalOutflow) * 100) / 100

    const totalLiquidBalance = Math.round((availableCash + availableBank) * 100) / 100
    const grossProfitMargin = totalRevenue > 0 ? Math.round((totalGrossProfit / totalRevenue) * 10000) / 100 : 0

    // 13. Source & Technician Analytics
    const sourceAnalytics = Object.entries(sourceMap).map(([source, stats]) => ({
      source,
      count: stats.count,
      revenue: stats.revenue,
      grossProfit: stats.grossProfit,
      percentageOfRevenue: totalRevenue > 0 ? Math.round((stats.revenue / totalRevenue) * 1000) / 10 : 0,
    })).sort((a, b) => b.revenue - a.revenue)

    const technicianAnalytics = Object.entries(technicianMap).map(([technician, stats]) => ({
      technician,
      count: stats.count,
      revenue: stats.revenue,
      grossProfit: stats.grossProfit,
      paidCount: stats.paidCount,
      avgRevenuePerJob: stats.count > 0 ? Math.round(stats.revenue / stats.count) : 0,
    })).sort((a, b) => b.revenue - a.revenue)

    // 14. Automated Income Statement (P&L) breakdown
    const totalDirectCOGS = Math.round(
      (total16mmCost +
        total10mmCost +
        total6mmCost +
        totalBreakerCost +
        totalEarthingRodCost +
        totalWpbCost +
        totalNinUvrCost +
        totalRcboBreakerCost +
        totalAdditionalSupplyCost) *
        100
    ) / 100

    const totalOperatingOverheads = Math.round(
      (totalGeneralExpenses + totalMiscExpenses + totalGrossPayroll) * 100
    ) / 100

    const netProfit = Math.round((totalRevenue - totalDirectCOGS - totalOperatingOverheads) * 100) / 100
    const netProfitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 10000) / 100 : 0

    const incomeStatement = {
      grossRevenue: totalRevenue,
      paidRevenue: totalPaidRevenue,
      uncollectedReceivables: totalTradeReceivables,
      customerTradeReceivables,
      bydVoucherReceivables,
      cogs: {
        cable16mmCost: total16mmCost,
        cable10mmCost: total10mmCost,
        cable6mmCost: total6mmCost,
        breakerBoxCost: totalBreakerCost,
        earthingRodCost: totalEarthingRodCost,
        wpbCost: totalWpbCost,
        ninUvrCost: totalNinUvrCost,
        rcboBreakerCost: totalRcboBreakerCost,
        additionalSupplyCost: totalAdditionalSupplyCost,
        totalDirectCOGS,
      },
      operatingExpenses: {
        generalExpenses: totalGeneralExpenses,
        generalExpensesByCategory: opExCategoryList,
        miscFieldExpenses: totalMiscExpenses,
        totalOverheads: totalGeneralExpenses + totalMiscExpenses,
      },
      payrollExpenses: {
        baseSalaries: payrollBaseSalaries,
        overtime: payrollOvertime,
        foodIncentives: payrollFood,
        fuelIncentives: payrollFuel,
        installationIncentives: payrollInstallation,
        advanceDeductions: totalAdvanceDeductions,
        totalGrossPayroll,
        totalNetPaid: totalNetPayroll,
      },
      totalOperatingOverheads,
      vendorProcurement: {
        totalPurchases,
        vendorCashPurchases,
        vendorBankPurchases,
        vendorUnpaidPurchases,
        vendorPayables: vendorUnpaidPurchases,
      },
      grossProfit: totalGrossProfit,
      netProfit,
      netProfitMargin,
    }

    // 15. Fetch distinct months for selector
    const distinctJobMonths = await prisma.crmJob.findMany({ select: { monthKey: true }, distinct: ['monthKey'] })
    const distinctPurchaseMonths = await prisma.vendorPurchase.findMany({ select: { monthKey: true }, distinct: ['monthKey'] })
    const distinctExpenseMonths = await prisma.generalExpense.findMany({ select: { monthKey: true }, distinct: ['monthKey'] })
    const distinctPayrollMonths = await prisma.payrollRecord.findMany({ select: { monthKey: true }, distinct: ['monthKey'] })

    const allMonthKeys = Array.from(
      new Set([
        month,
        getCurrentActiveMonth(),
        ...distinctJobMonths.map((j) => j.monthKey),
        ...distinctPurchaseMonths.map((p) => p.monthKey),
        ...distinctExpenseMonths.map((e) => e.monthKey),
        ...distinctPayrollMonths.map((r) => r.monthKey),
      ])
    ).filter((m) => m && m >= '2026-10')

    return NextResponse.json({
      success: true,
      month,
      branch: branch || 'All',
      isArchived,
      kpis: {
        totalInstallations,
        totalRevenue,
        totalTradeReceivables,
        customerTradeReceivables,
        bydVoucherReceivables,
        unsettledVoucherCount,
        totalPaidRevenue,
        totalGrossProfit,
        grossProfitMargin,
        totalJobCosts,
        totalPurchases,
        vendorCashPurchases,
        vendorBankPurchases,
        vendorUnpaidPurchases,
        vendorPayables: vendorUnpaidPurchases,
        totalGeneralExpenses,
        cashGeneralExpenses,
        bankGeneralExpenses,
        totalSalaryAdvances,
        totalGrossPayroll,
        totalNetPayroll,
        totalAdvanceDeductions,
        clientPaymentsCash,
        clientPaymentsBank,
        availableCash,
        availableBank,
        totalLiquidBalance,
        totalMiscExpenses,
        materialsUsed: {
          cable16mmMeters: total16mmMeters,
          cable10mmMeters: total10mmMeters,
          cable6mmMeters: total6mmMeters,
          breakersCount: totalBreakersCount,
          earthingRodsCount: totalEarthingRodsCount,
          wpbCount: totalWpbCount,
          ninUvrCount: totalNinUvrCount,
          rcboBreakersCount: totalRcboBreakerCount,
        },
      },
      expenditureBreakdown,
      cashBankFlow: {
        cash: {
          inflow: clientPaymentsCash,
          outflowVendor: vendorCashPurchases,
          outflowOpEx: cashGeneralExpenses,
          outflowAdvances: cashSalaryAdvances,
          outflowPayroll: cashPayrollOutflow,
          outflow: cashTotalOutflow,
          balance: availableCash,
        },
        bank: {
          inflow: clientPaymentsBank,
          outflowExpenses: totalMiscExpenses,
          outflowPurchases: vendorBankPurchases,
          outflowOpEx: bankGeneralExpenses,
          outflowAdvances: bankSalaryAdvances,
          outflowPayroll: bankPayrollOutflow,
          totalOutflow: bankTotalOutflow,
          balance: availableBank,
        },
        payables: {
          unpaidPurchases: vendorUnpaidPurchases,
        },
        totalBalance: totalLiquidBalance,
      },
      sourceAnalytics,
      technicianAnalytics,
      incomeStatement,
      availableMonths: allMonthKeys,
    })
  } catch (error: any) {
    console.error('Error computing dashboard metrics:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
