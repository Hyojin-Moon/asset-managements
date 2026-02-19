'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DateInput } from '@/components/ui/date-input'
import { createTransaction, updateTransaction } from '@/lib/actions/transactions'
import { PERSON_TYPES } from '@/lib/utils/constants'
import { toast } from 'sonner'
import type { Transaction, TransactionType, PersonType, ExpenseCategory } from '@/types'

interface TransactionFormProps {
  categories: ExpenseCategory[]
  editItem?: Transaction | null
  onSuccess?: () => void
  onCancel?: () => void
  defaultType?: TransactionType
}

export function TransactionForm({ categories, editItem, onSuccess, onCancel, defaultType }: TransactionFormProps) {
  const isEdit = !!editItem
  const [pending, setPending] = useState(false)
  const [form, setForm] = useState({
    type: (defaultType ?? 'expense') as TransactionType,
    person_type: '공통' as PersonType,
    category_id: '',
    description: '',
    amount: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    is_emergency: false,
    card_provider: '' as string,
    memo: '',
  })

  useEffect(() => {
    if (editItem) {
      setForm({
        type: editItem.type,
        person_type: editItem.person_type,
        category_id: editItem.category_id || '',
        description: editItem.description,
        amount: editItem.amount.toLocaleString(),
        transaction_date: editItem.transaction_date,
        is_emergency: editItem.is_emergency,
        card_provider: editItem.card_provider || '',
        memo: editItem.memo || '',
      })
    }
  }, [editItem])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)

    const amount = parseInt(form.amount.replace(/,/g, ''), 10)
    if (!form.description || isNaN(amount) || amount <= 0) {
      toast.error('설명과 금액을 올바르게 입력해주세요.')
      setPending(false)
      return
    }

    const payload = {
      type: form.type,
      person_type: form.person_type,
      category_id: form.type === 'expense' ? form.category_id || undefined : undefined,
      description: form.description,
      amount,
      transaction_date: form.transaction_date,
      is_emergency: form.is_emergency,
      card_provider: form.card_provider ? (form.card_provider as 'samsung' | 'kb' | 'other') : undefined,
      memo: form.memo || undefined,
    }

    const result = isEdit
      ? await updateTransaction(editItem!.id, payload)
      : await createTransaction(payload)

    if (result.success) {
      toast.success(isEdit ? '수정되었습니다' : '추가되었습니다')
      onSuccess?.()
    } else {
      toast.error(result.error || '오류가 발생했습니다')
    }
    setPending(false)
  }

  const personOptions = PERSON_TYPES.map((p) => ({ value: p, label: p }))
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }))
  const cardOptions = [
    { value: 'samsung', label: '삼성카드' },
    { value: 'kb', label: '국민카드' },
    { value: 'other', label: '기타' },
  ]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Type toggle */}
      <div>
        <label className="text-sm font-medium text-foreground/80 mb-1.5 block">타입</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setForm({ ...form, type: 'expense' })}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
              form.type === 'expense'
                ? 'bg-primary-bg border-primary-light text-primary-dark'
                : 'bg-surface border-border text-muted-foreground hover:border-border-hover'
            }`}
          >
            지출
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, type: 'income' })}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
              form.type === 'income'
                ? 'bg-accent-bg border-accent-light text-accent-dark'
                : 'bg-surface border-border text-muted-foreground hover:border-border-hover'
            }`}
          >
            수입
          </button>
        </div>
      </div>

      <Select
        id="person_type"
        label="인물"
        options={personOptions}
        value={form.person_type}
        onChange={(e) => setForm({ ...form, person_type: e.target.value as PersonType })}
      />

      {form.type === 'expense' && (
        <Select
          id="category_id"
          label="카테고리"
          options={categoryOptions}
          placeholder="선택하세요"
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: e.target.value })}
        />
      )}

      <Input
        id="description"
        label="설명"
        placeholder={form.type === 'expense' ? '예: 배달의민족, 스타벅스' : '예: 급여, 부수입'}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        required
      />

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

      <DateInput
        id="transaction_date"
        label="날짜"
        value={form.transaction_date}
        onChange={(v) => setForm({ ...form, transaction_date: v })}
        required
      />

      {form.type === 'expense' && (
        <>
          <Select
            id="card_provider"
            label="카드 (선택)"
            options={cardOptions}
            placeholder="현금/기타"
            value={form.card_provider}
            onChange={(e) => setForm({ ...form, card_provider: e.target.value })}
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_emergency}
              onChange={(e) => setForm({ ...form, is_emergency: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary accent-primary"
            />
            <span className="text-sm text-foreground/80">비상 지출</span>
          </label>
        </>
      )}

      <Input
        id="memo"
        label="메모 (선택)"
        placeholder="메모"
        value={form.memo}
        onChange={(e) => setForm({ ...form, memo: e.target.value })}
      />

      <div className="flex gap-3 mt-2">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? '저장 중...' : isEdit ? '수정' : '저장'}
        </Button>
      </div>
    </form>
  )
}
