'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, CategoryMappingRule } from '@/types'

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

export async function getMappingRules(): Promise<CategoryMappingRule[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('category_mapping_rules')
    .select('*, expense_categories(name)')
    .order('keyword', { ascending: true })

  if (error) {
    console.error('getMappingRules error:', error)
    return []
  }

  return (data ?? []).map((rule) => ({
    ...rule,
    category_name: (rule.expense_categories as { name: string } | null)?.name ?? null,
  }))
}

export async function deleteMappingRule(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('category_mapping_rules')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  revalidatePath('/card-upload')
  return { success: true }
}

export async function updateMappingRule(
  id: string,
  data: { keyword?: string; category_id?: string }
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('category_mapping_rules')
    .update(data)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  revalidatePath('/card-upload')
  return { success: true }
}

export async function createMappingRule(data: {
  keyword: string
  category_id: string
}): Promise<ActionResult> {
  const supabase = await createClient()
  const familyId = await getFamilyId()
  if (!familyId) return { success: false, error: '인증이 필요합니다.' }

  const { error } = await supabase
    .from('category_mapping_rules')
    .insert({
      family_id: familyId,
      keyword: data.keyword,
      category_id: data.category_id,
      priority: 10,
    })

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  revalidatePath('/card-upload')
  return { success: true }
}

export async function exportTransactionsCSV(): Promise<{ success: boolean; csv?: string; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select('*, expense_categories(name)')
    .order('transaction_date', { ascending: false })

  if (error) return { success: false, error: error.message }

  const rows = data ?? []

  const header = '날짜,유형,인물,카테고리,설명,금액,비상지출,카드사,메모'
  const csvRows = rows.map((row) => {
    const catName = (row.expense_categories as { name: string } | null)?.name ?? ''
    const type = row.type === 'income' ? '수입' : '지출'
    const emergency = row.is_emergency ? 'Y' : 'N'
    const card = row.card_provider ?? ''
    const memo = (row.memo ?? '').replace(/"/g, '""')
    const desc = (row.description ?? '').replace(/"/g, '""')
    return `${row.transaction_date},${type},${row.person_type},"${catName}","${desc}",${row.amount},${emergency},${card},"${memo}"`
  })

  const csv = [header, ...csvRows].join('\n')
  return { success: true, csv }
}

export async function exportBudgetCSV(): Promise<{ success: boolean; csv?: string; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('budget_items')
    .select('*, expense_categories(name)')
    .eq('is_active', true)
    .order('type', { ascending: true })
    .order('person_type', { ascending: true })

  if (error) return { success: false, error: error.message }

  const rows = data ?? []
  const header = '유형,인물,카테고리,항목명,금액,반복,시작월,종료월,메모'
  const csvRows = rows.map((row) => {
    const catName = (row.expense_categories as { name: string } | null)?.name ?? ''
    const type = row.type === 'income' ? '수입' : '지출'
    const recurrence = row.recurrence === 'monthly' ? '매월' : '일회성'
    const effectiveFrom = row.effective_from?.slice(0, 7) ?? ''
    const effectiveUntil = row.effective_until?.slice(0, 7) ?? ''
    const memo = (row.memo ?? '').replace(/"/g, '""')
    return `${type},${row.person_type},"${catName}","${row.name}",${row.amount},${recurrence},${effectiveFrom},${effectiveUntil},"${memo}"`
  })

  const csv = [header, ...csvRows].join('\n')
  return { success: true, csv }
}

export async function exportEventsCSV(): Promise<{ success: boolean; csv?: string; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })

  if (error) return { success: false, error: error.message }

  const rows = data ?? []
  const header = '날짜,종료일,제목,인물,예상비용,실제비용,설명'
  const csvRows = rows.map((row) => {
    const desc = (row.description ?? '').replace(/"/g, '""')
    const title = (row.title ?? '').replace(/"/g, '""')
    return `${row.event_date},${row.event_end_date ?? ''},"${title}",${row.person_type},${row.estimated_cost},${row.actual_cost},"${desc}"`
  })

  const csv = [header, ...csvRows].join('\n')
  return { success: true, csv }
}
