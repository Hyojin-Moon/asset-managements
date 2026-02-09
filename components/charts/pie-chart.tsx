'use client'

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatKRW } from '@/lib/utils/format'
import { CHART_COLORS } from '@/lib/utils/constants'

interface PieData {
  name: string
  value: number
}

interface AppPieChartProps {
  data: PieData[]
  height?: number
  colors?: string[]
  showLabel?: boolean
}

function PieTooltipContent({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: PieData & { fill: string } }>
}) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="rounded-xl border-2 border-border bg-surface p-3 shadow-float text-sm">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: entry.payload.fill }}
        />
        <span className="text-muted-foreground">{entry.name}:</span>
        <span className="font-medium">{formatKRW(entry.value)}</span>
      </div>
    </div>
  )
}

const RADIAN = Math.PI / 180

function renderCustomLabel(props: {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  percent?: number
}) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props
  if (percent < 0.05) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function AppPieChart({
  data,
  height = 300,
  colors = CHART_COLORS,
  showLabel = true,
}: AppPieChartProps) {
  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          label={showLabel ? renderCustomLabel : false}
          labelLine={false}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<PieTooltipContent />} />
        <Legend
          formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
