/** Company profile: the separate financial report owns all financial tables. */
const HTTP_URL = /^https:\/\//i

function completeSentences(raw) {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return ''
  const stops = [...text.matchAll(/[.!?](?=\s|$)/g)]
  const last = stops[stops.length - 1]
  return last && last.index >= 80 && last.index < text.length - 1
    ? text.slice(0, last.index + 1).trim() : text
}

function FactCard({ label, value }) {
  return (
    <div className="rounded-xl border border-border px-4 py-4 min-w-0"
      style={{ background: 'var(--surface-elevated)' }}>
      <p className="text-[10px] uppercase font-semibold tracking-[0.13em] text-text-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold text-text-primary break-words leading-5">{value || 'Not available'}</p>
    </div>
  )
}

export default function BusinessOverviewSection({ business = null, company = null, loading = false }) {
  const info = business || {}
  const entity = company || {}
  const companyName = entity.name || 'Company'
  const summary = completeSentences(info.summary)

  if (loading) {
    return (
      <section className="rounded-3xl border border-border p-6 shadow-sm animate-pulse"
        style={{ background: 'var(--surface)' }} aria-busy="true">
        <div className="h-6 w-64 rounded bg-black/5 dark:bg-white/10 mb-5" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 rounded-xl bg-black/5 dark:bg-white/10" />)}
        </div>
        <div className="h-40 rounded-xl bg-black/5 dark:bg-white/10" />
      </section>
    )
  }

  const facts = [
    { label: 'Founded', value: info.founded ? String(info.founded) : null },
    { label: 'Headquarters', value: info.headquarters },
    { label: 'Sector', value: info.industry || entity.sector },
    { label: 'Financial data', value: info.reporting || 'Unavailable' },
  ]

  return (
    <section className="rounded-3xl border border-border p-5 sm:p-6 shadow-sm"
      style={{ background: 'var(--surface)' }}>
      <div className="mb-5">
        <h3 className="text-xl font-semibold tracking-tight text-text-primary">
          {companyName} <span className="font-normal text-text-muted">| Business Overview</span>
        </h3>
        <p className="text-xs sm:text-sm text-text-muted mt-1">Company profile and key facts</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {facts.map((fact) => <FactCard key={fact.label} {...fact} />)}
      </div>
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-text-primary mb-2">Company Profile</h4>
        <p className="text-sm leading-7 text-text-secondary">
          {summary || 'Company profile unavailable.'}
        </p>
        {info.sourceUrl && HTTP_URL.test(info.sourceUrl) && (
          <p className="mt-3 text-xs text-text-muted leading-5">
            Source: <a className="text-blue-500 hover:underline" href={info.sourceUrl}
              target="_blank" rel="noopener noreferrer">{info.sourceName || 'View source'}</a>
            {info.sourceName === 'Wikipedia' && <> · <a className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a> · Edited extract</>}
            {info.updatedAt && <> · Retrieved {String(info.updatedAt).slice(0, 10)}</>}
          </p>
        )}
      </div>
    </section>
  )
}
