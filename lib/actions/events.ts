'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, CreateEventInput, Event } from '@/types'

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

export async function getEvents(month?: string): Promise<Event[]> {
  const supabase = await createClient()

  let query = supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true })

  if (month) {
    const start = `${month}-01`
    const [y, m] = month.split('-').map(Number)
    const endDate = new Date(y, m, 0)
    const end = `${y}-${String(m).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

    // Events that overlap with the month:
    // event_date <= end of month AND (event_end_date >= start of month OR event_end_date is null AND event_date >= start of month)
    query = query
      .lte('event_date', end)
      .or(`event_end_date.gte.${start},event_end_date.is.null`)
      .gte('event_date', start)
  }

  const { data, error } = await query

  if (error) {
    console.error('getEvents error:', error)
    return []
  }

  return data ?? []
}

export async function getUpcomingEvents(limit = 5): Promise<Event[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('getUpcomingEvents error:', error)
    return []
  }

  return data ?? []
}

export async function createEvent(data: CreateEventInput): Promise<ActionResult> {
  const supabase = await createClient()
  const familyId = await getFamilyId()
  if (!familyId) return { success: false, error: '인증이 필요합니다.' }

  const { error } = await supabase.from('events').insert({
    family_id: familyId,
    title: data.title,
    description: data.description || null,
    event_date: data.event_date,
    event_end_date: data.event_end_date || null,
    estimated_cost: data.estimated_cost ?? 0,
    actual_cost: data.actual_cost ?? 0,
    person_type: data.person_type,
    is_recurring: data.is_recurring ?? false,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/calendar')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateEvent(
  id: string,
  data: Partial<CreateEventInput>
): Promise<ActionResult> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description || null
  if (data.event_date !== undefined) updateData.event_date = data.event_date
  if (data.event_end_date !== undefined) updateData.event_end_date = data.event_end_date || null
  if (data.estimated_cost !== undefined) updateData.estimated_cost = data.estimated_cost
  if (data.actual_cost !== undefined) updateData.actual_cost = data.actual_cost
  if (data.person_type !== undefined) updateData.person_type = data.person_type
  if (data.is_recurring !== undefined) updateData.is_recurring = data.is_recurring

  const { error } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/calendar')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/calendar')
  revalidatePath('/dashboard')
  return { success: true }
}
