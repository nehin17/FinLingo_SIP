import { Star, TrendingUp, FileDown, Share2, Swords } from 'lucide-react'

export default function ResearchActionsFooter({ onWatch, onMarkets, onExport, onShare, onBattle, isWatched = false, watchBusy = false, disabled = false }) {
  const buttons = [
    { label: isWatched ? 'Remove from Watchlist' : 'Save to Watchlist', icon: Star, onClick: onWatch, busy: watchBusy },
    { label: 'Explore Markets', icon: TrendingUp, onClick: onMarkets },
    { label: 'Export PDF', icon: FileDown, onClick: onExport },
    { label: 'Share Research', icon: Share2, onClick: onShare },
    { label: 'Battle Mode', icon: Swords, onClick: onBattle },
  ]

  return (
    <section className="rounded-3xl border border-border p-4 shadow-sm" style={{ background: 'var(--surface)' }} aria-label="Research actions">
      <div className="flex flex-wrap gap-2 justify-center">
        {buttons.map((button) => {
          const Icon = button.icon
          const inactive = disabled || button.busy || typeof button.onClick !== 'function'
          return <button key={button.label} type="button" onClick={button.onClick} disabled={inactive}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-xs font-semibold transition ${inactive ? 'opacity-50 cursor-not-allowed' : 'text-text-primary hover:border-blue-500/50 hover:bg-surface-elevated'}`}
            style={{ background: 'var(--surface-elevated)' }}>
            <Icon size={14} strokeWidth={2.2} aria-hidden="true" className={isWatched && button.icon === Star ? 'text-amber-500' : 'text-blue-500'} />
            {button.busy ? 'Updating Watchlist…' : button.label}
          </button>
        })}
      </div>
    </section>
  )
}
