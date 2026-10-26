import { ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts'
import { naira } from '../lib/format'

export const CHART_COLORS = {
  brand: 'var(--color-brand-500)',
  brandSoft: 'var(--color-brand-300)',
  accent: 'var(--color-accent-500)',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  sky: '#0ea5e9',
  grid: 'var(--sfp-line)',
  axis: 'var(--sfp-muted)',
}

const axisProps = { stroke: CHART_COLORS.axis, fontSize: 12, tickLine: false, axisLine: false }

function TooltipBox({ active, payload, label, money = true }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-lift">
      {label && <p className="mb-1 font-semibold">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: p.color || p.payload?.fill }} aria-hidden />
          <span className="text-muted">{p.name}:</span>
          <span className="font-semibold num">{money ? naira(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

export function AreaTrend({ data, dataKey = 'amount', xKey = 'day', height = 260, name = 'Collected' }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.brand} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS.brand} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} interval="preserveStartEnd" minTickGap={24} />
        <YAxis {...axisProps} width={56} tickFormatter={(v) => naira(v, { compact: true })} />
        <Tooltip content={<TooltipBox />} />
        <Area isAnimationActive={false} type="monotone" dataKey={dataKey} name={name} stroke={CHART_COLORS.brand} strokeWidth={2.5} fill="url(#areaFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function Donut({ data, height = 220, money = true, center }) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie isAnimationActive={false} data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2} stroke="none">
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<TooltipBox money={money} />} />
        </PieChart>
      </ResponsiveContainer>
      {center && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
    </div>
  )
}

export function DonutLegend({ data, money = true }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <ul className="space-y-2 text-sm">
      {data.map((d) => (
        <li key={d.name} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="size-3 rounded-sm" style={{ background: d.color }} aria-hidden />
            {d.name}
          </span>
          <span className="text-muted num">
            {money ? naira(d.value, { compact: true }) : d.value} · {total ? Math.round((d.value / total) * 100) : 0}%
          </span>
        </li>
      ))}
    </ul>
  )
}

export function Bars({ data, xKey, bars, height = 280, layout = 'horizontal', money = true }) {
  const vertical = layout === 'vertical'
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={vertical} horizontal={!vertical} />
        {vertical ? (
          <>
            <XAxis type="number" {...axisProps} tickFormatter={(v) => (money ? naira(v, { compact: true }) : v)} />
            <YAxis type="category" dataKey={xKey} {...axisProps} width={96} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} width={56} tickFormatter={(v) => (money ? naira(v, { compact: true }) : v)} />
          </>
        )}
        <Tooltip content={<TooltipBox money={money} />} cursor={{ fill: 'var(--sfp-subtle)' }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        {bars.map((b) => (
          <Bar isAnimationActive={false} key={b.key} dataKey={b.key} name={b.name} fill={b.color} radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} stackId={b.stack} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function Sparkline({ data, dataKey = 'v', color = CHART_COLORS.brand, height = 40 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line isAnimationActive={false} type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
