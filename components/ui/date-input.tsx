'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'

interface DateInputProps {
  id?: string
  label?: string
  value: string // "YYYY-MM-DD" or ""
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  clearable?: boolean
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function DateInput({ id, label, value, onChange, required, placeholder = '선택하세요', clearable = false }: DateInputProps) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) return startOfMonth(parseISO(value))
    return startOfMonth(new Date())
  })
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Sync viewMonth when value changes externally
  useEffect(() => {
    if (value) {
      setViewMonth(startOfMonth(parseISO(value)))
    }
  }, [value])

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth)
    const monthEnd = endOfMonth(viewMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const days: Date[] = []
    let day = calStart
    while (day <= calEnd) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [viewMonth])

  const selectedDate = value ? parseISO(value) : null

  function handleSelect(day: Date) {
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const displayText = value
    ? format(parseISO(value), 'yyyy년 M월 d일', { locale: ko })
    : ''

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground/80">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          id={id}
          onClick={() => setOpen(!open)}
          className={cn(
            'h-11 w-full rounded-xl border-2 border-border bg-surface px-4 text-sm text-left',
            'transition-all duration-200 flex items-center justify-between',
            'hover:border-border-hover',
            open && 'border-primary ring-2 ring-primary/20',
            !value && 'text-muted-foreground'
          )}
        >
          <span>{displayText || placeholder}</span>
          <div className="flex items-center gap-1">
            {clearable && value && (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange('')
                }}
                className="h-5 w-5 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </span>
            )}
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border-2 border-border bg-surface shadow-float p-3 animate-in fade-in zoom-in-95 duration-150">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold">
                {format(viewMonth, 'yyyy년 M월', { locale: ko })}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((day, i) => (
                <div
                  key={day}
                  className={cn(
                    'text-center text-xs font-medium py-1',
                    i === 0 ? 'text-error' : i === 6 ? 'text-info' : 'text-muted-foreground'
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((day) => {
                const isCurrentMonth = isSameMonth(day, viewMonth)
                const isTodayDate = isToday(day)
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const dayOfWeek = day.getDay()

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleSelect(day)}
                    className={cn(
                      'h-8 w-full rounded-lg text-sm font-medium transition-all duration-150',
                      'flex items-center justify-center',
                      !isCurrentMonth && 'opacity-30',
                      isSelected
                        ? 'bg-primary text-white shadow-sm'
                        : isTodayDate
                          ? 'bg-primary-bg text-primary-dark font-bold'
                          : 'hover:bg-primary-bg hover:text-primary-dark',
                      !isSelected && !isTodayDate && dayOfWeek === 0 && 'text-error',
                      !isSelected && !isTodayDate && dayOfWeek === 6 && 'text-info',
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>

            {/* Today button */}
            <button
              type="button"
              onClick={() => {
                const today = new Date()
                setViewMonth(startOfMonth(today))
                handleSelect(today)
              }}
              className="w-full mt-2 py-1.5 text-xs font-medium text-primary hover:bg-primary-bg rounded-lg transition-colors"
            >
              오늘
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
