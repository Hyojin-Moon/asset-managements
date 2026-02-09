'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { ChartContainer, CustomTooltip } from './chart-container'
import { formatKRWShort } from '@/lib/utils/format'
import { CHART_COLORS } from '@/lib/utils/constants'

interface LineChartData {
  name: string
  [key: string]: string | number
}

interface AppLineChartProps {
  data: LineChartData[]
  lines: { dataKey: string; name: string; color?: string }[]
  height?: number
  labelFormatter?: (label: string) => string
}

export function AppLineChart({
  data,
  lines,
  height = 300,
  labelFormatter,
}: AppLineChartProps) {
  return (
    <ChartContainer height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => formatKRWShort(v)} tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip labelFormatter={labelFormatter} />} />
        {lines.length > 1 && <Legend />}
        {lines.map((line, i) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
