'use client'

import { useState, useTransition } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AppLineChart } from '@/components/charts/line-chart'
import { AppBarChart } from '@/components/charts/bar-chart'
import { AppPieChart } from '@/components/charts/pie-chart'
import { formatKRW, formatPercent } from '@/lib/utils/format'
import { getYearlyReport } from '@/lib/actions/reports'
import { ChevronLeft, ChevronRight, PiggyBank } from 'lucide-react'
import { CHART_COLORS, PERSON_EMOJI } from '@/lib/utils/constants'
import type { YearlyReportData, PersonType } from '@/types'

const PERSON_PIE_COLORS = ['#FF85A2', '#7EB8E4', '#FFB07A', '#7ED4BC']

interface Props {
  initialData: YearlyReportData
}

export function YearlyReportClient({ initialData }: Props) {
  const [year, setYear] = useState(initialData.year)
  const [data, setData] = useState(initialData)
  const [isPending, startTransition] = useTransition()

  function changeYear(newYear: number) {
    setYear(newYear)
    startTransition(async () => {
      const report = await getYearlyReport(newYear)
      setData(report)
    })
  }

  // Monthly trend line chart
  const trendData = data.months.map(m => {
    const mon = parseInt(m.month.split('-')[1])
    return {
      name: `${mon}월`,
      수입: m.totalIncome,
      지출: m.totalExpense,
      잔액: m.balance,
      저축: m.savings,
    }
  })

  // Category horizontal bar (top 8 + 기타)
  const catEntries = Object.entries(data.byCategory)
    .sort((a, b) => b[1] - a[1])
  const topCats = catEntries.slice(0, 8)
  const otherCats = catEntries.slice(8).reduce((s, [, v]) => s + v, 0)
  const categoryBarData = [
    ...topCats.map(([name, value]) => ({ name, 금액: value })),
    ...(otherCats > 0 ? [{ name: '기타', 금액: otherCats }] : []),
  ]

  // Person pie data
  const personData = Object.entries(data.byPerson)
    .filter(([, d]) => d.expense > 0)
    .map(([name, d]) => ({ name, value: d.expense }))

  const hasData = data.totalIncome > 0 || data.totalExpense > 0

  return (
    <div className={`space-y-6 ${isPending ? 'opacity-60 pointer-events-none' : ''}`}>
      <Header
        title="연간 리포트"
        description="연간 자산 현황을 분석합니다"
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={() => changeYear(year - 1)}
              className="h-9 w-9 rounded-xl border-2 border-border bg-surface flex items-center justify-center hover:border-primary hover:bg-primary-bg transition-all duration-200 active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-lg font-bold text-foreground min-w-[100px] text-center">
              {year}년
            </span>
            <button
              onClick={() => changeYear(year + 1)}
              className="h-9 w-9 rounded-xl border-2 border-border bg-surface flex items-center justify-center hover:border-primary hover:bg-primary-bg transition-all duration-200 active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <YearlySummaryCard label="연간 수입" amount={data.totalIncome} color="bg-accent-bg border-accent-light text-accent-dark" />
        <YearlySummaryCard label="연간 지출" amount={data.totalExpense} color="bg-primary-bg border-primary-light text-primary-dark" />
        <YearlySummaryCard label="연간 잔액" amount={data.balance} color="bg-secondary-bg border-secondary-light text-secondary-dark" />
        <div className="rounded-2xl border-2 p-4 bg-warm-bg border-warm-light text-warm-dark transition-all duration-200 hover:shadow-soft">
          <span className="text-sm font-medium opacity-80">저축률</span>
          <div className="text-xl font-bold mt-1">
            {data.totalIncome > 0 ? formatPercent(data.savingsRate) : '-'}
          </div>
        </div>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <span className="text-4xl mb-3">📊</span>
            <p className="text-muted-foreground">이 연도에는 아직 데이터가 없어요</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 12-Month Trend */}
          <Card>
            <CardHeader>
              <CardTitle>12개월 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <AppLineChart
                data={trendData}
                lines={[
                  { dataKey: '수입', name: '수입', color: '#7ED4BC' },
                  { dataKey: '지출', name: '지출', color: '#FF85A2' },
                  { dataKey: '잔액', name: '잔액', color: '#B8A9E8' },
                  { dataKey: '저축', name: '저축', color: '#FFB07A' },
                ]}
                height={350}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Category Horizontal Bar */}
            {categoryBarData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>카테고리별 지출</CardTitle>
                </CardHeader>
                <CardContent>
                  <AppBarChart
                    data={categoryBarData}
                    bars={[{ dataKey: '금액', name: '지출', color: '#FF85A2' }]}
                    layout="horizontal"
                    height={Math.max(250, categoryBarData.length * 40)}
                  />
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

          {/* Savings Summary */}
          {data.savings.accounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PiggyBank className="h-5 w-5 text-warm-dark" />
                  저축 현황
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">연간 총 저축액</span>
                  <span className="text-lg font-bold text-warm-dark">{formatKRW(data.savings.monthlyDeposits)}</span>
                </div>

                {data.savings.totalTarget > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">전체 목표 달성률</span>
                      <span className="font-semibold">
                        {(data.savings.totalBalance / data.savings.totalTarget * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-warm to-warm-dark rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(data.savings.totalBalance / data.savings.totalTarget * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatKRW(data.savings.totalBalance)}</span>
                      <span>목표: {formatKRW(data.savings.totalTarget)}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {data.savings.accounts.map((account) => {
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
        </>
      )}
    </div>
  )
}

function YearlySummaryCard({ label, amount, color }: {
  label: string; amount: number; color: string
}) {
  return (
    <div className={`rounded-2xl border-2 p-4 ${color} transition-all duration-200 hover:shadow-soft`}>
      <span className="text-sm font-medium opacity-80">{label}</span>
      <div className="text-xl font-bold mt-1">{formatKRW(amount)}</div>
    </div>
  )
}
