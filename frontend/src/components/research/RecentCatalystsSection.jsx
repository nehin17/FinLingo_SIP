const IMPACT = {
    positive: {
      className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500',
      label: 'Positive',
    },
    negative: {
      className: 'border-red-500/40 bg-red-500/10 text-red-500',
      label: 'Negative',
    },
    neutral: {
      className: 'border-border bg-[var(--surface-elevated)] text-text-muted',
      label: 'Neutral',
    },
  }
  
  function formatDate(date) {
    if (!date) return 'Date unavailable'
  
    const parsedDate = new Date(date)
  
    if (Number.isNaN(parsedDate.getTime())) {
      return 'Date unavailable'
    }
  
    return parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  
  export default function RecentCatalystsSection({
    catalysts = [],
    loading = false,
  }) {
    if (loading) {
      return (
        <section
          className="rounded-3xl border border-border p-6 shadow-sm"
          style={{ background: 'var(--surface)' }}
        >
          <div
            className="h-6 w-40 rounded animate-pulse mb-5"
            style={{ background: 'var(--surface-elevated)' }}
          />
  
          <div className="space-y-4 pl-6">
            {[0, 1, 2].map((item) => (
              <div key={item} className="relative">
                <div
                  className="h-3 w-24 rounded animate-pulse mb-2"
                  style={{ background: 'var(--surface-elevated)' }}
                />
  
                <div
                  className="h-4 w-48 rounded animate-pulse mb-2"
                  style={{ background: 'var(--surface-elevated)' }}
                />
  
                <div
                  className="h-3 w-full rounded animate-pulse"
                  style={{ background: 'var(--surface-elevated)' }}
                />
              </div>
            ))}
          </div>
        </section>
      )
    }
  
    const safeCatalysts = Array.isArray(catalysts)
      ? catalysts.filter(
          (c) => c && typeof c === 'object'
        )
      : []
  
    return (
      <section
        className="rounded-3xl border border-border p-6 shadow-sm"
        style={{ background: 'var(--surface)' }}
      >
        <h3 className="text-lg font-bold text-text-primary mb-5">
          Potential Catalysts
        </h3>
  
        <p className="text-xs text-text-muted mb-4">
          Events from company news and SEC filings · Price impact unconfirmed
        </p>

        {safeCatalysts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-text-muted">
              No significant recent events identified.
            </p>
          </div>
        ) : (
          <div className="relative pl-6">
            <div
              className="absolute left-2 top-1 bottom-1 w-px"
              style={{ background: 'var(--border)' }}
            />
  
            {safeCatalysts.map((catalyst, index) => {
              const impact =
                IMPACT[catalyst.impact] || IMPACT.neutral
  
              const type =
                typeof catalyst.type === 'string' &&
                catalyst.type.trim()
                  ? catalyst.type
                  : 'Update'
  
              const title =
                typeof catalyst.title === 'string' &&
                catalyst.title.trim()
                  ? catalyst.title
                  : 'Untitled catalyst'
  
              const description =
                typeof catalyst.description === 'string'
                  ? catalyst.description
                  : ''
  
              return (
                <div
                  key={`${catalyst.date || 'unknown'}-${title}-${index}`}
                  className="relative mb-4 last:mb-0"
                >
                  <span
                    className="absolute -left-[18px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4"
                    style={{
                      '--tw-ring-color': 'var(--surface)',
                    }}
                  />
  
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      {formatDate(catalyst.date)}
                    </span>
  
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${impact.className}`}
                    >
                      {type}
                    </span>
                  </div>
  
                  {catalyst.url ? (
                    <a href={catalyst.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-bold text-text-primary hover:text-blue-500 transition-colors">
                      {title}
                    </a>
                  ) : <p className="text-sm font-bold text-text-primary">{title}</p>}
  
                  {description && (
                    <p className="text-xs text-text-muted leading-relaxed mt-1">
                      {description}
                    </p>
                  )}
                  {catalyst.source && (
                    <p className="text-[10px] text-text-muted mt-1">
                      {catalyst.source}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    )
  }