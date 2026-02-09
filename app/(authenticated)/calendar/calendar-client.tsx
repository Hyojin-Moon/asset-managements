'use client'

import { useState, useEffect, useTransition } from 'react'
import { DayPicker } from 'react-day-picker'
import { ko } from 'date-fns/locale'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { getEvents, createEvent, updateEvent, deleteEvent } from '@/lib/actions/events'
import { formatKRW } from '@/lib/utils/format'
import { PERSON_TYPES, PERSON_EMOJI, PERSON_BG_CLASSES } from '@/lib/utils/constants'
import { Plus, Pencil, Trash2, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { parseISO } from 'date-fns'
import type { Event, PersonType, CreateEventInput } from '@/types'

interface CalendarClientProps {
  initialEvents: Event[]
  initialMonth: string
}

export function CalendarClient({ initialEvents, initialMonth }: CalendarClientProps) {
  const [y, m] = initialMonth.split('-').map(Number)
  const [currentMonth, setCurrentMonth] = useState(new Date(y, m - 1, 1))
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [formOpen, setFormOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null)
  const [, startTransition] = useTransition()

  // Refresh events when month changes
  useEffect(() => {
    const month = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
    startTransition(async () => {
      const data = await getEvents(month)
      setEvents(data)
    })
  }, [currentMonth])

  // Event dates for dot indicators
  const eventDates = events.map((e) => parseISO(e.event_date))

  // Filter events by selected date or show all for the month
  const filteredEvents = selectedDate
    ? events.filter((e) => {
        const eDate = parseISO(e.event_date)
        const eEnd = e.event_end_date ? parseISO(e.event_end_date) : eDate
        return selectedDate >= eDate && selectedDate <= eEnd
      })
    : events

  function handleOpenCreate() {
    setEditEvent(null)
    setFormOpen(true)
  }

  function handleOpenEdit(event: Event) {
    setEditEvent(event)
    setFormOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const result = await deleteEvent(deleteTarget.id)
    if (result.success) {
      toast.success('이벤트가 삭제되었습니다')
      setDeleteTarget(null)
      // Refresh
      const month = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
      const data = await getEvents(month)
      setEvents(data)
    } else {
      toast.error(result.error || '삭제에 실패했습니다')
    }
  }

  return (
    <div>
      <Header
        title="캘린더"
        description="이벤트와 일정을 관리합니다"
        action={
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" /> 이벤트 추가
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardContent>
            <DayPicker
              mode="single"
              locale={ko}
              selected={selectedDate}
              onSelect={(date) => setSelectedDate(date ?? undefined)}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              modifiers={{
                hasEvent: eventDates,
              }}
              modifiersClassNames={{
                hasEvent: 'rdp-day_has-event',
              }}
              className="rdp-cute mx-auto"
            />
          </CardContent>
        </Card>

        {/* Event List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate
                ? `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`
                : '이번 달 이벤트'}
            </CardTitle>
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(undefined)}
                className="text-xs text-primary hover:text-primary-dark transition-colors"
              >
                전체 보기
              </button>
            )}
          </CardHeader>
          <CardContent>
            {filteredEvents.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="h-10 w-10" />}
                title="이벤트가 없어요"
                description={selectedDate ? '이 날짜에 이벤트가 없습니다' : '이번 달 이벤트가 없습니다'}
                action={
                  <Button size="sm" onClick={handleOpenCreate}>
                    <Plus className="h-4 w-4" /> 추가하기
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-xl border-2 border-border hover:border-border-hover transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold truncate">{event.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={PERSON_BG_CLASSES[event.person_type]}>
                            {PERSON_EMOJI[event.person_type]} {event.person_type}
                          </Badge>
                          {event.is_recurring && (
                            <Badge>반복</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEdit(event)}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(event)}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-error/10 hover:text-error transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {event.event_date}
                      {event.event_end_date && ` ~ ${event.event_end_date}`}
                    </div>
                    {(event.estimated_cost > 0 || event.actual_cost > 0) && (
                      <div className="flex gap-3 mt-2 text-xs">
                        {event.estimated_cost > 0 && (
                          <span className="text-muted-foreground">
                            예상: <span className="font-medium text-foreground">{formatKRW(event.estimated_cost)}</span>
                          </span>
                        )}
                        {event.actual_cost > 0 && (
                          <span className="text-muted-foreground">
                            실제: <span className="font-medium text-primary-dark">{formatKRW(event.actual_cost)}</span>
                          </span>
                        )}
                      </div>
                    )}
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Event Form Modal */}
      <EventFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditEvent(null) }}
        editEvent={editEvent}
        defaultDate={selectedDate}
        onSaved={async () => {
          const month = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
          const data = await getEvents(month)
          setEvents(data)
        }}
      />

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="이벤트 삭제">
          <p className="text-sm text-muted-foreground mb-4">
            &quot;{deleteTarget.title}&quot; 이벤트를 삭제하시겠습니까?
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete}>
              삭제
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function EventFormModal({
  open,
  onClose,
  editEvent,
  defaultDate,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  editEvent: Event | null
  defaultDate?: Date
  onSaved: () => Promise<void>
}) {
  const isEdit = !!editEvent
  const [pending, setPending] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    title: '',
    description: '',
    event_date: today,
    event_end_date: '',
    person_type: '공통' as PersonType,
    estimated_cost: '',
    actual_cost: '',
    is_recurring: false,
  })

  useEffect(() => {
    if (editEvent) {
      setForm({
        title: editEvent.title,
        description: editEvent.description || '',
        event_date: editEvent.event_date,
        event_end_date: editEvent.event_end_date || '',
        person_type: editEvent.person_type,
        estimated_cost: editEvent.estimated_cost > 0 ? editEvent.estimated_cost.toLocaleString() : '',
        actual_cost: editEvent.actual_cost > 0 ? editEvent.actual_cost.toLocaleString() : '',
        is_recurring: editEvent.is_recurring,
      })
    } else {
      setForm({
        title: '',
        description: '',
        event_date: defaultDate ? defaultDate.toISOString().slice(0, 10) : today,
        event_end_date: '',
        person_type: '공통',
        estimated_cost: '',
        actual_cost: '',
        is_recurring: false,
      })
    }
  }, [editEvent, open, defaultDate, today])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)

    if (!form.title || !form.event_date) {
      toast.error('제목과 날짜를 입력해주세요.')
      setPending(false)
      return
    }

    const estimatedCost = parseInt(form.estimated_cost.replace(/,/g, ''), 10) || 0
    const actualCost = parseInt(form.actual_cost.replace(/,/g, ''), 10) || 0

    const payload: CreateEventInput = {
      title: form.title,
      description: form.description || undefined,
      event_date: form.event_date,
      event_end_date: form.event_end_date || undefined,
      person_type: form.person_type,
      estimated_cost: estimatedCost,
      actual_cost: actualCost,
      is_recurring: form.is_recurring,
    }

    const result = isEdit
      ? await updateEvent(editEvent!.id, payload)
      : await createEvent(payload)

    if (result.success) {
      toast.success(isEdit ? '수정되었습니다' : '추가되었습니다')
      onClose()
      await onSaved()
    } else {
      toast.error(result.error || '오류가 발생했습니다')
    }

    setPending(false)
  }

  const personOptions = PERSON_TYPES.map((p) => ({ value: p, label: `${PERSON_EMOJI[p]} ${p}` }))

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? '이벤트 수정' : '이벤트 추가'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="title"
          label="제목"
          placeholder="예: 가족 여행, 보험 만기"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="event_date"
            label="시작일"
            type="date"
            value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            required
          />
          <Input
            id="event_end_date"
            label="종료일 (선택)"
            type="date"
            value={form.event_end_date}
            onChange={(e) => setForm({ ...form, event_end_date: e.target.value })}
          />
        </div>

        <Select
          id="person_type"
          label="인물"
          options={personOptions}
          value={form.person_type}
          onChange={(e) => setForm({ ...form, person_type: e.target.value as PersonType })}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="estimated_cost"
            label="예상 비용"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={form.estimated_cost}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, '')
              setForm({ ...form, estimated_cost: raw ? Number(raw).toLocaleString() : '' })
            }}
          />
          <Input
            id="actual_cost"
            label="실제 비용"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={form.actual_cost}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, '')
              setForm({ ...form, actual_cost: raw ? Number(raw).toLocaleString() : '' })
            }}
          />
        </div>

        <Input
          id="description"
          label="설명 (선택)"
          placeholder="이벤트에 대한 메모"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_recurring}
            onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
            className="h-4 w-4 rounded border-border text-primary accent-primary"
          />
          <span className="text-sm text-foreground/80">반복 이벤트</span>
        </label>

        <div className="flex gap-3 mt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
