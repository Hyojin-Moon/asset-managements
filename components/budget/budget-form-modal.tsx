'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { MonthInput } from '@/components/ui/month-input'
import { createBudgetItem, updateBudgetItem } from '@/lib/actions/budget'
import { PERSON_TYPES } from '@/lib/utils/constants'
import { toast } from 'sonner'
import type { TransactionType, PersonType, BudgetItem, ExpenseCategory } from '@/types'

interface BudgetFormModalProps {
  open: boolean
  onClose: () => void
  type: TransactionType
  editItem?: BudgetItem | null
  categories?: ExpenseCategory[]
}

export function BudgetFormModal({ open, onClose, type, editItem, categories }: BudgetFormModalProps) {
  const isEdit = !!editItem
  const isExpense = type === 'expense'
  const title = isEdit
    ? `${isExpense ? '지출' : '수입'} 항목 수정`
    : `${isExpense ? '지출' : '수입'} 항목 추가`

  const [pending, setPending] = useState(false)
  const [form, setForm] = useState({
    person_type: '공통' as PersonType,
    category_id: '',
    name: '',
    amount: '',
    recurrence: 'monthly' as 'monthly' | 'one_time',
    effective_from: new Date().toISOString().slice(0, 7),
    effective_until: '',
    memo: '',
  })

  useEffect(() => {
    if (editItem) {
      setForm({
        person_type: editItem.person_type,
        category_id: editItem.category_id || '',
        name: editItem.name,
        amount: String(editItem.amount),
        recurrence: editItem.recurrence,
        effective_from: editItem.effective_from.slice(0, 7),
        effective_until: editItem.effective_until?.slice(0, 7) || '',
        memo: editItem.memo || '',
      })
    } else {
      setForm({
        person_type: '공통',
        category_id: '',
        name: '',
        amount: '',
        recurrence: 'monthly',
        effective_from: new Date().toISOString().slice(0, 7),
        effective_until: '',
        memo: '',
      })
    }
  }, [editItem, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)

    const amount = parseInt(form.amount.replace(/,/g, ''), 10)
    if (!form.name || isNaN(amount) || amount <= 0) {
      toast.error('항목명과 금액을 올바르게 입력해주세요.')
      setPending(false)
      return
    }

    const payload = {
      type,
      person_type: form.person_type,
      category_id: form.category_id || undefined,
      name: form.name,
      amount,
      recurrence: form.recurrence as 'monthly' | 'one_time',
      effective_from: form.effective_from,
      effective_until: form.effective_until || undefined,
      memo: form.memo || undefined,
    }

    const result = isEdit
      ? await updateBudgetItem(editItem!.id, payload)
      : await createBudgetItem(payload)

    if (result.success) {
      toast.success(isEdit ? '수정되었습니다' : '추가되었습니다')
      onClose()
    } else {
      toast.error(result.error || '오류가 발생했습니다')
    }

    setPending(false)
  }

  const personOptions = PERSON_TYPES.map((p) => ({ value: p, label: p }))
  const categoryOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }))
  const recurrenceOptions = [
    { value: 'monthly', label: '매월' },
    { value: 'one_time', label: '일회성' },
  ]

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select
          id="person_type"
          label="인물"
          options={personOptions}
          value={form.person_type}
          onChange={(e) => setForm({ ...form, person_type: e.target.value as PersonType })}
        />

        {isExpense && (
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
          id="name"
          label="항목명"
          placeholder={isExpense ? '예: 월세, 보험료' : '예: 급여, 부수입'}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
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

        <Select
          id="recurrence"
          label="반복"
          options={recurrenceOptions}
          value={form.recurrence}
          onChange={(e) => setForm({ ...form, recurrence: e.target.value as 'monthly' | 'one_time' })}
        />

        <div className="grid grid-cols-2 gap-3">
          <MonthInput
            id="effective_from"
            label="시작월"
            value={form.effective_from}
            onChange={(v) => setForm({ ...form, effective_from: v })}
            required
          />
          <MonthInput
            id="effective_until"
            label="종료월 (선택)"
            value={form.effective_until}
            onChange={(v) => setForm({ ...form, effective_until: v })}
            placeholder="무기한"
            clearable
          />
        </div>

        <Input
          id="memo"
          label="메모 (선택)"
          placeholder="메모"
          value={form.memo}
          onChange={(e) => setForm({ ...form, memo: e.target.value })}
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
