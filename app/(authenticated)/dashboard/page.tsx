import { getMonthlyTotals, getRecentTransactions } from '@/lib/actions/transactions'
import { getBudgetItems } from '@/lib/actions/budget'
import { getUpcomingEvents } from '@/lib/actions/events'
import { getSavingsAccounts } from '@/lib/actions/savings'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [totals, recentTx, incomeItems, expenseItems, upcomingEvents, savingsAccounts] = await Promise.all([
    getMonthlyTotals(currentMonth),
    getRecentTransactions(5),
    getBudgetItems({ type: 'income', month: currentMonth }),
    getBudgetItems({ type: 'expense', month: currentMonth }),
    getUpcomingEvents(3),
    getSavingsAccounts(),
  ])

  const budgetIncome = incomeItems.reduce((s, i) => s + i.amount, 0)
  const budgetExpense = expenseItems.reduce((s, i) => s + i.amount, 0)

  return (
    <DashboardClient
      initialMonth={currentMonth}
      initialTotals={totals}
      initialRecentTx={recentTx}
      budgetIncome={budgetIncome}
      budgetExpense={budgetExpense}
      upcomingEvents={upcomingEvents}
      savingsAccounts={savingsAccounts}
    />
  )
}
