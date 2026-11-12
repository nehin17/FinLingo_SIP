import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Gauge,
} from 'lucide-react'

function formatPercent(value, digits = 2) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 'â€”'
  return `${number > 0 ? '+' : ''}${number.toFixed(digits)}%`
}

export default function MarketOverviewStrip({ overview, loading = false }) {
  const sectors = overview?.sectors ?? []
  const breadth = [
    { label: 'Advancing', value: overview?.advancers ?? 0, tone: 'positive' },
    { label: 'Declining', value: overview?.decliners ?? 0, tone: 'negative' },
    { label: 'Unchanged', value: overview?.unchanged ?? 0, tone: 'neutral' },
  ]

  const asOf = overview?.asOf
    ? new Date(overview.asOf).toLocaleString()
    : null

  return (
    <section className="market-overview">
      <div className="market-index-strip">
        <div className="market-index-track">
          <article className="market-index-item">
            <div>
              <span className="market-index-symbol">FINLINGO</span>
              <strong>Tracked market snapshot</strong>
            </div>
            <div className="market-index-value">
              <span>
                {loading ? 'Loadingâ€¦' : `${overview?.trackedCompanies ?? 0} tracked`}
              </span>
              <span className="market-value-positive">
                {loading ? 'â€”' : `${overview?.pricedCompanies ?? 0} priced`}
              </span>
            </div>
          </article>
        </div>
      </div>

      <div className="market-context-grid">
        <article className="market-context-card">
          <header className="market-context-header">
            <Gauge size={16} aria-hidden="true" />
            <div>
              <h2>Market Breadth</h2>
              <p>Movement across FinLingo tracked companies</p>
            </div>
          </header>

          <div className="market-breadth-grid">
            {breadth.map((metric) => (
              <div className="market-breadth-item" key={metric.label}>
                <span>{metric.label}</span>
                <strong className={
                  metric.tone === 'positive'
                    ? 'market-value-positive'
                    : metric.tone === 'negative'
                      ? 'market-value-negative'
                      : ''
                }>
                  {loading ? 'â€”' : metric.value}
                </strong>
              </div>
            ))}
          </div>
          <p className="px-4 pb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            {loading
              ? 'Loading stored price dataâ€¦'
              : `${overview?.pricedCompanies ?? 0} of ${overview?.trackedCompanies ?? 0} companies have a stored price.`}
          </p>
        </article>

        <article className="market-context-card">
          <header className="market-context-header">
            <BarChart3 size={16} aria-hidden="true" />
            <div>
              <h2>Sector Performance</h2>
              <p>Average daily move by tracked sector</p>
            </div>
          </header>

          <div className="sector-performance-list">
            {loading ? (
              <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                Loading sector dataâ€¦
              </p>
            ) : sectors.length ? (
              sectors.map((sector) => {
                const positive = Number(sector.changePercent) >= 0
                return (
                  <div className="sector-performance-item" key={sector.name}>
                    <span>{sector.name} <small>({sector.companies})</small></span>
                    <strong className={positive ? 'market-value-positive' : 'market-value-negative'}>
                      {positive ? <ArrowUpRight size={13} aria-hidden="true" /> : <ArrowDownRight size={13} aria-hidden="true" />}
                      {formatPercent(sector.changePercent, 1)}
                    </strong>
                  </div>
                )
              })
            ) : (
              <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                No sector movement available yet.
              </p>
            )}
          </div>
        </article>
      </div>

      <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        {asOf ? `Latest stored price update: ${asOf}. ` : ''}
        Snapshot reflects saved FinLingo data, not a live exchange feed.
      </p>
    </section>
  )
}