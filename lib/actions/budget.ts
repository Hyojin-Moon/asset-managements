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

  const { error } = await supabase
    .from('budget_items')
    .update(updateData)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

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
