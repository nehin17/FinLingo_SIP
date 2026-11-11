import { useId, useMemo, useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts'

// Historical DAILY closes only. An intraday (1D) chart needs a separate data source.
const RANGES = [
  { label: '1W', days: 7 },
  { label: '1M', days: 31 },
  { label: '3M', days: 92 },
  { label: '6M', days: 183 },
  { label: '1Y', days: 366 },
  { label: '5Y', days: 1827 },
]

const dateString = (ms) => new Date(ms).toLocaleDateString('en-US', {
  year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
})

export default function PriceChart({ chart = [], loading = false }) {
  const [range, setRange] = useState('1M')
  const gradientId = useId().replace(/:/g, '')

  const allData = useMemo(() => Array.isArray(chart) ? chart
    .filter((point) => Number.isFinite(point?.timestamp) && Number.isFinite(point?.price))
    .slice().sort((a, b) => a.timestamp - b.timestamp) : [], [chart])

  // Relative to the last stored trading day, NOT the current date, so stale data
  // never masquerades as fresh live prices.
  const data = useMemo(() => {
    if (!allData.length) return []
    const days = RANGES.find((r) => r.label === range)?.days ?? 31
    const cutoff = allData[allData.length - 1].timestamp - days * 86_400_000
    return allData.filter((point) => point.timestamp >= cutoff)
  }, [allData, range])

  const hasPerformance = data.length >= 2 && data[0].price > 0
  const performance = hasPerformance
    ? ((data[data.length - 1].price - data[0].price) / data[0].price) * 100
    : null
  const color = performance == null || performance >= 0 ? '#10B981' : '#EF4444'

  return (
    <section className="rounded-3xl border border-border p-6 shadow-sm"
             style={{ background: 'var(--surface)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-bold text-text-primary">Historical Price Performance</h3>
          <p className="text-xs text-text-muted mt-1">
            {allData.length ? `Daily closing prices · through ${dateString(allData[allData.length - 1].timestamp)}` : 'Price history unavailable'}
          </p>
          {hasPerformance && (
            <p className={`text-xs font-semibold mt-1 ${performance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {range} change: {performance >= 0 ? '+' : ''}{performance.toFixed(2)}%
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl border border-border overflow-x-auto"
             style={{ background: 'var(--surface-elevated)' }}>
          <span title="Intraday quotes are not currently available" className="px-3 py-1.5 text-[11px] opacity-40 cursor-not-allowed">1D</span>
          {RANGES.map((r) => (
            <button key={r.label} type="button" onClick={() => setRange(r.label)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap ${range === r.label ? 'bg-blue-600 text-white' : 'text-text-muted hover:text-text-primary'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72 w-full">
        {loading ? (
          <div className="h-full w-full rounded-xl animate-pulse" style={{ background: 'var(--surface-elevated)' }} />
        ) : data.length < 2 ? (
          <div className="h-full flex items-center justify-center rounded-2xl border border-dashed border-border text-center text-sm text-text-muted px-5">
            Insufficient price history for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="timestamp" axisLine={false} tickLine={false} minTickGap={24}
                     tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                     tickFormatter={(v) => dateString(v)} />
              <YAxis width={53} axisLine={false} tickLine={false}
                     tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                     domain={['dataMin', 'dataMax']}
                     tickFormatter={(v) => `$${Number(v).toFixed(0)}`} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}
                       labelFormatter={(v) => dateString(v)}
                       formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Closing price']} />
              <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2.3}
                    fill={`url(#${gradientId})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
