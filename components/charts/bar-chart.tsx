'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { ChartContainer, CustomTooltip } from './chart-container'
import { formatKRWShort } from '@/lib/utils/format'
import { CHART_COLORS } from '@/lib/utils/constants'

interface BarChartData {
  name: string
  [key: string]: string | number
}

interface AppBarChartProps {
  data: BarChartData[]
  bars: { dataKey: string; name: string; color?: string }[]
  height?: number
  layout?: 'horizontal' | 'vertical'
  stacked?: boolean
  labelFormatter?: (label: string) => string
}

export function AppBarChart({
  data,
  bars,
  height = 300,
  layout = 'vertical',
  stacked = false,
  labelFormatter,
}: AppBarChartProps) {
  const isHorizontal = layout === 'horizontal'

  return (
    <ChartContainer height={height}>
      <BarChart
        data={data}
        layout={isHorizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        {isHorizontal ? (
          <>
            <XAxis type="number" tickFormatter={(v) => formatKRWShort(v)} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => formatKRWShort(v)} tick={{ fontSize: 12 }} />
          </>
        )}
        <Tooltip content={<CustomTooltip labelFormatter={labelFormatter} />} />
        {bars.length > 1 && <Legend />}
        {bars.map((bar, i) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={bar.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            radius={stacked ? 0 : [4, 4, 0, 0]}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}
