'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { MonthPicker } from '@/components/ui/month-picker'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { deleteTransaction } from '@/lib/actions/transactions'
import { formatKRW } from '@/lib/utils/format'
import { formatDate, addMonths, subMonths } from '@/lib/utils/date'
import { PERSON_TYPES, PERSON_EMOJI } from '@/lib/utils/constants'
import { Plus, Receipt, Pencil, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { Transaction, ExpenseCategory, PersonType, TransactionType } from '@/types'

interface Props {
  transactions: Transaction[]
  categories: ExpenseCategory[]
  totalCount: number
  currentMonth: string
  currentPage: number
}

export function TransactionsClient({ transactions, categories, totalCount, currentMonth, currentPage }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [editItem, setEditItem] = useState<Transaction | null>(null)
  const [deleteId, setDeleteId] = useState<{ id: string; name: string } | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const [y, m] = currentMonth.split('-').map(Number)
  const currentDate = new Date(y, m - 1, 1)

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`/transactions?${params.toString()}`)
  }

  function navigateMonth(dir: 'prev' | 'next') {
    const d = dir === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1)
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    updateFilter('month', newMonth)
  }

  // Group transactions by date
  const grouped: Record<string, Transaction[]> = {}
  for (const tx of transactions) {
    const dateKey = tx.transaction_date
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(tx)
  }
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  async function handleDelete() {
    if (!deleteId) return
    setDeletePending(true)
    const result = await deleteTransaction(deleteId.id)
    if (result.success) {
      toast.success('삭제되었습니다')
      setDeleteId(null)
    } else {
      toast.error(result.error || '삭제 실패')
    }
    setDeletePending(false)
  }

  const activeType = searchParams.get('type') || ''
  const activePerson = searchParams.get('person') || ''
  const activeCategory = searchParams.get('category') || ''

  return (
    <div>
      <Header
        title="거래 내역"
        action={
          <Link href="/transactions/new">
            <Button><Plus className="h-4 w-4" /> 거래 추가</Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <MonthPicker
            currentDate={currentDate}
            onPrev={() => navigateMonth('prev')}
            onNext={() => navigateMonth('next')}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Type filter */}
          {(['', 'expense', 'income'] as const).map((t) => (
            <button
              key={t}
              onClick={() => updateFilter('type', t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                activeType === t
                  ? 'bg-primary-bg border-primary-light text-primary-dark'
                  : 'bg-surface border-border text-muted-foreground hover:border-border-hover'
              }`}
            >
              {t === '' ? '전체' : t === 'income' ? '수입' : '지출'}
            </button>
          ))}

          <span className="w-px h-6 bg-border self-center" />

          {/* Person filter */}
          <select
            value={activePerson}
            onChange={(e) => updateFilter('person', e.target.value)}
            className="h-8 rounded-lg border-2 border-border bg-surface px-2 text-xs appearance-none"
          >
            <option value="">전체 인물</option>
            {PERSON_TYPES.map((p) => (
              <option key={p} value={p}>{PERSON_EMOJI[p]} {p}</option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={activeCategory}
            onChange={(e) => updateFilter('category', e.target.value)}
            className="h-8 rounded-lg border-2 border-border bg-surface px-2 text-xs appearance-none"
          >
            <option value="">전체 카테고리</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="검색..."
              defaultValue={searchParams.get('search') || ''}
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateFilter('search', (e.target as HTMLInputElement).value)
              }}
              className="h-8 w-32 rounded-lg border-2 border-border bg-surface pl-7 pr-2 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Transaction List */}
      {transactions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Receipt className="h-12 w-12" />}
            title="거래 내역이 없어요"
            description="첫 거래를 추가해보세요"
            action={
              <Link href="/transactions/new">
                <Button size="sm"><Plus className="h-4 w-4" /> 추가하기</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((dateKey) => (
            <div key={dateKey}>
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-1">
                {formatDate(new Date(dateKey + 'T00:00:00'))}
              </div>
              <Card className="p-0 overflow-hidden">
                <div className="divide-y divide-border/50">
                  {grouped[dateKey].map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors group"
                    >
                      {/* Icon */}
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'income' ? 'bg-accent-bg text-accent-dark' : 'bg-primary-bg text-primary-dark'
                      }`}>
                        <span className="text-sm">
                          {tx.type === 'income' ? '💰' : PERSON_EMOJI[tx.person_type]}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{tx.description}</span>
                          {tx.is_emergency && <span className="text-[10px]">🚨</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{tx.person_type}</span>
                          {tx.category_name && (
                            <>
                              <span className="text-[10px] text-muted-foreground">·</span>
                              <span className="text-[10px] text-muted-foreground">{tx.category_name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <span className={`font-semibold text-sm shrink-0 ${
                        tx.type === 'income' ? 'text-accent-dark' : 'text-primary-dark'
                      }`}>
                        {tx.type === 'income' ? '+' : '-'}{formatKRW(tx.amount)}
                      </span>

                      {/* Actions */}
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => setEditItem(tx)}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setDeleteId({ id: tx.id, name: tx.description })}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-error/10 hover:text-error transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))}

          {/* Pagination */}
          {totalCount > 30 && (
            <div className="flex justify-center gap-2 pt-4">
              {currentPage > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString())
                    params.set('page', String(currentPage - 1))
                    router.push(`/transactions?${params.toString()}`)
                  }}
                >
                  이전
                </Button>
              )}
              <span className="text-sm text-muted-foreground self-center px-3">
                {currentPage} / {Math.ceil(totalCount / 30)}
              </span>
              {currentPage * 30 < totalCount && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString())
                    params.set('page', String(currentPage + 1))
                    router.push(`/transactions?${params.toString()}`)
                  }}
                >
                  다음
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="거래 수정"
      >
        {editItem && (
          <TransactionForm
            categories={categories}
            editItem={editItem}
            onSuccess={() => setEditItem(null)}
            onCancel={() => setEditItem(null)}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="거래 삭제"
      >
        <p className="text-sm text-muted-foreground mb-6">
          <strong className="text-foreground">{deleteId?.name}</strong> 거래를 삭제할까요?
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>취소</Button>
          <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deletePending}>
            {deletePending ? '삭제 중...' : '삭제'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
