'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { formatMonth } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'

interface MonthPickerProps {
  currentDate: Date
  onPrev: () => void
  onNext: () => void
  onChange?: (date: Date) => void
}

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

export function MonthPicker({ currentDate, onPrev, onNext, onChange }: MonthPickerProps) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(currentDate.getFullYear())
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync viewYear when currentDate changes
  useEffect(() => {
    setViewYear(currentDate.getFullYear())
  }, [currentDate])

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

  function handleSelect(month: number) {
    const newDate = new Date(viewYear, month - 1, 1)
    onChange?.(newDate)
    setOpen(false)
  }

  const selectedYear = currentDate.getFullYear()
  const selectedMonth = currentDate.getMonth() + 1

  return (
    <div className="flex items-center gap-3 relative" ref={containerRef}>
      <button
        onClick={onPrev}
        className="h-9 w-9 rounded-xl border-2 border-border bg-surface flex items-center justify-center hover:border-primary hover:bg-primary-bg transition-all duration-200 active:scale-95"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {onChange ? (
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'text-lg font-bold text-foreground min-w-[140px] text-center',
            'flex items-center justify-center gap-2',
            'px-3 py-1.5 rounded-xl transition-all duration-200',
            'hover:bg-primary-bg hover:text-primary-dark',
            open && 'bg-primary-bg text-primary-dark'
          )}
        >
          {formatMonth(currentDate)}
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </button>
      ) : (
        <span className="text-lg font-bold text-foreground min-w-[140px] text-center">
          {formatMonth(currentDate)}
        </span>
      )}

      <button
        onClick={onNext}
        className="h-9 w-9 rounded-xl border-2 border-border bg-surface flex items-center justify-center hover:border-primary hover:bg-primary-bg transition-all duration-200 active:scale-95"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 z-50 mt-2 w-[260px] rounded-xl border-2 border-border bg-surface shadow-float p-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Year navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewYear(viewYear - 1)}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold">{viewYear}년</span>
            <button
              type="button"
              onClick={() => setViewYear(viewYear + 1)}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-4 gap-1.5">
            {MONTHS.map((name, i) => {
              const month = i + 1
              const isSelected = selectedYear === viewYear && selectedMonth === month
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => handleSelect(month)}
                  className={cn(
                    'h-9 rounded-lg text-sm font-medium transition-all duration-150',
                    isSelected
                      ? 'bg-primary text-white shadow-sm'
                      : 'hover:bg-primary-bg hover:text-primary-dark'
                  )}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
