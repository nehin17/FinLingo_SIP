import { motion } from 'framer-motion'
import { Star, TrendingUp, TrendingDown, Building2 } from 'lucide-react'

function Skeleton() {
  return (
    <div
      className="rounded-3xl border border-border p-6 animate-pulse h-44"
      style={{ background: 'var(--surface)' }}
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-surface-elevated" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-48 rounded bg-surface-elevated" />
          <div className="h-3 w-32 rounded bg-surface-elevated" />
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-8 w-28 rounded bg-surface-elevated" />
          <div className="h-4 w-24 rounded bg-surface-elevated" />
        </div>

        <div className="h-10 w-28 rounded-xl bg-surface-elevated" />
      </div>
    </div>
  )
}

export default function CompanyHeroPanel({
  company,
  loading = false,
  onWatch,
  isWatched = false,
  watchBusy = false,
}) {
  if (loading) return <Skeleton />
  if (!company) return <section className="rounded-3xl border border-border p-6 text-sm text-text-muted">Choose a company to view its research profile.</section>

  const positive = (company.change ?? 0) >= 0
  const hasChange = Number.isFinite(company.change) && Number.isFinite(company.changeAmount)
  const Arrow = positive ? TrendingUp : TrendingDown

  const changeTone = positive
    ? 'text-text-secondary'
    : 'text-red-600 dark:text-red-400'

  const updatedDate = company?.status?.updated || 'Unavailable'

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-3xl border border-border p-6 shadow-sm"
      style={{ background: 'var(--surface)' }}
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-lg font-black text-white shadow-inner overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #10B981 100%)',
            }}
          >
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={`${company.name} logo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{company.ticker?.slice(0, 2)?.toUpperCase() || <Building2 size={18} />}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary leading-tight truncate">
              {company.name}
            </h2>

            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-text-muted">
              <span className="font-semibold text-text-primary">{company.ticker}</span>

              {company.exchange && (
                <>
                  <span aria-hidden="true">•</span>
                  <span>{company.exchange}</span>
                </>
              )}

              {company.sector && (
                <>
                  <span aria-hidden="true">•</span>
                  <span>{company.sector}</span>
                </>
              )}

              {company.country && (
                <>
                  <span aria-hidden="true">•</span>
                  <span>{company.country}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-3xl sm:text-4xl font-bold text-text-primary tabular-nums leading-none">
              {company.price == null ? 'Price unavailable' : `$${Number(company.price).toFixed(2)}`}
            </p>

            {hasChange && (
              <div className={`flex items-center gap-1.5 mt-2 text-sm font-semibold ${changeTone}`}>
                <Arrow size={15} />
                <span className="tabular-nums">{positive ? '+' : ''}{company.changeAmount.toFixed(2)}</span>
                <span className="tabular-nums">({positive ? '+' : ''}{company.change.toFixed(2)}%)</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap sm:justify-end">
            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-500 bg-slate-100 dark:bg-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />

                <span className="text-[11px] font-semibold text-slate-800 dark:text-white">
                  Historical close
                </span>
              </div>

              <p className="text-[11px] text-text-muted mt-1.5">
                Price as of {updatedDate}
              </p>
            </div>

            <button
              type="button"
              onClick={onWatch}
              disabled={watchBusy}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm ${
                isWatched
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-primary text-white hover:brightness-110'
              }`}
            >
              <Star size={14} className={isWatched ? 'fill-current' : ''} />
              {watchBusy ? 'Saving…' : isWatched ? 'Saved to Watchlist' : 'Add to Watchlist'}
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  )
}