'use server'

import { createClient } from '@/lib/supabase/server'
import { getMonthlyTotals } from './transactions'
import { getBudgetItems } from './budget'
import type { MonthlyReportData, QuarterlyReportData, YearlyReportData, CategoryBudgetStatus, MonthlySavingsData } from '@/types'

export async function getMonthlyReport(month: string): Promise<MonthlyReportData> {
  const supabase = await createClient()

  // Parse month to get previous month
  const [y, m] = month.split('-').map(Number)
  const prevDate = new Date(y, m - 2, 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  const start = `${month}-01`
  const endDate = new Date(y, m, 0)
  const end = `${y}-${String(m).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  // Fetch all data in parallel
  const [current, prev, expenseBudgets, incomeBudgets, prevIncomeBudgets, prevExpenseBudgets, categoriesRes, savingsAccountsRes, savingsTxRes] = await Promise.all([
    getMonthlyTotals(month),
    getMonthlyTotals(prevMonth),
    getBudgetItems({ type: 'expense', month }),
    getBudgetItems({ type: 'income', month }),
    getBudgetItems({ type: 'income', month: prevMonth }),
    getBudgetItems({ type: 'expense', month: prevMonth }),
    supabase
      .from('expense_categories')
      .select('id, name, budget_limit')
      .eq('is_active', true)
      .gt('budget_limit', 0),
    supabase
      .from('savings_accounts')
      .select('*')
      .eq('is_active', true),
    supabase
      .from('savings_transactions')
      .select('amount')
      .gte('transaction_date', start)
      .lte('transaction_date', end),
  ])

  // budget_items 합산 (transactions가 없을 때 예산 기준 표시)
  const budgetIncome = incomeBudgets.reduce((s, i) => s + i.amount, 0)
  const budgetExpense = expenseBudgets.reduce((s, i) => s + i.amount, 0)
  const prevBudgetIncome = prevIncomeBudgets.reduce((s, i) => s + i.amount, 0)
  const prevBudgetExpense = prevExpenseBudgets.reduce((s, i) => s + i.amount, 0)

  // 실제 거래가 있으면 그걸 쓰고, 없으면 예산 데이터를 사용
  const totalIncome = current.totalIncome || budgetIncome
  const totalExpense = current.totalExpense || budgetExpense
  const prevTotalIncome = prev.totalIncome || prevBudgetIncome
  const prevTotalExpense = prev.totalExpense || prevBudgetExpense

  // Budget vs Actual: get actual spending per category
  const { data: txData } = await supabase
    .from('transactions')
    .select('category_id, amount, expense_categories(name)')
    .eq('type', 'expense')
    .gte('transaction_date', start)
    .lte('transaction_date', end)

  // Aggregate actual spending by category_id
  const actualByCategory: Record<string, { name: string; amount: number }> = {}
  for (const row of txData ?? []) {
    const catId = row.category_id ?? 'uncategorized'
    const catName = ((row.expense_categories as unknown) as { name: string } | null)?.name ?? '미분류'
    if (!actualByCategory[catId]) {
      actualByCategory[catId] = { name: catName, amount: 0 }
    }
    actualByCategory[catId].amount += row.amount
  }

  // Build budget vs actual
  const budgetVsActual = expenseBudgets.map((item) => {
    const catId = item.category_id ?? 'uncategorized'
    const actual = actualByCategory[catId]?.amount ?? 0
    return {
      category_id: catId,
      category_name: item.category_name ?? item.name,
      budget: item.amount,
      actual,
      difference: item.amount - actual,
    }
  })

  // Category budget status (한도 대비 실사용)
  const categories = categoriesRes.data ?? []
  const categoryBudgetStatus: CategoryBudgetStatus[] = categories.map((cat) => {
    const actual = actualByCategory[cat.id]?.amount ?? 0
    const limit = cat.budget_limit
    return {
      category_id: cat.id,
      category_name: cat.name,
      budget_limit: limit,
      actual,
      remaining: limit - actual,
      usage_percent: limit > 0 ? (actual / limit) * 100 : 0,
    }
  })

  // Savings data
  const savingsAccounts = savingsAccountsRes.data ?? []
  const monthlyDeposits = (savingsTxRes.data ?? []).reduce((s, t) => s + t.amount, 0)
  const savings: MonthlySavingsData = {
    accounts: savingsAccounts,
    monthlyDeposits,
    totalBalance: savingsAccounts.reduce((s, a) => s + a.current_balance, 0),
    totalTarget: savingsAccounts.reduce((s, a) => s + a.target_amount, 0),
  }

  // Daily expenses
  const { data: dailyData } = await supabase
    .from('transactions')
    .select('transaction_date, amount')
    .eq('type', 'expense')
    .gte('transaction_date', start)
    .lte('transaction_date', end)
    .order('transaction_date', { ascending: true })

  const dailyMap: Record<string, number> = {}
  for (const row of dailyData ?? []) {
    dailyMap[row.transaction_date] = (dailyMap[row.transaction_date] ?? 0) + row.amount
  }

  // Fill all days of the month
  const dailyExpenses: { date: string; amount: number }[] = []
  const daysInMonth = endDate.getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    dailyExpenses.push({ date: dateStr, amount: dailyMap[dateStr] ?? 0 })
  }

  return {
    month,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    prevTotalIncome,
    prevTotalExpense,
    prevBalance: prevTotalIncome - prevTotalExpense,
    byPerson: current.byPerson,
    byCategory: current.byCategory,
    budgetVsActual,
    dailyExpenses,
    categoryBudgetStatus,
    savings,
  }
}

// 월별 거래 + 예산 데이터를 합산하여 반환하는 헬퍼
async function getMonthTotalsWithBudget(month: string) {
  const [totals, incomeBudgets, expenseBudgets] = await Promise.all([
    getMonthlyTotals(month),
    getBudgetItems({ type: 'income', month }),
    getBudgetItems({ type: 'expense', month }),
  ])

  const budgetIncome = incomeBudgets.reduce((s, i) => s + i.amount, 0)
  const budgetExpense = expenseBudgets.reduce((s, i) => s + i.amount, 0)

  const totalIncome = totals.totalIncome || budgetIncome
  const totalExpense = totals.totalExpense || budgetExpense

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    byPerson: totals.byPerson,
    byCategory: totals.byCategory,
  }
}

export async function getQuarterlyReport(year: number, quarter: number): Promise<QuarterlyReportData> {
  const startMonth = (quarter - 1) * 3 + 1
  const monthStrings = Array.from({ length: 3 }, (_, i) => {
    const m = startMonth + i
    return `${year}-${String(m).padStart(2, '0')}`
  })

  const monthlyData = await Promise.all(
    monthStrings.map(async (month) => {
      const data = await getMonthTotalsWithBudget(month)
      return { month, ...data }
    })
  )

  const totalIncome = monthlyData.reduce((s, m) => s + m.totalIncome, 0)
  const totalExpense = monthlyData.reduce((s, m) => s + m.totalExpense, 0)

  return {
    year,
    quarter,
    months: monthlyData,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  }
}

export async function getYearlyReport(year: number): Promise<YearlyReportData> {
  const monthStrings = Array.from({ length: 12 }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, '0')}`
  )

  const monthlyData = await Promise.all(
    monthStrings.map(async (month) => {
      const data = await getMonthTotalsWithBudget(month)
      return { month, ...data }
    })
  )

  const totalIncome = monthlyData.reduce((s, m) => s + m.totalIncome, 0)
  const totalExpense = monthlyData.reduce((s, m) => s + m.totalExpense, 0)
  const balance = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) : 0

  // Aggregate categories across all months
  const byCategory: Record<string, number> = {}
  for (const m of monthlyData) {
    for (const [cat, amt] of Object.entries(m.byCategory)) {
      byCategory[cat] = (byCategory[cat] ?? 0) + amt
    }
  }

  // Aggregate person data across all months
  const byPerson: Record<string, { income: number; expense: number }> = {}
  for (const m of monthlyData) {
    for (const [person, data] of Object.entries(m.byPerson)) {
      if (!byPerson[person]) {
        byPerson[person] = { income: 0, expense: 0 }
      }
      byPerson[person].income += data.income
      byPerson[person].expense += data.expense
    }
  }

  return {
    year,
    months: monthlyData.map(({ month, totalIncome, totalExpense, balance }) => ({
      month, totalIncome, totalExpense, balance,
    })),
    totalIncome,
    totalExpense,
    balance,
    savingsRate,
    byCategory,
    byPerson,
  }
}
