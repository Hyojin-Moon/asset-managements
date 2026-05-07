'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CalendarSync, Link2, Unlink, RefreshCw, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PERSON_TYPES, PERSON_EMOJI } from '@/lib/utils/constants'
import {
  getGoogleAuthUrl,
  fetchAvailableCalendars,
  toggleSubscription,
  updateDefaultPersonType,
  disconnectGoogleCalendar,
  syncNow,
} from '@/lib/actions/google-calendar'
import type {
  GoogleCalendarConnection,
  GoogleCalendarSubscription,
  GoogleCalendarListItem,
  PersonType,
} from '@/types'

interface Props {
  connection: GoogleCalendarConnection | null
  subscriptions: GoogleCalendarSubscription[]
}

export function GoogleCalendarSection({ connection, subscriptions }: Props) {
  const [isPending, startTransition] = useTransition()
  const [calendars, setCalendars] = useState<GoogleCalendarListItem[] | null>(null)
  const [calendarsLoading, setCalendarsLoading] = useState(false)

  // URL 파라미터 처리 (콜백 결과)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('google_connected')) {
      toast.success('구글 캘린더가 연결되었습니다.')
      window.history.replaceState(null, '', window.location.pathname)
    } else if (params.get('google_error')) {
      toast.error(`연결 실패: ${params.get('google_error')}`)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // 연결되어 있고 owner인 경우만 캘린더 목록 로드
  useEffect(() => {
    if (!connection || !connection.is_owner) return
    setCalendarsLoading(true)
    fetchAvailableCalendars()
      .then((res) => {
        if ('error' in res) {
          toast.error(res.error)
        } else {
          setCalendars(res.calendars)
        }
      })
      .finally(() => setCalendarsLoading(false))
  }, [connection])

  function handleConnect() {
    startTransition(async () => {
      const res = await getGoogleAuthUrl()
      if ('error' in res) {
        toast.error(res.error)
      } else {
        window.location.href = res.url
      }
    })
  }

  function handleDisconnect() {
    if (!confirm('구글 캘린더 연결을 해제하시겠습니까? 가져온 일정도 모두 삭제됩니다.')) return
    startTransition(async () => {
      const res = await disconnectGoogleCalendar()
      if (res.success) {
        toast.success('연결이 해제되었습니다.')
        setCalendars(null)
      } else {
        toast.error(res.error || '해제 실패')
      }
    })
  }

  function handleToggle(cal: GoogleCalendarListItem, enabled: boolean) {
    startTransition(async () => {
      const res = await toggleSubscription(cal.id, cal.summary, enabled, cal.backgroundColor)
      if (res.success) {
        toast.success(enabled ? `'${cal.summary}' 구독 추가` : `'${cal.summary}' 구독 해제`)
        if (enabled) {
          // 활성화 시 즉시 동기화
          await syncNow()
        }
      } else {
        toast.error(res.error || '실패')
      }
    })
  }

  function handlePersonTypeChange(value: PersonType) {
    startTransition(async () => {
      const res = await updateDefaultPersonType(value)
      if (!res.success) toast.error(res.error || '저장 실패')
    })
  }

  function handleSync() {
    startTransition(async () => {
      const res = await syncNow()
      if (res.success) {
        toast.success(`동기화 완료 (${res.syncedCount ?? 0}건 처리)`)
      } else {
        toast.error(res.error || '동기화 실패')
      }
    })
  }

  const subscribedIds = new Set(subscriptions.map((s) => s.google_calendar_id))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarSync className="h-4 w-4 text-secondary" />
          구글 캘린더 연동
        </CardTitle>
        {connection && connection.is_owner ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleSync} disabled={isPending}>
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
              지금 동기화
            </Button>
            <Button size="sm" variant="outline" onClick={handleDisconnect} disabled={isPending}>
              <Unlink className="h-3.5 w-3.5" />
              연결 해제
            </Button>
          </div>
        ) : !connection ? (
          <Button size="sm" onClick={handleConnect} disabled={isPending}>
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
            구글 계정 연결
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {!connection ? (
          <p className="text-sm text-muted-foreground">
            구글 계정을 연결하면 선택한 캘린더의 일정을 자동으로 가져옵니다.
          </p>
        ) : !connection.is_owner ? (
          <div className="p-3 rounded-xl bg-muted/40">
            <div className="text-sm font-medium">구글 캘린더 연결됨</div>
            <p className="text-xs text-muted-foreground mt-1">
              가족 구성원이 연결한 구글 캘린더 일정이 자동으로 동기화됩니다.
              연결 해제는 연결한 본인만 가능합니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">연결된 계정</div>
                <div className="text-sm font-medium truncate">{connection.google_email}</div>
              </div>
              <div className="shrink-0">
                <label className="text-xs text-muted-foreground block mb-1">기본 인물</label>
                <Select
                  value={connection.default_person_type}
                  onChange={(e) => handlePersonTypeChange(e.target.value as PersonType)}
                  options={PERSON_TYPES.map((p) => ({
                    value: p,
                    label: `${PERSON_EMOJI[p]} ${p}`,
                  }))}
                />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">가져올 캘린더</h4>
              {calendarsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  캘린더 목록 불러오는 중...
                </div>
              ) : calendars && calendars.length > 0 ? (
                <div className="space-y-1">
                  {calendars.map((cal) => {
                    const subscribed = subscribedIds.has(cal.id)
                    return (
                      <label
                        key={cal.id}
                        className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={subscribed}
                          onChange={(e) => handleToggle(cal, e.target.checked)}
                          disabled={isPending}
                          className="h-4 w-4 rounded border-border text-primary accent-primary"
                        />
                        {cal.backgroundColor && (
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: cal.backgroundColor }}
                          />
                        )}
                        <span className="flex-1 text-sm truncate">{cal.summary}</span>
                        {cal.primary && <Badge>기본</Badge>}
                      </label>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">캘린더 목록을 불러올 수 없습니다.</p>
              )}
            </div>

            {subscriptions.length > 0 && (
              <p className="text-xs text-muted-foreground">
                캘린더 페이지를 열 때마다 자동으로 동기화됩니다.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
