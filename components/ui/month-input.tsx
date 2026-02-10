'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils/cn'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'

interface MonthInputProps {
  id?: string
  label?: string
  value: string // "YYYY-MM" or ""
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  clearable?: boolean
}

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

export function MonthInput({ id, label, value, onChange, required, placeholder = '선택하세요', clearable = false }: MonthInputProps) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => {
    if (value) return parseInt(value.slice(0, 4), 10)
    return new Date().getFullYear()
  })
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedYear = value ? parseInt(value.slice(0, 4), 10) : null
  const selectedMonth = value ? parseInt(value.slice(5, 7), 10) : null

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

  // Sync viewYear when value changes externally
  useEffect(() => {
    if (value) {
      setViewYear(parseInt(value.slice(0, 4), 10))
    }
  }, [value])

  function handleSelect(month: number) {
    const mm = String(month).padStart(2, '0')
    onChange(`${viewYear}-${mm}`)
    setOpen(false)
  }

  const displayText = value
    ? `${selectedYear}년 ${selectedMonth}월`
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
    </div>
  )
}
