'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  getSavingsAccounts,
  createSavingsAccount,
  updateSavingsAccount,
  deleteSavingsAccount,
  getSavingsTransactions,
  createSavingsTransaction,
  deleteSavingsTransaction,
} from '@/lib/actions/savings'
import { formatKRW } from '@/lib/utils/format'
import { PERSON_TYPES, PERSON_EMOJI, PERSON_BG_CLASSES } from '@/lib/utils/constants'
import { Plus, Pencil, Trash2, PiggyBank, ChevronDown, ChevronUp, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { SavingsAccount, SavingsTransaction, PersonType, CreateSavingsAccountInput } from '@/types'

interface SavingsClientProps {
  initialAccounts: SavingsAccount[]
}

export function SavingsClient({ initialAccounts }: SavingsClientProps) {
  const [accounts, setAccounts] = useState<SavingsAccount[]>(initialAccounts)
  const [formOpen, setFormOpen] = useState(false)
  const [editAccount, setEditAccount] = useState<SavingsAccount | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SavingsAccount | null>(null)
  const [txModalAccount, setTxModalAccount] = useState<{ account: SavingsAccount; type: 'deposit' | 'withdraw' } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Record<string, SavingsTransaction[]>>({})

  const totalSavings = accounts.reduce((s, a) => s + a.current_balance, 0)

  async function refresh() {
    const data = await getSavingsAccounts()
    setAccounts(data)
  }

  async function toggleExpand(accountId: string) {
    if (expandedId === accountId) {
      setExpandedId(null)
      return
    }
    setExpandedId(accountId)
    if (!transactions[accountId]) {
      const txs = await getSavingsTransactions(accountId)
      setTransactions((prev) => ({ ...prev, [accountId]: txs }))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const result = await deleteSavingsAccount(deleteTarget.id)
    if (result.success) {
      toast.success('계좌가 삭제되었습니다')
      setDeleteTarget(null)
      await refresh()
    } else {
      toast.error(result.error || '삭제에 실패했습니다')
    }
  }

  async function handleDeleteTx(txId: string, accountId: string) {
    const result = await deleteSavingsTransaction(txId)
    if (result.success) {
      toast.success('거래가 삭제되었습니다')
      const txs = await getSavingsTransactions(accountId)
      setTransactions((prev) => ({ ...prev, [accountId]: txs }))
      await refresh()
    } else {
      toast.error(result.error || '삭제에 실패했습니다')
    }
  }

  return (
    <div>
      <Header
        title="저축 현황"
        description="저축 계좌와 목표를 관리합니다"
        action={
          <Button onClick={() => { setEditAccount(null); setFormOpen(true) }}>
            <Plus className="h-4 w-4" /> 계좌 추가
          </Button>
        }
      />

      {/* Total Summary */}
      <div className="rounded-2xl border-2 border-warm-light bg-warm-bg p-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-warm/10 flex items-center justify-center">
            <PiggyBank className="h-5 w-5 text-warm-dark" />
          </div>
          <div>
            <p className="text-sm text-warm-dark/70">총 저축액</p>
            <p className="text-xl font-bold text-warm-dark">{formatKRW(totalSavings)}</p>
          </div>
        </div>
      </div>

      {/* Account Cards */}
      {accounts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<PiggyBank className="h-12 w-12" />}
            title="저축 계좌가 없어요"
            description="첫 저축 계좌를 등록해보세요"
            action={
              <Button size="sm" onClick={() => { setEditAccount(null); setFormOpen(true) }}>
                <Plus className="h-4 w-4" /> 추가하기
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => {
            const progress = account.target_amount > 0
              ? Math.min((account.current_balance / account.target_amount) * 100, 100)
              : 0
            const isExpanded = expandedId === account.id
            const txList = transactions[account.id] ?? []

            return (
              <Card key={account.id} hover>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold truncate">{account.name}</h3>
                      <Badge className={PERSON_BG_CLASSES[account.person_type]}>
                        {PERSON_EMOJI[account.person_type]} {account.person_type}
                      </Badge>
                    </div>
                    {account.description && (
                      <p className="text-xs text-muted-foreground">{account.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => { setEditAccount(account); setFormOpen(true) }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(account)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-error/10 hover:text-error transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                {account.target_amount > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">
                        {formatKRW(account.current_balance)}
                      </span>
                      <span className="text-muted-foreground">
                        {formatKRW(account.target_amount)}
                      </span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-warm rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(progress, 1)}%` }}
                      />
                    </div>
                    <div className="text-right text-xs font-medium text-warm-dark mt-1">
                      {progress.toFixed(1)}%
                    </div>
                  </div>
                )}

                {account.target_amount === 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-semibold">{formatKRW(account.current_balance)}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={() => setTxModalAccount({ account, type: 'deposit' })}
                  >
                    <ArrowDownCircle className="h-3.5 w-3.5" /> 입금
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTxModalAccount({ account, type: 'withdraw' })}
                  >
                    <ArrowUpCircle className="h-3.5 w-3.5" /> 출금
                  </Button>
                  <button
                    onClick={() => toggleExpand(account.id)}
                    className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    내역 {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Transaction History */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t-2 border-border">
                    {txList.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">거래 내역이 없습니다</p>
                    ) : (
                      <div className="space-y-2">
                        {txList.slice(0, 10).map((tx) => (
                          <div key={tx.id} className="flex items-center gap-3 text-sm">
                            <span className="text-xs text-muted-foreground w-20 shrink-0">
                              {tx.transaction_date}
                            </span>
                            <span className={`font-medium ${tx.amount > 0 ? 'text-accent-dark' : 'text-primary-dark'}`}>
                              {tx.amount > 0 ? '+' : ''}{formatKRW(tx.amount)}
                            </span>
                            <span className="text-xs text-muted-foreground flex-1 truncate">
                              {tx.description || '-'}
                            </span>
                            <button
                              onClick={() => handleDeleteTx(tx.id, account.id)}
                              className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-error/10 hover:text-error transition-colors shrink-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Account Form Modal */}
      <AccountFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditAccount(null) }}
        editAccount={editAccount}
        onSaved={refresh}
      />

      {/* Transaction Modal */}
      {txModalAccount && (
        <TransactionFormModal
          open={!!txModalAccount}
          onClose={() => setTxModalAccount(null)}
          account={txModalAccount.account}
          type={txModalAccount.type}
          onSaved={async () => {
            await refresh()
            const txs = await getSavingsTransactions(txModalAccount.account.id)
            setTransactions((prev) => ({ ...prev, [txModalAccount.account.id]: txs }))
          }}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="계좌 삭제">
          <p className="text-sm text-muted-foreground mb-4">
            &quot;{deleteTarget.name}&quot; 계좌를 삭제하시겠습니까?
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete}>
              삭제
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function AccountFormModal({
  open,
  onClose,
  editAccount,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  editAccount: SavingsAccount | null
  onSaved: () => Promise<void>
}) {
  const isEdit = !!editAccount
  const [pending, setPending] = useState(false)

  const [form, setForm] = useState({
    name: '',
    person_type: '공통' as PersonType,
    target_amount: '',
    description: '',
  })

  useEffect(() => {
    if (editAccount) {
      setForm({
        name: editAccount.name,
        person_type: editAccount.person_type,
        target_amount: editAccount.target_amount > 0 ? editAccount.target_amount.toLocaleString() : '',
        description: editAccount.description || '',
      })
    } else {
      setForm({
        name: '',
        person_type: '공통',
        target_amount: '',
        description: '',
      })
    }
  }, [editAccount, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)

    if (!form.name) {
      toast.error('계좌명을 입력해주세요.')
      setPending(false)
      return
    }

    const targetAmount = parseInt(form.target_amount.replace(/,/g, ''), 10) || 0

    const payload: CreateSavingsAccountInput = {
      name: form.name,
      person_type: form.person_type,
      target_amount: targetAmount,
      description: form.description || undefined,
    }

    const result = isEdit
      ? await updateSavingsAccount(editAccount!.id, payload)
      : await createSavingsAccount(payload)

    if (result.success) {
      toast.success(isEdit ? '수정되었습니다' : '추가되었습니다')
      onClose()
      await onSaved()
    } else {
      toast.error(result.error || '오류가 발생했습니다')
    }

    setPending(false)
  }

  const personOptions = PERSON_TYPES.map((p) => ({ value: p, label: `${PERSON_EMOJI[p]} ${p}` }))

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? '계좌 수정' : '계좌 추가'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="name"
          label="계좌명"
          placeholder="예: 비상금, 여행 적금"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <Select
          id="person_type"
          label="인물"
          options={personOptions}
          value={form.person_type}
          onChange={(e) => setForm({ ...form, person_type: e.target.value as PersonType })}
        />

        <Input
          id="target_amount"
          label="목표 금액 (원)"
          type="text"
          inputMode="numeric"
          placeholder="0 (미설정 시 목표 없음)"
          value={form.target_amount}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, '')
            setForm({ ...form, target_amount: raw ? Number(raw).toLocaleString() : '' })
          }}
        />

        <Input
          id="description"
          label="설명 (선택)"
          placeholder="계좌에 대한 메모"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <div className="flex gap-3 mt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function TransactionFormModal({
  open,
  onClose,
  account,
  type,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  account: SavingsAccount
  type: 'deposit' | 'withdraw'
  onSaved: () => Promise<void>
}) {
  const isDeposit = type === 'deposit'
  const [pending, setPending] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    amount: '',
    description: '',
    transaction_date: today,
  })

  useEffect(() => {
    setForm({
      amount: '',
      description: '',
      transaction_date: today,
    })
  }, [open, today])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)

    const rawAmount = parseInt(form.amount.replace(/,/g, ''), 10)
    if (isNaN(rawAmount) || rawAmount <= 0) {
      toast.error('금액을 올바르게 입력해주세요.')
      setPending(false)
      return
    }

    const amount = isDeposit ? rawAmount : -rawAmount

    const result = await createSavingsTransaction({
      account_id: account.id,
      amount,
      description: form.description || undefined,
      transaction_date: form.transaction_date,
    })

    if (result.success) {
      toast.success(isDeposit ? '입금되었습니다' : '출금되었습니다')
      onClose()
      await onSaved()
    } else {
      toast.error(result.error || '오류가 발생했습니다')
    }

    setPending(false)
  }

  return (
    <Modal open={open} onClose={onClose} title={`${account.name} - ${isDeposit ? '입금' : '출금'}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="amount"
          label="금액 (원)"
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={form.amount}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, '')
            setForm({ ...form, amount: raw ? Number(raw).toLocaleString() : '' })
          }}
          required
        />

        <Input
          id="description"
          label="설명 (선택)"
          placeholder={isDeposit ? '예: 매월 적금' : '예: 비상 출금'}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <Input
          id="transaction_date"
          label="날짜"
          type="date"
          value={form.transaction_date}
          onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
          required
        />

        <div className="flex gap-3 mt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            취소
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={pending}
            variant={isDeposit ? 'accent' : 'default'}
          >
            {pending ? '처리 중...' : isDeposit ? '입금' : '출금'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
