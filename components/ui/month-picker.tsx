'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonth } from '@/lib/utils/date'

interface MonthPickerProps {
  currentDate: Date
  onPrev: () => void
  onNext: () => void
}

export function MonthPicker({ currentDate, onPrev, onNext }: MonthPickerProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onPrev}
        className="h-9 w-9 rounded-xl border-2 border-border bg-surface flex items-center justify-center hover:border-primary hover:bg-primary-bg transition-all duration-200 active:scale-95"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-lg font-bold text-foreground min-w-[140px] text-center">
        {formatMonth(currentDate)}
      </span>
      <button
        onClick={onNext}
        className="h-9 w-9 rounded-xl border-2 border-border bg-surface flex items-center justify-center hover:border-primary hover:bg-primary-bg transition-all duration-200 active:scale-95"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
