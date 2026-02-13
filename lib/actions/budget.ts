'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, TransactionType, PersonType, RecurrenceType } from '@/types'

export async function getBudgetItems(filters?: {
  type?: TransactionType
  personType?: PersonType
  month?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('budget_items')
    .select('*, expense_categories(name)')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }

  if (filters?.personType) {
    query = query.eq('person_type', filters.personType)
  }

  if (filters?.month) {
    const monthDate = `${filters.month}-01`
    query = query
      .lte('effective_from', monthDate)
      .or(`effective_until.is.null,effective_until.gte.${monthDate}`)
  }

  const { data, error } = await query

  if (error) {
    console.error('getBudgetItems error:', error)
    return []
  }

  return (data ?? []).map((item) => ({
    ...item,
    category_name: (item.expense_categories as { name: string } | null)?.name ?? null,
  }))
}

async function getFamilyId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  return profile?.family_id ?? null
}

export async function createBudgetItem(data: {
  type: TransactionType
  person_type: PersonType
  category_id?: string
  name: string
  amount: number
  recurrence: RecurrenceType
  effective_from: string
  effective_until?: string
  memo?: string
  auto_generate?: boolean
}): Promise<ActionResult> {
  const supabase = await createClient()
  const familyId = await getFamilyId()
  if (!familyId) return { success: false, error: '인증이 필요합니다.' }

  const { error } = await supabase.from('budget_items').insert({
    family_id: familyId,
    type: data.type,
    person_type: data.person_type,
    category_id: data.category_id || null,
    name: data.name,
    amount: data.amount,
    recurrence: data.recurrence,
    effective_from: `${data.effective_from}-01`,
    effective_until: data.effective_until ? `${data.effective_until}-01` : null,
    memo: data.memo || null,
    auto_generate: data.auto_generate ?? false,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/income')
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateBudgetItem(
  id: string,
  data: {
    person_type?: PersonType
    category_id?: string | null
    name?: string
    amount?: number
    recurrence?: RecurrenceType
    effective_from?: string
    effective_until?: string | null
    memo?: string | null
    auto_generate?: boolean
  }
): Promise<ActionResult> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (data.person_type !== undefined) updateData.person_type = data.person_type
  if (data.category_id !== undefined) updateData.category_id = data.category_id || null
  if (data.name !== undefined) updateData.name = data.name
  if (data.amount !== undefined) updateData.amount = data.amount
  if (data.recurrence !== undefined) updateData.recurrence = data.recurrence
  if (data.effective_from !== undefined) updateData.effective_from = `${data.effective_from}-01`
  if (data.effective_until !== undefined) updateData.effective_until = data.effective_until ? `${data.effective_until}-01` : null
  if (data.memo !== undefined) updateData.memo = data.memo
  if (data.auto_generate !== undefined) updateData.auto_generate = data.auto_generate

  const { error } = await supabase
    .from('budget_items')
    .update(updateData)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  // auto_generate가 켜졌으면 현재월 거래 즉시 생성
  if (data.auto_generate === true) {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    await generateBudgetTransactions(currentMonth, [id])
  }

  revalidatePath('/income')
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteBudgetItem(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('budget_items')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/income')
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateBudgetItemOrder(
  items: { id: string; sort_order: number }[]
): Promise<ActionResult> {
  const supabase = await createClient()

  // 개별 업데이트를 병렬로 실행
  const results = await Promise.all(
    items.map(({ id, sort_order }) =>
      supabase
        .from('budget_items')
        .update({ sort_order })
        .eq('id', id)
    )
  )

  const failed = results.find((r) => r.error)
  if (failed?.error) return { success: false, error: failed.error.message }

  revalidatePath('/income')
  revalidatePath('/expenses')
  return { success: true }
}

export async function checkDuplicateBudgetTransactions(
  month: string,
  budgetItemIds: string[]
): Promise<{ duplicateIds: string[]; newIds: string[] }> {
  const supabase = await createClient()

  const [y, m] = month.split('-').map(Number)
  const monthStart = `${month}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`

  const { data: existingTransactions } = await supabase
    .from('transactions')
    .select('budget_item_id')
    .in('budget_item_id', budgetItemIds)
    .gte('transaction_date', monthStart)
    .lte('transaction_date', monthEnd)

  const existingSet = new Set(
    (existingTransactions ?? []).map((t) => t.budget_item_id)
  )

  return {
    duplicateIds: budgetItemIds.filter((id) => existingSet.has(id)),
    newIds: budgetItemIds.filter((id) => !existingSet.has(id)),
  }
}

export async function generateBudgetTransactions(
  month: string,
  budgetItemIds: string[]
): Promise<{ success: boolean; created: number; skipped: number; error?: string }> {
  const supabase = await createClient()
  const familyId = await getFamilyId()
  if (!familyId) return { success: false, created: 0, skipped: 0, error: '인증이 필요합니다.' }
  if (budgetItemIds.length === 0) return { success: true, created: 0, skipped: 0 }

  const { data: { user } } = await supabase.auth.getUser()

  // 선택된 ID에 해당하는 활성 예산항목 조회
  const { data: budgetItems, error: fetchError } = await supabase
    .from('budget_items')
    .select('*')
    .in('id', budgetItemIds)
    .eq('is_active', true)
    .eq('type', 'expense')

  if (fetchError) return { success: false, created: 0, skipped: 0, error: fetchError.message }
  if (!budgetItems || budgetItems.length === 0) return { success: true, created: 0, skipped: 0 }

  // 이미 생성된 거래 확인 (같은 budget_item_id + 같은 월)
  const [gy, gm] = month.split('-').map(Number)
  const monthStart = `${month}-01`
  const lastDay = new Date(gy, gm, 0).getDate()
  const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`

  const { data: existingTransactions } = await supabase
    .from('transactions')
    .select('budget_item_id')
    .in('budget_item_id', budgetItemIds)
    .gte('transaction_date', monthStart)
    .lte('transaction_date', monthEnd)

  const existingSet = new Set(
    (existingTransactions ?? []).map((t) => t.budget_item_id)
  )

  const newTransactions = budgetItems
    .filter((b) => !existingSet.has(b.id))
    .map((b) => ({
      family_id: familyId,
      type: 'expense' as const,
      category_id: b.category_id || null,
      person_type: b.person_type,
      description: b.name,
      amount: b.amount,
      transaction_date: `${month}-01`,
      is_emergency: false,
      budget_item_id: b.id,
      memo: '고정지출 자동생성',
      created_by: user?.id || null,
    }))

  const skipped = budgetItems.length - newTransactions.length

  if (newTransactions.length === 0) return { success: true, created: 0, skipped }

  const { error: insertError } = await supabase
    .from('transactions')
    .insert(newTransactions)

  if (insertError) return { success: false, created: 0, skipped: 0, error: insertError.message }

  revalidatePath('/transactions')
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  revalidatePath('/reports/monthly')
  return { success: true, created: newTransactions.length, skipped }
}
