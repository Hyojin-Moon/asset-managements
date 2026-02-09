import { getEvents } from '@/lib/actions/events'
import { CalendarClient } from './calendar-client'

export default async function CalendarPage() {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const events = await getEvents(currentMonth)

  return <CalendarClient initialEvents={events} initialMonth={currentMonth} />
}
