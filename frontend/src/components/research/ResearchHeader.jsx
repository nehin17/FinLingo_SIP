import { motion } from 'framer-motion'
import { Activity, Star, ShieldCheck } from 'lucide-react'

export default function ResearchHeader({
  companyName = null,
  ticker = null,
  marketStatus = 'Historical market data',
  onOpenWatchlist,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8"
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          <ShieldCheck size={13} />
          Research Workspace
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
            {companyName ? companyName : 'Company Research & Financial Analysis'}
          </h1>

          {ticker && (
            <p className="text-sm font-medium text-text-secondary">
              {ticker}
            </p>
          )}

          <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
            Company fundamentals, financial statements, price history, and filings.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div
          className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-slate-300 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 shadow-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />

          <Activity size={13} className="text-slate-700 dark:text-slate-100" />

          <span className="text-xs font-semibold text-slate-800 dark:text-white">
            {marketStatus}
          </span>
        </div>

        {onOpenWatchlist && (
          <button
            type="button"
            onClick={onOpenWatchlist}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface text-sm font-semibold text-text-primary hover:bg-surface-elevated hover:border-primary/30 transition-all duration-200 shadow-sm"
          >
            <Star size={14} />
            Open Watchlist
          </button>
        )}
      </div>
    </motion.div>
  )
}