'use client'

import { useState, useMemo, useTransition, useCallback } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO,
} from 'date-fns'
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
import {
  Plus, Pencil, Trash2, CalendarDays, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import type { Event, PersonType, CreateEventInput } from '@/types'

interface CalendarClientProps {
  initialEvents: Event[]
  initialMonth: string
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function CalendarClient({ initialEvents, initialMonth }: CalendarClientProps) {
  const [y, m] = initialMonth.split('-').map(Number)
  const [currentMonth, setCurrentMonth] = useState(new Date(y, m - 1, 1))
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null)
  const [isPending, startTransition] = useTransition()

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const days: Date[] = []
    let day = calStart
    while (day <= calEnd) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [currentMonth])

  // Map events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>()
    for (const event of events) {
      const dateKey = event.event_date
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(event)
    }
    return map
  }, [events])

  const refreshEvents = useCallback((month: Date) => {
    const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
    startTransition(async () => {
      const data = await getEvents(monthStr)
      setEvents(data)
    })
  }, [])

  function handlePrevMonth() {
    const prev = subMonths(currentMonth, 1)
    setCurrentMonth(prev)
    setSelectedDate(null)
    refreshEvents(prev)
  }

  function handleNextMonth() {
    const next = addMonths(currentMonth, 1)
    setCurrentMonth(next)
    setSelectedDate(null)
    refreshEvents(next)
  }

  function handleToday() {
    const today = new Date()
    const todayMonth = startOfMonth(today)
    setCurrentMonth(todayMonth)
    setSelectedDate(today)
    refreshEvents(todayMonth)
  }

  function handleDayClick(day: Date) {
    if (selectedDate && isSameDay(selectedDate, day)) {
      setSelectedDate(null)
    } else {
      setSelectedDate(day)
    }
  }

  // Filtered events for list
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
      refreshEvents(currentMonth)
    } else {
      toast.error(result.error || '삭제에 실패했습니다')
    }
  }

  return (
    <div className="space-y-4">
      <Header
        title="캘린더"
        description="이벤트와 일정을 관리합니다"
        action={
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" /> 이벤트 추가
          </Button>
        }
      />

      {/* Calendar */}
      <Card className="p-3 sm:p-5">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-muted transition-colors active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </h2>
            <button
              onClick={handleToday}
              className="text-xs px-2 py-1 rounded-lg bg-primary-bg text-primary-dark font-medium hover:bg-primary-light/30 transition-colors"
            >
              오늘
            </button>
            {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <button
            onClick={handleNextMonth}
            className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-muted transition-colors active:scale-95"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((day, i) => (
            <div
              key={day}
              className={cn(
                'text-center text-xs font-medium py-2',
                i === 0 ? 'text-error' : i === 6 ? 'text-info' : 'text-muted-foreground'
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayEvents = eventsByDate.get(dateKey) || []
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isTodayDate = isToday(day)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const dayOfWeek = day.getDay()

            return (
              <button
                key={dateKey}
                onClick={() => handleDayClick(day)}
                className={cn(
                  'relative flex flex-col items-center p-1 sm:p-2 min-h-[3.5rem] sm:min-h-[4.5rem] bg-surface transition-all',
                  'hover:bg-primary-bg/50 active:bg-primary-bg',
                  !isCurrentMonth && 'opacity-30',
                  isSelected && 'bg-primary-bg ring-2 ring-primary ring-inset',
                )}
              >
                {/* Day number */}
                <span
                  className={cn(
                    'text-sm sm:text-base font-medium leading-none',
                    'h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-full',
                    isTodayDate && 'bg-primary text-white font-bold',
                    !isTodayDate && dayOfWeek === 0 && 'text-error',
                    !isTodayDate && dayOfWeek === 6 && 'text-info',
                    !isTodayDate && isSelected && 'text-primary-dark font-bold',
                  )}
                >
                  {format(day, 'd')}
                </span>

                {/* Event dots */}
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <span
                        key={evt.id}
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          evt.person_type === '효진' && 'bg-hyojin',
                          evt.person_type === '호영' && 'bg-hoyoung',
                          evt.person_type === '정우' && 'bg-jungwoo',
                          evt.person_type === '공통' && 'bg-common',
                        )}
                      />
                    ))}
                  </div>
                )}

                {/* Event preview text (desktop only) */}
                <div className="hidden sm:flex flex-col gap-0.5 mt-1 w-full">
                  {dayEvents.slice(0, 2).map((evt) => (
                    <span
                      key={evt.id}
                      className="text-[10px] leading-tight truncate w-full text-left px-0.5 rounded bg-secondary-bg/60 text-secondary-dark"
                    >
                      {evt.title}
                    </span>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[9px] text-muted-foreground">
                      +{dayEvents.length - 2}개
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Event List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-secondary" />
            {selectedDate
              ? format(selectedDate, 'M월 d일 (EEE)', { locale: ko })
              : '이번 달 이벤트'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-xs text-primary hover:text-primary-dark transition-colors font-medium"
              >
                전체 보기
              </button>
            )}
            <span className="text-xs text-muted-foreground">{filteredEvents.length}건</span>
          </div>
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
            <div className="space-y-2">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-xl border-2 border-border hover:border-border-hover transition-all active:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold truncate">{event.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={PERSON_BG_CLASSES[event.person_type]}>
                          {PERSON_EMOJI[event.person_type]} {event.person_type}
                        </Badge>
                        {event.is_recurring && <Badge>반복</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(event)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(event)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-error/10 hover:text-error transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(parseISO(event.event_date), 'M월 d일 (EEE)', { locale: ko })}
                    {event.event_end_date &&
                      ` ~ ${format(parseISO(event.event_end_date), 'M월 d일', { locale: ko })}`}
                  </div>
                  {(event.estimated_cost > 0 || event.actual_cost > 0) && (
                    <div className="flex gap-4 mt-2 text-xs">
                      {event.estimated_cost > 0 && (
                        <span className="text-muted-foreground">
                          예상 <span className="font-semibold text-foreground">{formatKRW(event.estimated_cost)}</span>
                        </span>
                      )}
                      {event.actual_cost > 0 && (
                        <span className="text-muted-foreground">
                          실제 <span className="font-semibold text-primary-dark">{formatKRW(event.actual_cost)}</span>
                        </span>
                      )}
                    </div>
                  )}
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{event.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Form Modal */}
      <EventFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditEvent(null) }}
        editEvent={editEvent}
        defaultDate={selectedDate}
        onSaved={async () => refreshEvents(currentMonth)}
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

// ===== Event Form Modal =====
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
  defaultDate: Date | null
  onSaved: () => Promise<void>
}) {
  const isEdit = !!editEvent
  const [pending, setPending] = useState(false)

  const getInitialForm = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (editEvent) {
      return {
        title: editEvent.title,
        description: editEvent.description || '',
        event_date: editEvent.event_date,
        event_end_date: editEvent.event_end_date || '',
        person_type: editEvent.person_type as PersonType,
        estimated_cost: editEvent.estimated_cost > 0 ? editEvent.estimated_cost.toLocaleString() : '',
        actual_cost: editEvent.actual_cost > 0 ? editEvent.actual_cost.toLocaleString() : '',
        is_recurring: editEvent.is_recurring,
      }
    }
    return {
      title: '',
      description: '',
      event_date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : today,
      event_end_date: '',
      person_type: '공통' as PersonType,
      estimated_cost: '',
      actual_cost: '',
      is_recurring: false,
    }
  }, [editEvent, defaultDate])

  const [form, setForm] = useState(getInitialForm)

  // Reset form when modal opens with new data
  const prevOpenRef = { current: false }
  if (open && !prevOpenRef.current) {
    const newForm = getInitialForm()
    if (JSON.stringify(newForm) !== JSON.stringify(form)) {
      setForm(newForm)
    }
  }
  prevOpenRef.current = open

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
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
