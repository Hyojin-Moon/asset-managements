import { getEvents } from '@/lib/actions/events'
import { syncNow } from '@/lib/actions/google-calendar'
import { CalendarClient } from './calendar-client'

export default async function CalendarPage() {
  // 페이지 진입 시 구글 캘린더 동기화 (연결되지 않았으면 no-op)
  await syncNow()

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const events = await getEvents(currentMonth)

  return <CalendarClient initialEvents={events} initialMonth={currentMonth} />
}
