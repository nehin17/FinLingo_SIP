import { ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'

const STATEMENT_TABS = [
  { key: 'income', label: 'Income statement' },
  { key: 'balance', label: 'Balance sheet' },
  { key: 'cashFlow', label: 'Cash flow' },
  { key: 'revenueMix', label: 'Revenue mix' },
]
const FREQUENCIES = [
  { key: 'annual', label: 'Annual' },
  { key: 'quarterly', label: 'Quarterly' },
]

const formatMillions = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  const n = Number(value)
  const valueText = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.abs(n) < 10 ? 2 : 0,
  })
  return n < 0 ? `(${valueText})` : valueText
}

const formatHeadline = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  const n = Number(value)
  const magnitude = Math.abs(n)
  if (magnitude >= 1000) return `${n < 0 ? '−' : ''}$${(magnitude / 1000).toFixed(1)}B`
  return `${n < 0 ? '−' : ''}$${magnitude.toFixed(magnitude < 10 ? 1 : 0)}M`
}

function formatPeriod(period, frequency) {
  if (!period) return '—'
  const parsed = new Date(`${period}T12:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return String(period)
  const short = parsed.toLocaleDateString('en-US', {
    month: 'short', year: '2-digit', timeZone: 'UTC',
  })
  return `${frequency === 'quarterly' ? 'Q ended' : 'FY ended'} ${short}`
}

function periodTitle(period) {
  if (!period) return 'Period unavailable'
  const parsed = new Date(`${period}T12:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return String(period)
  return parsed.toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

function normalizeStatement(financials, frequency) {
  // Support the previous statement structure while all clients move to the new API.
  if (financials?.annual || financials?.quarterly) {
    return financials[frequency] || { periods: [], income: [], balance: [], cashFlow: [] }
  }
  return frequency === 'annual'
    ? (financials || { periods: [], income: [], balance: [], cashFlow: [] })
    : { periods: [], income: [], balance: [], cashFlow: [] }
}

function ValueCard({ label, row, period, comparison, frequency }) {
  const item = row?.values?.find((value) => value.period === period)
  const lastPeriod = comparison
  const previous = row?.values?.find((value) => value.period === lastPeriod)
  const old = previous?.value
  const current = item?.value
  const growth = frequency === 'annual' && label === 'Revenue' && current != null && old > 0
    ? ((current - old) / old) * 100 : null

  return (
    <div className="min-w-0 rounded-xl border border-border px-4 py-4"
      style={{ background: 'var(--surface-elevated)' }}>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">{label}</p>
      <p className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight tabular-nums text-text-primary">
        {formatHeadline(current)}
      </p>
      <p className="mt-1 text-[11px] text-text-muted">
        {growth != null && Number.isFinite(growth)
          ? `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% vs prior fiscal year`
          : (current == null ? 'Not reported for latest period' : `Period ended ${periodTitle(period)}`)}
      </p>
    </div>
  )
}


const SEGMENT_TYPES = {
  product: 'Product categories',
  merchandise: 'Merchandise categories',
  business: 'Business segments',
  geography: 'Geographic markets',
  geographic: 'Geographic markets',
  service: 'Service lines',
}

function moneyMillions(amountUsd) {
  if (amountUsd == null || !Number.isFinite(Number(amountUsd))) return '—'
  return formatMillions(Number(amountUsd) / 1_000_000)
}

function RevenueMixReport({ revenueMix }) {
  const info = revenueMix || {}
  const segments = (Array.isArray(info.segments) ? info.segments : [])
    .filter((item) => item?.label && Number.isFinite(Number(item.valueUsd)) && Number(item.valueUsd) > 0)
    .sort((a, b) => Number(b.valueUsd) - Number(a.valueUsd))
  const total = segments.reduce((sum, segment) => sum + Number(segment.valueUsd), 0)
  const latestAnnualRevenue = Number(info.totalReportedRevenue)
  const hasAnnualRevenue = info.totalReportedRevenue != null && Number.isFinite(latestAnnualRevenue)
  const samePeriod = !!(info.revenuePeriod && info.segmentPeriod && info.revenuePeriod === info.segmentPeriod)
  const coverage = samePeriod && hasAnnualRevenue && latestAnnualRevenue > 0
    ? total / latestAnnualRevenue * 100 : null
  const source = typeof info.segmentSourceUrl === 'string' && /^https:\/\/www\.sec\.gov\//i.test(info.segmentSourceUrl)
    ? info.segmentSourceUrl : null
  const typeLabel = SEGMENT_TYPES[info.segmentBasis] || 'Reported revenue categories'

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 sm:px-5 py-4"
        style={{ background: 'var(--surface-elevated)' }}>
        <div>
          <h4 className="text-sm font-semibold text-text-primary">Revenue breakdown</h4>
          <p className="text-xs text-text-muted mt-1">{segments.length ? typeLabel : 'Annual revenue'}</p>
        </div>
        <p className="text-xs text-text-secondary">
          {segments.length ? `FY ended ${periodTitle(info.segmentPeriod)}` : (info.revenuePeriod ? `FY ended ${periodTitle(info.revenuePeriod)}` : 'Latest fiscal year')}
        </p>
      </div>

      {segments.length === 0 ? (
        <div className="px-4 sm:px-5 py-5 space-y-3">
          {hasAnnualRevenue && (
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-4">
              <p className="text-sm text-text-secondary">Consolidated annual revenue</p>
              <p className="text-lg font-semibold tabular-nums text-text-primary">{formatHeadline(latestAnnualRevenue / 1_000_000)}</p>
            </div>
          )}
          <p className="text-sm font-semibold text-text-primary">Revenue breakdown unavailable</p>
          <p className="text-xs sm:text-sm text-text-muted leading-6">
            {hasAnnualRevenue
              ? 'Consolidated revenue is available; category-level figures are not available.'
              : 'No revenue breakdown available for this period.'}
          </p>
          {info.revenueSourceUrl && /^https:\/\/www\.sec\.gov\//i.test(info.revenueSourceUrl) && (
            <a href={info.revenueSourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-blue-500 hover:underline">View SEC source <ArrowUpRight size={12} strokeWidth={2.6} aria-hidden="true" className="shrink-0" /></a>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[530px] text-sm tabular-nums">
              <thead style={{ background: 'var(--surface-elevated)' }}>
                <tr className="text-xs text-text-muted border-b border-border">
                  <th scope="col" className="px-4 sm:px-5 py-3 text-left font-semibold">{typeLabel}</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold whitespace-nowrap">Revenue (USD M)</th>
                  <th scope="col" className="px-4 sm:px-5 py-3 text-right font-semibold whitespace-nowrap">Revenue mix</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((item) => {
                  const share = total > 0 ? Number(item.valueUsd) / total * 100 : 0
                  return (
                    <tr key={item.label} className="border-b border-border/60 last:border-b-0">
                      <th scope="row" className="px-4 sm:px-5 py-3 text-left font-medium text-text-primary">{item.label}</th>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-text-secondary">{moneyMillions(item.valueUsd)}</td>
                      <td className="px-4 sm:px-5 py-3 text-right font-semibold text-text-primary whitespace-nowrap">{share.toFixed(1)}%</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border" style={{ background: 'var(--surface-elevated)' }}>
                  <th scope="row" className="px-4 sm:px-5 py-3 text-left font-semibold text-text-primary">Total reported categories</th>
                  <td className="px-4 py-3 text-right font-semibold text-text-primary">{moneyMillions(total)}</td>
                  <td className="px-4 sm:px-5 py-3 text-right font-semibold text-text-primary">100.0%</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3 border-t border-border px-4 sm:px-5 py-4">
            <p className="max-w-2xl text-xs leading-5 text-text-muted">
              Percentages use the sum of the imported categories, not automatically consolidated revenue.
              {coverage != null && coverage < 99.5 ? ` The category total represents approximately ${coverage.toFixed(1)}% of reported consolidated revenue for the same period.` : ''}
              {coverage != null && coverage > 100.5 ? ' Category total exceeds consolidated revenue; verify the reporting basis before comparing.' : ''}
              {!samePeriod ? ' Category and latest consolidated fiscal periods may differ.' : ''}
            </p>
            {source && <a href={source} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-500 hover:underline whitespace-nowrap">View SEC filing <ArrowUpRight size={12} strokeWidth={2.6} aria-hidden="true" className="shrink-0" /></a>}
          </div>
        </>
      )}
    </div>
  )
}

export default function FinancialPerformanceSection({ financials = null, revenueMix = null, ticker = null, loading = false }) {
  const [frequency, setFrequency] = useState('annual')
  const [tab, setTab] = useState('income')

  useEffect(() => {
    setFrequency('annual')
    setTab('income')
  }, [ticker])

  const statement = normalizeStatement(financials, frequency)
  const periods = Array.isArray(statement.periods) ? statement.periods : []
  const isMixTab = tab === 'revenueMix'
  const rows = !isMixTab && Array.isArray(statement[tab]) ? statement[tab] : []
  const everything = [
    ...(statement.income || []),
    ...(statement.balance || []),
    ...(statement.cashFlow || []),
  ]
  const first = (label) => everything.find((r) => r.label === label)
  const latest = periods[0]
  const source = everything.flatMap((row) => row.values || [])
    .find((value) => value.period === latest && /^https:\/\/www\.sec\.gov\//i.test(value.sourceUrl || ''))
  const sourceDate = source?.filedAt

  if (loading) {
    return (
      <section className="rounded-3xl border border-border p-6 shadow-sm animate-pulse"
        style={{ background: 'var(--surface)' }} aria-busy="true">
        <div className="h-6 w-52 rounded bg-black/5 dark:bg-white/10 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 rounded-xl bg-black/5 dark:bg-white/10" />)}
        </div>
        <div className="h-56 rounded-xl bg-black/5 dark:bg-white/10" />
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-border p-5 sm:p-6 shadow-sm"
      style={{ background: 'var(--surface)' }}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-blue-500 mb-1">SEC reported data</p>
          <h3 className="text-xl font-semibold tracking-tight text-text-primary">Financial Statements</h3>
          <p className="mt-1 text-xs sm:text-sm text-text-muted">
            Consolidated financials · USD millions
          </p>
        </div>
        {!isMixTab && <div className="flex rounded-xl border border-border p-1 gap-1" style={{ background: 'var(--surface-elevated)' }}
          aria-label="Financial reporting frequency">
          {FREQUENCIES.map((item) => (
            <button key={item.key} type="button" onClick={() => setFrequency(item.key)}
              aria-pressed={frequency === item.key}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${frequency === item.key
                ? 'bg-blue-600 text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              {item.label}
            </button>
          ))}
        </div>}
      </div>

      {periods.length === 0 && !isMixTab ? (
        <div className="rounded-xl border border-dashed border-border p-6">
          <p className="font-semibold text-sm text-text-primary">
            {frequency === 'quarterly' ? 'Quarterly statements unavailable' : 'Reported annual data unavailable'}
          </p>
          <p className="text-xs sm:text-sm text-text-muted mt-2 leading-6">
            {frequency === 'quarterly'
              ? 'No quarterly figures available. Select Annual for reported results.'
              : 'No annual figures available.'}
          </p>
        </div>
      ) : (
        <>
          {!isMixTab && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              ['Revenue', first('Revenue')],
              ['Net income', first('Net Income')],
              ['Operating cash flow', first('Operating Cash Flow')],
              ['Total assets', first('Total Assets')],
            ].map(([label, row]) => (
              <ValueCard key={label} label={label} row={row} period={latest}
                comparison={periods[1]} frequency={frequency} />
            ))}
          </div>}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="inline-flex gap-1 border-b border-border max-w-full overflow-x-auto"
              role="tablist" aria-label="Financial statement">
              {STATEMENT_TABS.map((item) => (
                <button key={item.key} type="button" role="tab" aria-selected={tab === item.key}
                  onClick={() => setTab(item.key)}
                  className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    tab === item.key ? 'border-blue-500 text-text-primary' : 'border-transparent text-text-muted hover:text-text-primary'
                  }`}>
                  {item.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-text-muted">{isMixTab ? 'Reported categories' : `${periods.length} periods · ${frequency === 'annual' ? 'Full fiscal years' : 'Standalone quarters'}`}</span>
          </div>

          {isMixTab ? <RevenueMixReport revenueMix={revenueMix} /> : <>
          <div className="rounded-xl border border-border overflow-x-auto">
            <table className="w-full min-w-[660px] text-sm tabular-nums">
              <thead style={{ background: 'var(--surface-elevated)' }}>
                <tr className="border-b border-border">
                  <th scope="col" className="text-left pl-4 pr-5 py-4 font-semibold text-text-primary sticky left-0 z-10"
                    style={{ background: 'var(--surface-elevated)' }}>Metric <span className="font-normal text-text-muted">(USD M)</span></th>
                  {periods.map((period, index) => (
                    <th scope="col" key={period} className={`px-4 py-4 text-right whitespace-nowrap font-semibold ${index === 0 ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {formatPeriod(period, frequency)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={periods.length + 1} className="text-center text-text-muted px-4 py-10">
                    No figures available for this statement.
                  </td></tr>
                ) : rows.map((row) => {
                  const highlighted = ['Revenue', 'Net Income', 'Total Assets', 'Total Liabilities', 'Operating Cash Flow'].includes(row.label)
                  return (
                    <tr key={row.label} className="border-t border-border/60 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                      <th scope="row" className={`pl-4 pr-5 py-3 text-left sticky left-0 whitespace-nowrap ${
                        highlighted ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary'
                      }`} style={{ background: 'var(--surface)' }}>{row.label}</th>
                      {periods.map((period, index) => {
                        const v = row.values?.find((item) => item.period === period)?.value
                        return <td key={period} className={`px-4 py-3 text-right whitespace-nowrap ${
                          index === 0 ? 'text-text-primary font-semibold' : 'text-text-secondary'
                        }`}>{formatMillions(v)}</td>
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3 mt-4">
            <p className="max-w-2xl text-xs text-text-muted leading-5">
              {frequency === 'quarterly'
                ? 'Quarterly results reflect three-month periods; balances are shown at period end.'
                : 'Fiscal-year periods vary by company; balances are shown at year end.'}
              {' '}— indicates unavailable data; negatives appear in parentheses.
            </p>
            <div className="text-xs text-text-muted text-right">
              {sourceDate && <p>Filed {sourceDate}</p>}
              {source && <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-500 font-medium hover:underline">View filing <ArrowUpRight size={12} strokeWidth={2.6} aria-hidden="true" className="shrink-0" /></a>}
            </div>
          </div>
          </>}
        </>
      )}
    </section>
  )
}
