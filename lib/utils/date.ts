import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

export function formatMonth(date: Date): string {
  return format(date, 'yyyy년 M월', { locale: ko })
}

export function formatDate(date: Date): string {
  return format(date, 'M월 d일 (EEE)', { locale: ko })
}

export function formatDateShort(date: Date): string {
  return format(date, 'MM/dd', { locale: ko })
}

export function formatFullDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatYearMonth(date: Date): string {
  return format(date, 'yyyy-MM')
}

export function getMonthRange(yearMonth: string): { start: Date; end: Date } {
  const date = parseISO(`${yearMonth}-01`)
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  }
}

export function getQuarterRange(year: number, quarter: number): { start: Date; end: Date } {
  const startMonth = (quarter - 1) * 3
  const start = new Date(year, startMonth, 1)
  const end = endOfMonth(new Date(year, startMonth + 2, 1))
  return { start, end }
}

export function getQuarter(date: Date): number {
  return Math.ceil((date.getMonth() + 1) / 3)
}

export { addMonths, subMonths, startOfMonth, endOfMonth, parseISO }
