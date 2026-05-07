const OAUTH_AUTHORIZE = 'https://accounts.google.com/o/oauth2/v2/auth'
const OAUTH_TOKEN = 'https://oauth2.googleapis.com/token'
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} 환경변수가 설정되지 않았습니다.`)
  return v
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv('GOOGLE_CLIENT_ID'),
    redirect_uri: requireEnv('GOOGLE_REDIRECT_URI'),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `${OAUTH_AUTHORIZE}?${params.toString()}`
}

export interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
  id_token?: string
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: requireEnv('GOOGLE_CLIENT_ID'),
    client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
    redirect_uri: requireEnv('GOOGLE_REDIRECT_URI'),
    grant_type: 'authorization_code',
  })

  const res = await fetch(OAUTH_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google 토큰 교환 실패: ${text}`)
  }
  return res.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: requireEnv('GOOGLE_CLIENT_ID'),
    client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
    grant_type: 'refresh_token',
  })

  const res = await fetch(OAUTH_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google 토큰 갱신 실패: ${text}`)
  }
  return res.json()
}

export async function fetchUserEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('사용자 이메일 조회 실패')
  const data = await res.json()
  return data.email as string
}

export interface GoogleCalendarApiItem {
  id: string
  summary: string
  primary?: boolean
  backgroundColor?: string
  accessRole?: string
}

export async function listCalendars(accessToken: string): Promise<GoogleCalendarApiItem[]> {
  const res = await fetch(`${CALENDAR_API}/users/me/calendarList?minAccessRole=reader`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`캘린더 목록 조회 실패: ${await res.text()}`)
  const data = await res.json()
  return (data.items ?? []) as GoogleCalendarApiItem[]
}

export interface GoogleEventDate {
  date?: string       // all-day
  dateTime?: string   // timed
  timeZone?: string
}

export interface GoogleEvent {
  id: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  summary?: string
  description?: string
  start?: GoogleEventDate
  end?: GoogleEventDate
  recurringEventId?: string
}

export interface ListEventsResult {
  items: GoogleEvent[]
  nextPageToken?: string
  nextSyncToken?: string
}

export interface ListEventsOptions {
  pageToken?: string
  syncToken?: string
  /** 처음 동기화할 때 시간 범위 (RFC3339). syncToken과 동시 사용 불가. */
  timeMin?: string
}

export async function listEvents(
  accessToken: string,
  calendarId: string,
  options: ListEventsOptions = {},
): Promise<ListEventsResult> {
  const params = new URLSearchParams({
    singleEvents: 'true',
    showDeleted: 'true',
    maxResults: '250',
  })
  if (options.pageToken) params.set('pageToken', options.pageToken)
  if (options.syncToken) {
    params.set('syncToken', options.syncToken)
  } else if (options.timeMin) {
    params.set('timeMin', options.timeMin)
  }

  const url = `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (res.status === 410) {
    // Sync token이 만료됨 (보통 7일). 풀 동기화 다시 필요.
    const err = new Error('SYNC_TOKEN_EXPIRED')
    err.name = 'SyncTokenExpired'
    throw err
  }

  if (!res.ok) {
    throw new Error(`이벤트 조회 실패: ${await res.text()}`)
  }
  return res.json()
}

/** event.start/end 에서 DATE 형태(YYYY-MM-DD)만 추출. all-day와 timed 모두 처리. */
export function extractDate(field?: GoogleEventDate): string | null {
  if (!field) return null
  if (field.date) return field.date
  if (field.dateTime) return field.dateTime.slice(0, 10)
  return null
}

/** Google all-day end는 exclusive (다음날). DB에 저장할 땐 -1일 보정. */
export function extractEndDate(end?: GoogleEventDate, start?: GoogleEventDate): string | null {
  if (!end) return null
  // all-day 종료: exclusive → 하루 빼기
  if (end.date) {
    const d = new Date(end.date + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - 1)
    const adjusted = d.toISOString().slice(0, 10)
    // 시작일과 같으면 단일 날짜로 취급 (null 반환)
    const startDate = extractDate(start)
    if (startDate === adjusted) return null
    return adjusted
  }
  if (end.dateTime) {
    const date = end.dateTime.slice(0, 10)
    const startDate = extractDate(start)
    if (startDate === date) return null
    return date
  }
  return null
}
