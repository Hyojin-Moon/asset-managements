'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MonthPicker } from '@/components/ui/month-picker'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatKRW } from '@/lib/utils/format'
import { addMonths, subMonths } from '@/lib/utils/date'
import { PERSON_EMOJI } from '@/lib/utils/constants'
import {
  TrendingUp, TrendingDown, Wallet,
  ArrowRight, CalendarDays, PiggyBank,
} from 'lucide-react'
import type { Transaction, Event, SavingsAccount, PersonType } from '@/types'

interface DashboardProps {
  initialMonth: string
  initialTotals: {
    totalIncome: number
    totalExpense: number
    balance: number
    byPerson: Record<string, { income: number; expense: number }>
    byCategory: Record<string, number>
  }
  initialRecentTx: Transaction[]
  budgetIncome: number
  budgetExpense: number
  upcomingEvents: Event[]
  savingsAccounts: SavingsAccount[]
}

export function DashboardClient({
  initialMonth,
  initialTotals,
  initialRecentTx,
  budgetIncome,
  budgetExpense,
  upcomingEvents,
  savingsAccounts,
}: DashboardProps) {
  const [y, m] = initialMonth.split('-').map(Number)
  const [currentDate, setCurrentDate] = useState(new Date(y, m - 1, 1))
  const totals = initialTotals
  const recentTx = initialRecentTx

  // Use actual totals if they exist, otherwise show budget as reference
  const displayIncome = totals.totalIncome || budgetIncome
  const displayExpense = totals.totalExpense || budgetExpense
  const displayBalance = totals.totalIncome - totals.totalExpense

  const personOrder: PersonType[] = ['공통', '효진', '호영', '정우']
  const totalPersonExpense = Object.values(totals.byPerson).reduce((s, p) => s + p.expense, 0) || 1

  // Category data sorted by amount
  const categoryEntries = Object.entries(totals.byCategory).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-6">
      {/* Month Picker */}
      <MonthPicker
        currentDate={currentDate}
        onPrev={() => setCurrentDate((prev) => subMonths(prev, 1))}
        onNext={() => setCurrentDate((prev) => addMonths(prev, 1))}
        onChange={(date) => setCurrentDate(date)}
      />

      {/* Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="총수입" amount={displayIncome} icon={<TrendingUp className="h-5 w-5" />} color="income" />
        <SummaryCard label="총지출" amount={displayExpense} icon={<TrendingDown className="h-5 w-5" />} color="expense" />
        <SummaryCard label="잔액" amount={displayBalance} icon={<Wallet className="h-5 w-5" />} color="balance" />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Person Breakdown */}
        <Card hover>
          <CardHeader>
            <CardTitle>개인별 지출</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(totals.byPerson).length === 0 ? (
              <EmptyBox emoji="👥" text="거래를 추가하면 개인별 현황이 표시됩니다" />
            ) : (
              <div className="space-y-3">
                {personOrder.map((person) => {
                  const data = totals.byPerson[person]
                  if (!data) return null
                  return (
                    <PersonBar
                      key={person}
                      label={`${PERSON_EMOJI[person]} ${person}`}
                      amount={data.expense}
                      total={totalPersonExpense}
                      color={personBarColor(person)}
                    />
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card hover>
          <CardHeader>
            <CardTitle>카테고리별 지출</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryEntries.length === 0 ? (
              <EmptyBox emoji="🍰" text="지출 데이터가 쌓이면 카테고리별로 보여드려요" />
            ) : (
              <div className="space-y-2.5">
                {categoryEntries.slice(0, 6).map(([cat, amt]) => {
                  const pct = totals.totalExpense > 0 ? (amt / totals.totalExpense) * 100 : 0
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-sm w-20 truncate shrink-0">{cat}</span>
                      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-20 text-right shrink-0">{formatKRW(amt)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card hover>
          <CardHeader>
            <CardTitle>최근 거래</CardTitle>
            <Link href="/transactions" className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary-dark transition-colors">
              전체 <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentTx.length === 0 ? (
              <EmptyBox emoji="📝" text="아직 거래 내역이 없어요" />
            ) : (
              <div className="space-y-2.5">
                {recentTx.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                      tx.type === 'income' ? 'bg-accent-bg' : 'bg-primary-bg'
                    }`}>
                      {tx.type === 'income' ? '💰' : PERSON_EMOJI[tx.person_type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{tx.description}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {tx.person_type}{tx.category_name ? ` · ${tx.category_name}` : ''}
                      </div>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${
                      tx.type === 'income' ? 'text-accent-dark' : 'text-primary-dark'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}{formatKRW(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card hover>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-secondary" />
                다가오는 이벤트
              </span>
            </CardTitle>
            <Link href="/calendar" className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary-dark transition-colors">
              전체 <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <EmptyBox emoji="📅" text="예정된 이벤트가 없어요" />
            ) : (
              <div className="space-y-2.5">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-secondary-bg flex items-center justify-center text-xs shrink-0">
                      {PERSON_EMOJI[event.person_type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{event.title}</div>
                      <div className="text-[10px] text-muted-foreground">{event.event_date}</div>
                    </div>
                    {event.estimated_cost > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">{formatKRW(event.estimated_cost)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Savings */}
        <Card hover className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-warm" />
                저축 현황
              </span>
            </CardTitle>
            <Link href="/savings" className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary-dark transition-colors">
              전체 <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {savingsAccounts.length === 0 ? (
              <EmptyBox emoji="🏦" text="저축 계좌를 등록해보세요" />
            ) : (
              <div className="space-y-3">
                {savingsAccounts.slice(0, 3).map((account) => {
                  const progress = account.target_amount > 0
                    ? Math.min((account.current_balance / account.target_amount) * 100, 100)
                    : 0
                  return (
                    <div key={account.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {PERSON_EMOJI[account.person_type]} {account.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatKRW(account.current_balance)}
                          {account.target_amount > 0 && ` / ${formatKRW(account.target_amount)}`}
                        </span>
                      </div>
                      {account.target_amount > 0 && (
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-warm rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(progress, 1)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SummaryCard({ label, amount, icon, color }: {
  label: string; amount: number; icon: React.ReactNode; color: 'income' | 'expense' | 'balance'
}) {
  const colorMap = {
    income: 'bg-accent-bg border-accent-light text-accent-dark',
    expense: 'bg-primary-bg border-primary-light text-primary-dark',
    balance: 'bg-secondary-bg border-secondary-light text-secondary-dark',
  }
  const iconBg = {
    income: 'bg-accent/10',
    expense: 'bg-primary/10',
    balance: 'bg-secondary/10',
  }

  return (
    <div className={`rounded-2xl border-2 p-4 ${colorMap[color]} transition-all duration-200 hover:shadow-soft`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-80">{label}</span>
        <div className={`h-8 w-8 rounded-xl ${iconBg[color]} flex items-center justify-center`}>{icon}</div>
      </div>
      <div className="text-xl font-bold">{formatKRW(amount)}</div>
    </div>
  )
}

function PersonBar({ label, amount, total, color }: {
  label: string; amount: number; total: number; color: string
}) {
  const percent = total > 0 ? (amount / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium w-20 shrink-0">{label}</span>
      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.max(percent, 2)}%` }} />
      </div>
      <span className="text-sm font-medium text-muted-foreground w-24 text-right">{formatKRW(amount)}</span>
    </div>
  )
}

function personBarColor(person: PersonType): string {
  const map: Record<PersonType, string> = {
    '공통': 'bg-accent',
    '효진': 'bg-primary',
    '호영': 'bg-info',
    '정우': 'bg-warm',
  }
  return map[person]
}

function EmptyBox({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center justify-center py-6">
      <div className="text-center">
        <span className="text-2xl block mb-1">{emoji}</span>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}
