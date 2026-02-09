import type { TransactionType } from '@/types'

export function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원'
}

export function formatKRWShort(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 100_000_000) {
    return (amount / 100_000_000).toFixed(1).replace(/\.0$/, '') + '억원'
  }
  if (abs >= 10_000) {
    return (amount / 10_000).toFixed(0) + '만원'
  }
  return formatKRW(amount)
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount)
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(1)}%`
}

export function formatSignedKRW(amount: number, type: TransactionType): string {
  const formatted = formatKRW(amount)
  return type === 'income' ? `+${formatted}` : `-${formatted}`
}
