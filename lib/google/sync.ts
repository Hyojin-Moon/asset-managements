import { createClient } from '@/lib/supabase/server'
import { decrypt, encrypt } from '@/lib/utils/crypto'
import {
  listEvents, refreshAccessToken, extractDate, extractEndDate,
  type GoogleEvent,
} from './client'
import type { PersonType } from '@/types'

interface ConnectionRow {
  id: string
  family_id: string
  access_token_encrypted: string
  refresh_token_encrypted: string
  token_expires_at: string
  default_person_type: PersonType
}

interface SubscriptionRow {
  id: string
  connection_id: string
  family_id: string
  google_calendar_id: string
  sync_token: string | null
}

/** 만료된 access token이면 갱신, 아니면 그대로 반환. 갱신되면 DB도 업데이트. */
async function getValidAccessToken(connection: ConnectionRow): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at).getTime()
  // 1분 여유두고 갱신
  if (expiresAt > Date.now() + 60_000) {
    return decrypt(connection.access_token_encrypted)
  }

  const refreshToken = decrypt(connection.refresh_token_encrypted)
  const refreshed = await refreshAccessToken(refreshToken)
  const newAccessToken = refreshed.access_token
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()

  const supabase = await createClient()
  await supabase
    .from('google_calendar_connections')
    .update({
      access_token_encrypted: encrypt(newAccessToken),
      token_expires_at: newExpiresAt,
    })
    .eq('id', connection.id)

  return newAccessToken
}

/** 현재 가족의 활성 구독을 모두 동기화. 토큰 만료/네트워크 에러는 throw하지 않고 결과로 보고. */
export async function syncFamilyCalendars(familyId: string): Promise<{
  synced: number
  errors: { calendar: string; error: string }[]
}> {
  const supabase = await createClient()

  const { data: connection } = await supabase
    .from('google_calendar_connections')
    .select('*')
    .eq('family_id', familyId)
    .maybeSingle()

  if (!connection) return { synced: 0, errors: [] }

  const { data: subscriptions } = await supabase
    .from('google_calendar_subscriptions')
    .select('*')
    .eq('family_id', familyId)
    .eq('enabled', true)

  if (!subscriptions || subscriptions.length === 0) return { synced: 0, errors: [] }

  let accessToken: string
  try {
    accessToken = await getValidAccessToken(connection as ConnectionRow)
  } catch (e) {
    return {
      synced: 0,
      errors: [{ calendar: '인증', error: (e as Error).message }],
    }
  }

  let synced = 0
  const errors: { calendar: string; error: string }[] = []

  for (const sub of subscriptions as SubscriptionRow[]) {
    try {
      const count = await syncOneCalendar(
        accessToken,
        sub,
        connection as ConnectionRow,
      )
      synced += count
    } catch (e) {
      errors.push({
        calendar: sub.google_calendar_id,
        error: (e as Error).message,
      })
    }
  }

  return { synced, errors }
}

async function syncOneCalendar(
  accessToken: string,
  sub: SubscriptionRow,
  connection: ConnectionRow,
): Promise<number> {
  const supabase = await createClient()

  let pageToken: string | undefined
  let nextSyncToken: string | undefined
  const allItems: GoogleEvent[] = []

  // 첫 동기화면 timeMin = 1년 전부터, 이후엔 sync token 기반
  let useSyncToken = sub.sync_token ?? undefined
  const timeMin = !useSyncToken
    ? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
    : undefined

  do {
    try {
      const result = await listEvents(accessToken, sub.google_calendar_id, {
        pageToken,
        syncToken: useSyncToken,
        timeMin,
      })
      allItems.push(...result.items)
      pageToken = result.nextPageToken
      nextSyncToken = result.nextSyncToken
    } catch (e) {
      if ((e as Error).name === 'SyncTokenExpired') {
        // sync token 만료 → 토큰 초기화 후 풀 동기화 재시도
        await supabase
          .from('google_calendar_subscriptions')
          .update({ sync_token: null })
          .eq('id', sub.id)
        useSyncToken = undefined
        pageToken = undefined
        continue
      }
      throw e
    }
  } while (pageToken)

  // 이벤트 적용
  let upsertErrors = 0
  for (const item of allItems) {
    if (item.status === 'cancelled') {
      // 삭제 또는 취소 → DB에서 제거
      await supabase
        .from('events')
        .delete()
        .eq('family_id', sub.family_id)
        .eq('google_calendar_id', sub.google_calendar_id)
        .eq('google_event_id', item.id)
      continue
    }

    const eventDate = extractDate(item.start)
    if (!eventDate) continue // 날짜 없는 이벤트는 스킵

    const eventEndDate = extractEndDate(item.end, item.start)

    const { error } = await supabase
      .from('events')
      .upsert(
        {
          family_id: sub.family_id,
          title: item.summary || '(제목 없음)',
          description: item.description || null,
          event_date: eventDate,
          event_end_date: eventEndDate,
          estimated_cost: 0,
          actual_cost: 0,
          person_type: connection.default_person_type,
          is_recurring: !!item.recurringEventId,
          source: 'google',
          google_event_id: item.id,
          google_calendar_id: sub.google_calendar_id,
        },
        { onConflict: 'family_id,google_calendar_id,google_event_id' },
      )
    if (error) {
      upsertErrors += 1
      if (upsertErrors <= 3) {
        console.error('[google-sync] upsert error:', error.message, {
          title: item.summary,
          eventDate,
          googleEventId: item.id,
        })
      }
    }
  }
  if (upsertErrors > 0) {
    throw new Error(`upsert 실패 ${upsertErrors}건 (콘솔 로그 확인)`)
  }

  // 마지막 sync token 저장
  if (nextSyncToken) {
    await supabase
      .from('google_calendar_subscriptions')
      .update({
        sync_token: nextSyncToken,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', sub.id)
  } else {
    await supabase
      .from('google_calendar_subscriptions')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', sub.id)
  }

  return allItems.length
}
