import { ExternalLink, FileText } from 'lucide-react'

function formatDate(date) {
  if (!date) return ''

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return String(date)
  }

  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function NewsAndFilingsSection({
  news = [],
  filings = [],
  ticker = '',
  loading = false,
}) {
  if (loading) {
    return (
      <section
        className="rounded-3xl border border-border p-6 shadow-sm"
        style={{ background: 'var(--surface)' }}
      >
        <div
          className="h-6 w-44 rounded animate-pulse mb-5"
          style={{ background: 'var(--surface-elevated)' }}
        />

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-2">
            <div
              className="h-3 w-24 rounded animate-pulse mb-3"
              style={{ background: 'var(--surface-elevated)' }}
            />

            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-16 rounded-xl animate-pulse"
                style={{ background: 'var(--surface-elevated)' }}
              />
            ))}
          </div>

          <div className="space-y-2">
            <div
              className="h-3 w-16 rounded animate-pulse mb-3"
              style={{ background: 'var(--surface-elevated)' }}
            />

            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-14 rounded-xl animate-pulse"
                style={{ background: 'var(--surface-elevated)' }}
              />
            ))}
          </div>
        </div>
      </section>
    )
  }

  const safeNews = Array.isArray(news)
    ? news.filter((item) => item && typeof item === 'object')
    : []

  const safeFilings = Array.isArray(filings)
    ? filings.filter((item) => item && typeof item === 'object')
    : []

  return (
    <section
      className="rounded-3xl border border-border p-6 shadow-sm"
      style={{ background: 'var(--surface)' }}
    >
      <h3 className="text-lg font-bold text-text-primary mb-4">
        News &amp; Filings
      </h3>

      <div className="grid md:grid-cols-3 gap-6">
        {/* News */}
        <div className="md:col-span-2">
          <p className="text-[10px] uppercase tracking-wider font-bold text-text-muted mb-2">
            Latest {ticker || 'Company'} News
          </p>

          {safeNews.length === 0 ? (
            <div
              className="rounded-xl border border-border p-4"
              style={{ background: 'var(--surface-elevated)' }}
            >
              <p className="text-xs text-text-muted">
                No articles published in the last seven days are available.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {safeNews.map((item, index) => {
                const headline =
                  typeof item.headline === 'string' &&
                  item.headline.trim()
                    ? item.headline
                    : 'Untitled news article'

                const source =
                  typeof item.source === 'string'
                    ? item.source
                    : ''

                const date = formatDate(item.date)

                const url =
                  typeof item.url === 'string' &&
                  item.url.trim()
                    ? item.url
                    : null

                return (
                  <a
                    key={`${item.id || 'news'}-${index}`}
                    href={url || undefined}
                    target={url ? '_blank' : undefined}
                    rel={url ? 'noopener noreferrer' : undefined}
                    className={`flex items-start justify-between gap-3 rounded-xl border border-border p-3 transition ${
                      url
                        ? 'hover:border-blue-500/50 cursor-pointer'
                        : 'cursor-default'
                    }`}
                    style={{ background: 'var(--surface-elevated)' }}
                    onClick={!url ? (e) => e.preventDefault() : undefined}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary leading-snug">
                        {headline}
                      </p>

                      {(source || date) && (
                        <p className="text-[11px] text-text-muted mt-1">
                          {source}
                          {source && date ? ' · ' : ''}
                          {source.includes('GDELT') ? `Indexed ${date}` : date}
                        </p>
                      )}
                    </div>

                    {url && (
                      <ExternalLink
                        size={13}
                        className="text-text-muted mt-1 shrink-0"
                      />
                    )}
                  </a>
                )
              })}
            </div>
          )}
          {safeNews.some((n) => typeof n.source === 'string' && n.source.includes('GDELT')) && (
            <p className="mt-2 text-[10px] text-text-muted">
              News index: <a href="https://www.gdeltproject.org/" target="_blank" rel="noopener noreferrer"
                className="underline hover:text-text-primary">GDELT Project</a>
            </p>
          )}
        </div>

        {/* Filings */}
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-text-muted mb-2">
            {ticker ? `${ticker} SEC Filings` : 'SEC Filings'}
          </p>

          {safeFilings.length === 0 ? (
            <div
              className="rounded-xl border border-border p-4"
              style={{ background: 'var(--surface-elevated)' }}
            >
              <p className="text-xs text-text-muted">
                No filings available.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {safeFilings.map((item, index) => {
                const label =
                  typeof item.label === 'string' &&
                  item.label.trim()
                    ? item.label
                    : 'Filing'

                const period =
                  typeof item.period === 'string'
                    ? item.period
                    : ''

                const url =
                  typeof item.url === 'string' &&
                  item.url.trim()
                    ? item.url
                    : null

                return (
                  <a
                    key={`${item.id || label}-${index}`}
                    href={url || undefined}
                    target={url ? '_blank' : undefined}
                    rel={url ? 'noopener noreferrer' : undefined}
                    className={`flex items-center gap-3 rounded-xl border border-border p-3 transition ${
                      url
                        ? 'hover:border-blue-500/50 cursor-pointer'
                        : 'cursor-default'
                    }`}
                    style={{ background: 'var(--surface-elevated)' }}
                    onClick={!url ? (e) => e.preventDefault() : undefined}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center shrink-0">
                      <FileText
                        size={14}
                        className="text-blue-500"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">
                        {label}
                      </p>

                      {period && (
                        <p className="text-[10px] text-text-muted">
                          {period}
                        </p>
                      )}
                    </div>

                    {url && (
                      <ExternalLink
                        size={12}
                        className="text-text-muted ml-auto shrink-0"
                      />
                    )}
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}