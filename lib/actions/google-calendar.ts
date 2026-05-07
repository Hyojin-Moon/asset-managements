'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { decrypt, encrypt } from '@/lib/utils/crypto'
import { buildAuthUrl, listCalendars, refreshAccessToken } from '@/lib/google/client'
import { syncFamilyCalendars } from '@/lib/google/sync'
import type {
  ActionResult, GoogleCalendarConnection, GoogleCalendarSubscription,
  GoogleCalendarListItem, PersonType,
} from '@/types'
import { randomBytes } from 'crypto'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) return null
  return { supabase, userId: user.id, familyId: profile.family_id }
}

/** 현재 유저가 google_calendar_connections의 owner(연결한 사용자)인지 검증 */
async function ensureOwner(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; familyId: string; userId: string } | { error: string }> {
  const ctx = await getContext()
  if (!ctx) return { error: '인증이 필요합니다.' }

  const { data } = await ctx.supabase
    .from('google_calendar_connections')
    .select('user_id')
    .eq('family_id', ctx.familyId)
    .maybeSingle()

  if (!data) return { error: '구글 캘린더가 연결되지 않았습니다.' }
  if (data.user_id !== ctx.userId) return { error: '연결한 본인만 변경할 수 있습니다.' }
  return ctx
}

export async function getGoogleAuthUrl(): Promise<{ url: string } | { error: string }> {
  const ctx = await getContext()
  if (!ctx) return { error: '인증이 필요합니다.' }

  // state에 user_id 포함하여 callback에서 검증
  const state = `${ctx.userId}:${randomBytes(16).toString('hex')}`
  return { url: buildAuthUrl(state) }
}

export async function getConnection(): Promise<GoogleCalendarConnection | null> {
  const ctx = await getContext()
  if (!ctx) return null

  const { data } = await ctx.supabase
    .from('google_calendar_connections')
    .select('id, family_id, user_id, google_email, token_expires_at, default_person_type, created_at, updated_at')
    .eq('family_id', ctx.familyId)
    .maybeSingle()

  if (!data) return null
  return { ...data, is_owner: data.user_id === ctx.userId } as GoogleCalendarConnection
}

export async function getSubscriptions(): Promise<GoogleCalendarSubscription[]> {
  const ctx = await getContext()
  if (!ctx) return []

  const { data } = await ctx.supabase
    .from('google_calendar_subscriptions')
    .select('*')
    .eq('family_id', ctx.familyId)
    .order('calendar_name')

  return (data ?? []) as GoogleCalendarSubscription[]
}

/** 구글 API에서 사용 가능한 캘린더 목록 fetch (owner만 호출 가능) */
export async function fetchAvailableCalendars(): Promise<
  { calendars: GoogleCalendarListItem[] } | { error: string }
> {
  const ownerCtx = await ensureOwner()
  if ('error' in ownerCtx) return { error: ownerCtx.error }
  const ctx = ownerCtx

  const { data: connection } = await ctx.supabase
    .from('google_calendar_connections')
    .select('*')
    .eq('family_id', ctx.familyId)
    .maybeSingle()

  if (!connection) return { error: '구글 캘린더가 연결되지 않았습니다.' }

  // 토큰 갱신 (만료 임박 시)
  let accessToken = decrypt(connection.access_token_encrypted)
  if (new Date(connection.token_expires_at).getTime() < Date.now() + 60_000) {
    try {
      const refreshed = await refreshAccessToken(decrypt(connection.refresh_token_encrypted))
      accessToken = refreshed.access_token
      await ctx.supabase
        .from('google_calendar_connections')
        .update({
          access_token_encrypted: encrypt(accessToken),
          token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq('id', connection.id)
    } catch (e) {
      return { error: `토큰 갱신 실패: ${(e as Error).message}` }
    }
  }

  try {
    const items = await listCalendars(accessToken)
    return {
      calendars: items.map((c) => ({
        id: c.id,
        summary: c.summary,
        primary: c.primary,
        backgroundColor: c.backgroundColor,
        accessRole: c.accessRole,
      })),
    }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

/** 캘린더 구독 추가/제거 (owner만) */
export async function toggleSubscription(
  googleCalendarId: string,
  calendarName: string,
  enabled: boolean,
  backgroundColor?: string,
): Promise<ActionResult> {
  const ownerCtx = await ensureOwner()
  if ('error' in ownerCtx) return { success: false, error: ownerCtx.error }
  const ctx = ownerCtx

  const { data: connection } = await ctx.supabase
    .from('google_calendar_connections')
    .select('id')
    .eq('family_id', ctx.familyId)
    .maybeSingle()

  if (!connection) return { success: false, error: '구글 캘린더가 연결되지 않았습니다.' }

  if (enabled) {
    const { error } = await ctx.supabase
      .from('google_calendar_subscriptions')
      .upsert(
        {
          connection_id: connection.id,
          family_id: ctx.familyId,
          google_calendar_id: googleCalendarId,
          calendar_name: calendarName,
          background_color: backgroundColor || null,
          enabled: true,
        },
        { onConflict: 'connection_id,google_calendar_id' },
      )
    if (error) return { success: false, error: error.message }
  } else {
    // 비활성화: 구독 삭제 + 해당 캘린더에서 가져온 events도 삭제
    await ctx.supabase
      .from('events')
      .delete()
      .eq('family_id', ctx.familyId)
      .eq('google_calendar_id', googleCalendarId)

    const { error } = await ctx.supabase
      .from('google_calendar_subscriptions')
      .delete()
      .eq('connection_id', connection.id)
      .eq('google_calendar_id', googleCalendarId)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/calendar')
  return { success: true }
}

export async function updateDefaultPersonType(personType: PersonType): Promise<ActionResult> {
  const ownerCtx = await ensureOwner()
  if ('error' in ownerCtx) return { success: false, error: ownerCtx.error }
  const ctx = ownerCtx

  const { error } = await ctx.supabase
    .from('google_calendar_connections')
    .update({ default_person_type: personType })
    .eq('family_id', ctx.familyId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function disconnectGoogleCalendar(): Promise<ActionResult> {
  const ownerCtx = await ensureOwner()
  if ('error' in ownerCtx) return { success: false, error: ownerCtx.error }
  const ctx = ownerCtx

  // 1. google source events 삭제
  await ctx.supabase
    .from('events')
    .delete()
    .eq('family_id', ctx.familyId)
    .eq('source', 'google')

  // 2. connection 삭제 (cascade로 subscriptions도 삭제됨)
  const { error } = await ctx.supabase
    .from('google_calendar_connections')
    .delete()
    .eq('family_id', ctx.familyId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  revalidatePath('/calendar')
  return { success: true }
}

export async function syncNow(): Promise<ActionResult & { syncedCount?: number }> {
  const ctx = await getContext()
  if (!ctx) return { success: false, error: '인증이 필요합니다.' }

  try {
    const result = await syncFamilyCalendars(ctx.familyId)
    revalidatePath('/calendar')
    if (result.errors.length > 0) {
      return {
        success: false,
        error: result.errors.map((e) => `${e.calendar}: ${e.error}`).join('\n'),
        syncedCount: result.synced,
      }
    }
    return { success: true, syncedCount: result.synced }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
