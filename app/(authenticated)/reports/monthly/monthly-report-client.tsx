'use client'

import { useState, useTransition } from 'react'
import { MonthPicker } from '@/components/ui/month-picker'
import { Header } from '@/components/layout/header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AppBarChart } from '@/components/charts/bar-chart'
import { AppPieChart } from '@/components/charts/pie-chart'
import { AppLineChart } from '@/components/charts/line-chart'
import { formatKRW, formatPercent } from '@/lib/utils/format'
import { addMonths, subMonths } from '@/lib/utils/date'
import { CHART_COLORS, PERSON_EMOJI } from '@/lib/utils/constants'
import { getMonthlyReport } from '@/lib/actions/reports'
import { TrendingUp, TrendingDown, Wallet, PiggyBank, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import type { MonthlyReportData, PersonType } from '@/types'

const PERSON_PIE_COLORS = ['#FF85A2', '#7EB8E4', '#FFB07A', '#7ED4BC']

interface Props {
  initialData: MonthlyReportData
}

export function MonthlyReportClient({ initialData }: Props) {
  const [y, m] = initialData.month.split('-').map(Number)
  const [currentDate, setCurrentDate] = useState(new Date(y, m - 1, 1))
  const [data, setData] = useState(initialData)
  const [isPending, startTransition] = useTransition()

  function changeMonth(newDate: Date) {
    setCurrentDate(newDate)
    const month = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`
    startTransition(async () => {
      const report = await getMonthlyReport(month)
      setData(report)
    })
  }

  // Change rates
  const incomeChange = data.prevTotalIncome > 0
    ? (data.totalIncome - data.prevTotalIncome) / data.prevTotalIncome
    : 0
  const expenseChange = data.prevTotalExpense > 0
    ? (data.totalExpense - data.prevTotalExpense) / data.prevTotalExpense
    : 0
  const balanceChange = data.prevBalance !== 0
    ? (data.balance - data.prevBalance) / Math.abs(data.prevBalance)
    : 0

  // Budget vs Actual chart data
  const budgetChartData = data.budgetVsActual
    .filter(item => item.budget > 0 || item.actual > 0)
    .map(item => ({
      name: item.category_name,
      예산: item.budget,
      실제: item.actual,
    }))

  // Category pie data
  const categoryPieData = Object.entries(data.byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
  const categoryOther = Object.entries(data.byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(7)
    .reduce((sum, [, v]) => sum + v, 0)
  const categoryData = [
    ...categoryPieData.map(([name, value]) => ({ name, value })),
    ...(categoryOther > 0 ? [{ name: '기타', value: categoryOther }] : []),
  ]

  // Person pie data
  const personData = Object.entries(data.byPerson)
    .filter(([, d]) => d.expense > 0)
    .map(([name, d]) => ({ name, value: d.expense }))

  // Daily expense line data
  const dailyLineData = data.dailyExpenses.map(d => ({
    name: d.date.slice(8), // day only
    지출: d.amount,
  }))

  const hasData = data.totalIncome > 0 || data.totalExpense > 0

  // Savings
  const { savings } = data
  const savingsProgressPercent = savings.totalTarget > 0
    ? (savings.totalBalance / savings.totalTarget) * 100
    : 0

  return (
    <div className={`space-y-6 ${isPending ? 'opacity-60 pointer-events-none' : ''}`}>
      <Header
        title="월간 리포트"
        description="월별 수입/지출 현황을 분석합니다"
        action={
          <MonthPicker
            currentDate={currentDate}
            onPrev={() => changeMonth(subMonths(currentDate, 1))}
            onNext={() => changeMonth(addMonths(currentDate, 1))}
          />
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="총수입"
          amount={data.totalIncome}
          change={incomeChange}
          icon={<TrendingUp className="h-5 w-5" />}
          color="income"
        />
        <SummaryCard
          label="총지출"
          amount={data.totalExpense}
          change={expenseChange}
          icon={<TrendingDown className="h-5 w-5" />}
          color="expense"
          invertChange
        />
        <SummaryCard
          label="잔액"
          amount={data.balance}
          change={balanceChange}
          icon={<Wallet className="h-5 w-5" />}
          color="balance"
        />
        <SummaryCard
          label="이달 저축"
          amount={savings.monthlyDeposits}
          icon={<PiggyBank className="h-5 w-5" />}
          color="savings"
        />
      </div>

      {!hasData && savings.accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <span className="text-4xl mb-3">📊</span>
            <p className="text-muted-foreground">이 달에는 아직 데이터가 없어요</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Category Budget Limit Status */}
          {data.categoryBudgetStatus.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>카테고리별 한도 현황</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.categoryBudgetStatus.map((cat) => {
                  const isOver = cat.actual > cat.budget_limit
                  const isNear = !isOver && cat.usage_percent >= 80
                  const isGood = !isOver && !isNear

                  return (
                    <div key={cat.category_id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {isOver && <XCircle className="h-4 w-4 text-error" />}
                          {isNear && <AlertTriangle className="h-4 w-4 text-warning" />}
                          {isGood && <CheckCircle className="h-4 w-4 text-accent-dark" />}
                          <span className="font-medium">{cat.category_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isOver ? 'text-error' : isNear ? 'text-warning' : 'text-accent-dark'}`}>
                            {formatKRW(cat.actual)}
                          </span>
                          <span className="text-muted-foreground">/ {formatKRW(cat.budget_limit)}</span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOver ? 'bg-error' : isNear ? 'bg-warning' : 'bg-accent'
                          }`}
                          style={{ width: `${Math.min(cat.usage_percent, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{cat.usage_percent.toFixed(0)}% 사용</span>
                        {isOver ? (
                          <span className="text-error font-medium">
                            {formatKRW(cat.actual - cat.budget_limit)} 초과!
                          </span>
                        ) : (
                          <span className="text-accent-dark">
                            {formatKRW(cat.remaining)} 남음
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Savings Summary */}
          {savings.accounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>저축 현황</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Total savings progress */}
                {savings.totalTarget > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">전체 목표 달성률</span>
                      <span className="font-semibold">{savingsProgressPercent.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-warm to-warm-dark rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(savingsProgressPercent, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatKRW(savings.totalBalance)}</span>
                      <span>목표: {formatKRW(savings.totalTarget)}</span>
                    </div>
                  </div>
                )}

                {/* Per-account breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {savings.accounts.map((account) => {
                    const pct = account.target_amount > 0
                      ? (account.current_balance / account.target_amount) * 100
                      : 0
                    return (
                      <div key={account.id} className="rounded-xl border-2 border-border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{PERSON_EMOJI[account.person_type as PersonType]}</span>
                            <span className="text-sm font-medium">{account.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{account.person_type}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-warm rounded-full transition-all"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-warm-dark font-medium">{formatKRW(account.current_balance)}</span>
                          {account.target_amount > 0 && (
                            <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Budget vs Actual */}
          {budgetChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>예산 vs 실제</CardTitle>
              </CardHeader>
              <CardContent>
                <AppBarChart
                  data={budgetChartData}
                  bars={[
                    { dataKey: '예산', name: '예산', color: '#B8A9E8' },
                    { dataKey: '실제', name: '실제', color: '#FF85A2' },
                  ]}
                  height={Math.max(200, budgetChartData.length * 50)}
                  layout="horizontal"
                />
                {/* Table */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium text-muted-foreground">카테고리</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">예산</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">실제</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">차이</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.budgetVsActual.filter(i => i.budget > 0 || i.actual > 0).map((item, idx) => (
                        <tr key={`${item.category_id}-${idx}`} className="border-b border-border/50">
                          <td className="py-2">{item.category_name}</td>
                          <td className="py-2 text-right">{formatKRW(item.budget)}</td>
                          <td className="py-2 text-right">{formatKRW(item.actual)}</td>
                          <td className={`py-2 text-right font-medium ${item.difference >= 0 ? 'text-accent-dark' : 'text-primary-dark'}`}>
                            {item.difference >= 0 ? '+' : ''}{formatKRW(item.difference)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Category Pie */}
            {categoryData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>카테고리별 지출</CardTitle>
                </CardHeader>
                <CardContent>
                  <AppPieChart data={categoryData} colors={CHART_COLORS} />
                </CardContent>
              </Card>
            )}

            {/* Person Pie */}
            {personData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>개인별 지출</CardTitle>
                </CardHeader>
                <CardContent>
                  <AppPieChart data={personData} colors={PERSON_PIE_COLORS} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Daily Expense Line */}
          {dailyLineData.some(d => d.지출 > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>일별 지출 추이</CardTitle>
              </CardHeader>
              <CardContent>
                <AppLineChart
                  data={dailyLineData}
                  lines={[{ dataKey: '지출', name: '일별 지출', color: '#FF85A2' }]}
                  height={250}
                  labelFormatter={(label) => `${label}일`}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function SummaryCard({ label, amount, change, icon, color, invertChange }: {
  label: string
  amount: number
  change?: number
  icon: React.ReactNode
  color: 'income' | 'expense' | 'balance' | 'savings'
  invertChange?: boolean
}) {
  const colorMap = {
    income: 'bg-accent-bg border-accent-light text-accent-dark',
    expense: 'bg-primary-bg border-primary-light text-primary-dark',
    balance: 'bg-secondary-bg border-secondary-light text-secondary-dark',
    savings: 'bg-warm-bg border-warm-light text-warm-dark',
  }
  const iconBg = {
    income: 'bg-accent/10',
    expense: 'bg-primary/10',
    balance: 'bg-secondary/10',
    savings: 'bg-warm/10',
  }

  const isPositive = invertChange ? (change ?? 0) <= 0 : (change ?? 0) >= 0

  return (
    <div className={`rounded-2xl border-2 p-3 sm:p-4 ${colorMap[color]} transition-all duration-200 hover:shadow-soft`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs sm:text-sm font-medium opacity-80">{label}</span>
        <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-xl ${iconBg[color]} flex items-center justify-center`}>{icon}</div>
      </div>
      <div className="text-base sm:text-xl font-bold">{formatKRW(amount)}</div>
      {change !== undefined && change !== 0 && (
        <p className={`text-xs mt-1 ${isPositive ? 'text-accent-dark' : 'text-primary-dark'}`}>
          전월 대비 {formatPercent(change)}
        </p>
      )}
    </div>
  )
}
