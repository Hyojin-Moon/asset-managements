'use client'

import { useState, useTransition } from 'react'
import { MonthPicker } from '@/components/ui/month-picker'
import { Header } from '@/components/layout/header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { AppPieChart } from '@/components/charts/pie-chart'
import { AppLineChart } from '@/components/charts/line-chart'
import { formatKRW, formatPercent } from '@/lib/utils/format'
import { addMonths, formatDate, subMonths } from '@/lib/utils/date'
import { CHART_COLORS, PERSON_EMOJI } from '@/lib/utils/constants'
import { getMonthlyReport } from '@/lib/actions/reports'
import { TrendingUp, TrendingDown, Wallet, PiggyBank, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import type { MonthlyReportData, MonthlyReportDetail, PersonType, TransactionType } from '@/types'

const PERSON_PIE_COLORS = ['#FF85A2', '#7EB8E4', '#FFB07A', '#7ED4BC']

interface Props {
  initialData: MonthlyReportData
}

export function MonthlyReportClient({ initialData }: Props) {
  const [y, m] = initialData.month.split('-').map(Number)
  const [currentDate, setCurrentDate] = useState(new Date(y, m - 1, 1))
  const [data, setData] = useState(initialData)
  const [detailType, setDetailType] = useState<TransactionType | null>(null)
  const [isPending, startTransition] = useTransition()

  function changeMonth(newDate: Date) {
    setDetailType(null)
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

  // Plan vs Actual
  const planned = data.plannedExpense
  const actual = data.totalExpense
  const planDiff = planned - actual
  const planUsagePercent = planned > 0 ? (actual / planned) * 100 : 0

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
            onChange={(date) => changeMonth(date)}
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
          onClick={() => setDetailType('income')}
        />
        <SummaryCard
          label="총지출"
          amount={data.totalExpense}
          change={expenseChange}
          icon={<TrendingDown className="h-5 w-5" />}
          color="expense"
          invertChange
          onClick={() => setDetailType('expense')}
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

          {/* Plan vs Actual */}
          {planned > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>계획 vs 실제 지출</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-secondary-bg/50 p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">계획 (고정지출 합산)</p>
                    <p className="text-lg sm:text-2xl font-bold text-secondary-dark">{formatKRW(planned)}</p>
                  </div>
                  <div className="rounded-xl bg-primary-bg/50 p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">실제 지출</p>
                    <p className="text-lg sm:text-2xl font-bold text-primary-dark">{formatKRW(actual)}</p>
                  </div>
                </div>
                {/* Gauge bar */}
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        planUsagePercent > 100 ? 'bg-error' : planUsagePercent >= 90 ? 'bg-warning' : 'bg-accent'
                      }`}
                      style={{ width: `${Math.min(planUsagePercent, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      계획 대비 {planUsagePercent.toFixed(0)}% 사용
                    </span>
                    <span className={`font-semibold ${planDiff >= 0 ? 'text-accent-dark' : 'text-error'}`}>
                      {planDiff >= 0 ? `${formatKRW(planDiff)} 여유` : `${formatKRW(Math.abs(planDiff))} 초과`}
                    </span>
                  </div>
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

      <ReportDetailModal
        key={`${detailType}-${data.month}`}
        open={detailType !== null}
        onClose={() => setDetailType(null)}
        type={detailType ?? 'income'}
        month={data.month}
        items={detailType === 'expense' ? data.expenseDetails : data.incomeDetails}
      />
    </div>
  )
}

function SummaryCard({ label, amount, change, icon, color, invertChange, onClick }: {
  label: string
  amount: number
  change?: number
  icon: React.ReactNode
  color: 'income' | 'expense' | 'balance' | 'savings'
  invertChange?: boolean
  onClick?: () => void
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

  const content = (
    <>
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
    </>
  )

  const className = `w-full rounded-2xl border-2 p-3 sm:p-4 text-left ${colorMap[color]} transition-all duration-200 hover:shadow-soft`

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${className} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:-translate-y-0.5`}
        aria-label={`${label} ${formatKRW(amount)} 상세 내역 보기`}
      >
        {content}
        <span className="mt-2 block text-[10px] font-medium opacity-60">클릭하여 내역 보기</span>
      </button>
    )
  }

  return <div className={className}>{content}</div>
}

function ReportDetailModal({ open, onClose, type, month, items }: {
  open: boolean
  onClose: () => void
  type: TransactionType
  month: string
  items: MonthlyReportDetail[]
}) {
  const [selectedCategory, setSelectedCategory] = useState('__all__')
  const [sortOrder, setSortOrder] = useState<'date' | 'oldest' | 'name'>('date')
  const [year, monthNumber] = month.split('-').map(Number)
  const label = type === 'income' ? '수입' : '지출'
  const isIncome = type === 'income'
  const categoryOptions = Array.from(
    new Set(items.map((item) => item.category_name?.trim() || '미분류'))
  ).sort((a, b) => a.localeCompare(b, 'ko'))
  const filteredItems = selectedCategory === '__all__'
    ? items
    : items.filter((item) => (item.category_name?.trim() || '미분류') === selectedCategory)
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortOrder === 'name') {
      return a.description.localeCompare(b.description, 'ko')
    }
    const dateComparison = sortOrder === 'oldest'
      ? (a.transaction_date ?? '').localeCompare(b.transaction_date ?? '')
      : (b.transaction_date ?? '').localeCompare(a.transaction_date ?? '')
    return dateComparison || a.description.localeCompare(b.description, 'ko')
  })
  const total = filteredItems.reduce((sum, item) => sum + item.amount, 0)
  const isBudgetFallback = items.length > 0 && items.every((item) => item.source === 'budget')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${year}년 ${monthNumber}월 ${label} 내역`}
      className="max-w-2xl"
    >
      <div className="mb-4 space-y-3 rounded-xl bg-muted/60 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <label className="min-w-0 text-xs font-medium text-muted-foreground sm:w-52">
              카테고리
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="mt-1 block h-9 w-full rounded-lg border-2 border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
              >
                <option value="__all__">전체 카테고리</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="min-w-0 text-xs font-medium text-muted-foreground sm:w-40">
              정렬
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as 'date' | 'oldest' | 'name')}
                className="mt-1 block h-9 w-full rounded-lg border-2 border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
              >
                <option value="date">날짜순 (최신순)</option>
                <option value="oldest">날짜순 (오래된순)</option>
                <option value="name">이름순 (가나다순)</option>
              </select>
            </label>
          </div>
          <div className="shrink-0 self-end text-right">
            <p className="text-xs text-muted-foreground">총 {filteredItems.length}건</p>
            <p className={`text-xl font-bold leading-tight sm:text-2xl ${isIncome ? 'text-accent-dark' : 'text-primary-dark'}`}>
              {formatKRW(total)}
            </p>
          </div>
        </div>
        {isBudgetFallback && (
          <p className="text-[11px] text-muted-foreground">등록된 거래가 없어 고정 {label} 항목을 표시합니다</p>
        )}
      </div>

      {filteredItems.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          선택한 카테고리의 {label} 내역이 없어요
        </div>
      ) : (
        <div className="max-h-[60vh] divide-y divide-border/60 overflow-y-auto pr-1">
          {sortedItems.map((item) => (
            <div key={`${item.source}-${item.id}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                isIncome ? 'bg-accent-bg text-accent-dark' : 'bg-primary-bg text-primary-dark'
              }`}>
                <span className="text-sm">{isIncome ? '💰' : PERSON_EMOJI[item.person_type]}</span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.description}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{item.person_type}</span>
                  {item.transaction_date ? (
                    <span>{formatDate(new Date(`${item.transaction_date}T00:00:00`))}</span>
                  ) : (
                    <span>고정 항목</span>
                  )}
                  {item.category_name && (
                    <Badge variant={isIncome ? 'income' : 'expense'} className="px-1.5 py-0 text-[10px]">
                      {item.category_name}
                    </Badge>
                  )}
                </div>
              </div>

              <span className={`shrink-0 text-sm font-semibold ${isIncome ? 'text-accent-dark' : 'text-primary-dark'}`}>
                {isIncome ? '+' : '-'}{formatKRW(item.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
