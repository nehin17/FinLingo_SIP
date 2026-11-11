export default function InvestmentSnapshotGrid({
    snapshot = [],
    loading = false,
  }) {
    const toneClasses = {
      up: 'text-emerald-500',
      down: 'text-red-500',
      flat: 'text-text-muted',
    }
  
    // Normalize backend response safely
    const items = Array.isArray(snapshot) ? snapshot : []
  
    return (
      <section
        className="rounded-3xl border border-border p-6 shadow-sm"
        style={{ background: 'var(--surface)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              Company Metrics
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Valuation and growth indicators
            </p>
          </div>
  

        </div>
  
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border p-4 animate-pulse"
                style={{ background: 'var(--surface-elevated)' }}
              >
                <div
                  className="h-3 w-20 rounded mb-3"
                  style={{ background: 'var(--surface)' }}
                />
                <div
                  className="h-6 w-16 rounded mb-2"
                  style={{ background: 'var(--surface)' }}
                />
                <div
                  className="h-3 w-12 rounded"
                  style={{ background: 'var(--surface)' }}
                />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed border-border p-8
                       text-center text-sm text-text-muted"
          >
            No verified company metrics are available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
            {items.map((metric) => (
              <div
                key={metric.label || metric.value}
                className="rounded-2xl border border-border p-4 transition-colors hover:border-blue-500/40"
                style={{ background: 'var(--surface-elevated)' }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  {metric?.label || 'Metric'}
                </p>
  
                <p
                  className={`text-lg font-bold tabular-nums mt-1 ${
                    toneClasses[metric?.tone] || 'text-text-primary'
                  }`}
                >
                  {metric?.value || '—'}
                </p>
  
                {metric?.sub && (
                  <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                    {metric.sub}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    )
  }