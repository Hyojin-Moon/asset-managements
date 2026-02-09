'use client'

import { useState, useTransition } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AppLineChart } from '@/components/charts/line-chart'
import { AppBarChart } from '@/components/charts/bar-chart'
import { formatKRW } from '@/lib/utils/format'
import { getQuarterlyReport } from '@/lib/actions/reports'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CHART_COLORS } from '@/lib/utils/constants'
import type { QuarterlyReportData } from '@/types'

interface Props {
  initialData: QuarterlyReportData
}

const QUARTER_LABELS = ['Q1 (1~3월)', 'Q2 (4~6월)', 'Q3 (7~9월)', 'Q4 (10~12월)']

export function QuarterlyReportClient({ initialData }: Props) {
  const [year, setYear] = useState(initialData.year)
  const [quarter, setQuarter] = useState(initialData.quarter)
  const [data, setData] = useState(initialData)
  const [isPending, startTransition] = useTransition()

  function load(newYear: number, newQuarter: number) {
    setYear(newYear)
    setQuarter(newQuarter)
    startTransition(async () => {
      const report = await getQuarterlyReport(newYear, newQuarter)
      setData(report)
    })
  }

  function prevQuarter() {
    if (quarter === 1) load(year - 1, 4)
    else load(year, quarter - 1)
  }

  function nextQuarter() {
    if (quarter === 4) load(year + 1, 1)
    else load(year, quarter + 1)
  }

  // Line chart data (3 months, 3 lines)
  const monthLabels = data.months.map(m => {
    const mon = parseInt(m.month.split('-')[1])
    return `${mon}월`
  })

  const trendData = data.months.map((m, i) => ({
    name: monthLabels[i],
    수입: m.totalIncome,
    지출: m.totalExpense,
    잔액: m.balance,
  }))

  // Category trend: top 5 categories + "기타" stacked bar
  const allCategories: Record<string, number> = {}
  for (const m of data.months) {
    for (const [cat, amt] of Object.entries(m.byCategory)) {
      allCategories[cat] = (allCategories[cat] ?? 0) + amt
    }
  }
  const topCategories = Object.entries(allCategories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name)

  const categoryBarData = data.months.map((m, i) => {
    const row: { name: string; [key: string]: string | number } = { name: monthLabels[i] }
    for (const cat of topCategories) {
      row[cat] = m.byCategory[cat] ?? 0
    }
    const otherAmt = Object.entries(m.byCategory)
      .filter(([name]) => !topCategories.includes(name))
      .reduce((s, [, v]) => s + v, 0)
    if (otherAmt > 0) row['기타'] = otherAmt
    return row
  })

  const categoryBars = [
    ...topCategories.map((cat, i) => ({
      dataKey: cat,
      name: cat,
      color: CHART_COLORS[i % CHART_COLORS.length],
    })),
    ...(Object.keys(allCategories).length > 5 ? [{ dataKey: '기타', name: '기타', color: '#CBD5E1' }] : []),
  ]

  const hasData = data.totalIncome > 0 || data.totalExpense > 0

  return (
    <div className={`space-y-6 ${isPending ? 'opacity-60 pointer-events-none' : ''}`}>
      <Header
        title="분기 리포트"
        description="분기별 추이를 분석합니다"
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={prevQuarter}
              className="h-9 w-9 rounded-xl border-2 border-border bg-surface flex items-center justify-center hover:border-primary hover:bg-primary-bg transition-all duration-200 active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-lg font-bold text-foreground min-w-[160px] text-center">
              {year}년 {QUARTER_LABELS[quarter - 1]}
            </span>
            <button
              onClick={nextQuarter}
              className="h-9 w-9 rounded-xl border-2 border-border bg-surface flex items-center justify-center hover:border-primary hover:bg-primary-bg transition-all duration-200 active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {/* Quarter Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <QuarterSummaryCard label="분기 수입" amount={data.totalIncome} color="income" />
        <QuarterSummaryCard label="분기 지출" amount={data.totalExpense} color="expense" />
        <QuarterSummaryCard label="분기 잔액" amount={data.balance} color="balance" />
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <span className="text-4xl mb-3">📊</span>
            <p className="text-muted-foreground">이 분기에는 아직 데이터가 없어요</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>월별 수입/지출 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <AppLineChart
                data={trendData}
                lines={[
                  { dataKey: '수입', name: '수입', color: '#7ED4BC' },
                  { dataKey: '지출', name: '지출', color: '#FF85A2' },
                  { dataKey: '잔액', name: '잔액', color: '#B8A9E8' },
                ]}
                height={300}
              />
            </CardContent>
          </Card>

          {/* Monthly Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle>월별 비교</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">월</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">수입</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">지출</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">잔액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.months.map((m, i) => (
                      <tr key={m.month} className="border-b border-border/50">
                        <td className="py-2 font-medium">{monthLabels[i]}</td>
                        <td className="py-2 text-right text-accent-dark">{formatKRW(m.totalIncome)}</td>
                        <td className="py-2 text-right text-primary-dark">{formatKRW(m.totalExpense)}</td>
                        <td className={`py-2 text-right font-medium ${m.balance >= 0 ? 'text-accent-dark' : 'text-primary-dark'}`}>
                          {formatKRW(m.balance)}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="py-2">합계</td>
                      <td className="py-2 text-right text-accent-dark">{formatKRW(data.totalIncome)}</td>
                      <td className="py-2 text-right text-primary-dark">{formatKRW(data.totalExpense)}</td>
                      <td className={`py-2 text-right ${data.balance >= 0 ? 'text-accent-dark' : 'text-primary-dark'}`}>
                        {formatKRW(data.balance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Category Trend Stacked Bar */}
          {categoryBars.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>카테고리별 지출 추이</CardTitle>
              </CardHeader>
              <CardContent>
                <AppBarChart
                  data={categoryBarData}
                  bars={categoryBars}
                  stacked
                  height={300}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function QuarterSummaryCard({ label, amount, color }: {
  label: string; amount: number; color: 'income' | 'expense' | 'balance'
}) {
  const colorMap = {
    income: 'bg-accent-bg border-accent-light text-accent-dark',
    expense: 'bg-primary-bg border-primary-light text-primary-dark',
    balance: 'bg-secondary-bg border-secondary-light text-secondary-dark',
  }

  return (
    <div className={`rounded-2xl border-2 p-4 ${colorMap[color]} transition-all duration-200 hover:shadow-soft`}>
      <span className="text-sm font-medium opacity-80">{label}</span>
      <div className="text-xl font-bold mt-1">{formatKRW(amount)}</div>
    </div>
  )
}
