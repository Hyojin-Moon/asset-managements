'use client'

import { ResponsiveContainer } from 'recharts'
import { formatKRW } from '@/lib/utils/format'

interface ChartContainerProps {
  height?: number
  children: React.ReactNode
}

export function ChartContainer({ height = 300, children }: ChartContainerProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      {children as React.ReactElement}
    </ResponsiveContainer>
  )
}

export function CustomTooltip({
  active,
  payload,
  label,
  labelFormatter,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  labelFormatter?: (label: string) => string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border-2 border-border bg-surface p-3 shadow-float text-sm">
      <p className="font-semibold text-foreground mb-1">
        {labelFormatter ? labelFormatter(label ?? '') : label}
      </p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatKRW(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}
