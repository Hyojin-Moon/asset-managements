'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, TransactionType, PersonType, CardProvider } from '@/types'

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

export async function getTransactions(filters: {
  month?: string
  personType?: PersonType
  categoryId?: string
  type?: TransactionType
  search?: string
  page?: number
  pageSize?: number
}) {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 30
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('transactions')
    .select('*, expense_categories(name)', { count: 'exact' })
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters.month) {
    const start = `${filters.month}-01`
    const [y, m] = filters.month.split('-').map(Number)
    const endDate = new Date(y, m, 0)
    const end = `${y}-${String(m).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
    query = query.gte('transaction_date', start).lte('transaction_date', end)
  }

  if (filters.personType) {
    query = query.eq('person_type', filters.personType)
  }

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId)
  }

  if (filters.type) {
    query = query.eq('type', filters.type)
  }

  if (filters.search) {
    query = query.ilike('description', `%${filters.search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('getTransactions error:', error)
    return { data: [], count: 0 }
  }

  const mapped = (data ?? []).map((item) => ({
    ...item,
    category_name: (item.expense_categories as { name: string } | null)?.name ?? null,
  }))

  return { data: mapped, count: count ?? 0 }
}

export async function getRecentTransactions(limit: number = 5) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select('*, expense_categories(name)')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getRecentTransactions error:', error)
    return []
  }

  return (data ?? []).map((item) => ({
    ...item,
    category_name: (item.expense_categories as { name: string } | null)?.name ?? null,
  }))
}

export async function createTransaction(data: {
  type: TransactionType
  category_id?: string
  person_type: PersonType
  description: string
  amount: number
  transaction_date: string
  is_emergency?: boolean
  card_provider?: CardProvider
  memo?: string
}): Promise<ActionResult> {
  const supabase = await createClient()
  const familyId = await getFamilyId()
  if (!familyId) return { success: false, error: '인증이 필요합니다.' }

  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('transactions').insert({
    family_id: familyId,
    type: data.type,
    category_id: data.category_id || null,
    person_type: data.person_type,
    description: data.description,
    amount: data.amount,
    transaction_date: data.transaction_date,
    is_emergency: data.is_emergency ?? false,
    card_provider: data.card_provider || null,
    memo: data.memo || null,
    created_by: user?.id,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateTransaction(
  id: string,
  data: {
    type?: TransactionType
    category_id?: string | null
    person_type?: PersonType
    description?: string
    amount?: number
    transaction_date?: string
    is_emergency?: boolean
    card_provider?: CardProvider | null
    memo?: string | null
  }
): Promise<ActionResult> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (data.type !== undefined) updateData.type = data.type
  if (data.category_id !== undefined) updateData.category_id = data.category_id || null
  if (data.person_type !== undefined) updateData.person_type = data.person_type
  if (data.description !== undefined) updateData.description = data.description
  if (data.amount !== undefined) updateData.amount = data.amount
  if (data.transaction_date !== undefined) updateData.transaction_date = data.transaction_date
  if (data.is_emergency !== undefined) updateData.is_emergency = data.is_emergency
  if (data.card_provider !== undefined) updateData.card_provider = data.card_provider || null
  if (data.memo !== undefined) updateData.memo = data.memo

  const { error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteTransactionsByMonth(month: string): Promise<ActionResult> {
  const supabase = await createClient()

  const start = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const endDate = new Date(y, m, 0)
  const end = `${y}-${String(m).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  const { error } = await supabase
    .from('transactions')
    .delete()
    .gte('transaction_date', start)
    .lte('transaction_date', end)

  if (error) return { success: false, error: error.message }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getMonthlyTotals(month: string) {
  const supabase = await createClient()

  const start = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const endDate = new Date(y, m, 0)
  const end = `${y}-${String(m).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('transactions')
    .select('type, person_type, amount, category_id, expense_categories(name)')
    .gte('transaction_date', start)
    .lte('transaction_date', end)

  if (error) {
    console.error('getMonthlyTotals error:', error)
    return { totalIncome: 0, totalExpense: 0, balance: 0, byPerson: {}, byCategory: {} }
  }

  let totalIncome = 0
  let totalExpense = 0
  const byPerson: Record<string, { income: number; expense: number }> = {}
  const byCategory: Record<string, number> = {}

  for (const row of data ?? []) {
    const amt = row.amount
    if (row.type === 'income') {
      totalIncome += amt
    } else {
      totalExpense += amt
    }

    if (!byPerson[row.person_type]) {
      byPerson[row.person_type] = { income: 0, expense: 0 }
    }
    if (row.type === 'income') {
      byPerson[row.person_type].income += amt
    } else {
      byPerson[row.person_type].expense += amt
    }

    if (row.type === 'expense') {
      const catName = ((row.expense_categories as unknown) as { name: string } | null)?.name ?? '미분류'
      byCategory[catName] = (byCategory[catName] ?? 0) + amt
    }
  }

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    byPerson,
    byCategory,
  }
}
