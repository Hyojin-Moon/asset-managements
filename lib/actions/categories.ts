'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, PersonType } from '@/types'

export async function getCategories(personType?: PersonType) {
  const supabase = await createClient()

  let query = supabase
    .from('expense_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (personType) {
    query = query.or(`person_type.eq.${personType},person_type.eq.공통`)
  }

  const { data, error } = await query

  if (error) {
    console.error('getCategories error:', error)
    return []
  }

  return data ?? []
}

export async function createCategory(data: {
  name: string
  person_type: PersonType
}): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { success: false, error: '프로필을 찾을 수 없습니다.' }

  const { error } = await supabase.from('expense_categories').insert({
    family_id: profile.family_id,
    name: data.name,
    person_type: data.person_type,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  revalidatePath('/expenses')
  return { success: true }
}

export async function updateCategory(
  id: string,
  data: { name?: string; person_type?: PersonType }
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('expense_categories')
    .update(data)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  revalidatePath('/expenses')
  return { success: true }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('expense_categories')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  revalidatePath('/expenses')
  return { success: true }
}
