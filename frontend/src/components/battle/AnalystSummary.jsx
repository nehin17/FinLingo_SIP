import { motion, useReducedMotion } from 'framer-motion'

export default function AnalystSummary({ leftCompany, rightCompany }) {
  const reducedMotion = useReducedMotion()
  const metricNames = Object.keys(leftCompany?.metrics || {}).filter((key) => typeof leftCompany.metrics[key]?.score === 'number')
  const leftWins = metricNames.filter((key) => leftCompany.metrics[key]?.score === 100)
  const rightWins = metricNames.filter((key) => rightCompany.metrics[key]?.score === 100)
  const scored = metricNames.length
  return (
    <motion.section initial={reducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
      <h3 className="mb-4 text-xl font-bold text-[color:var(--text-primary)]">Analyst Summary</h3>
      {scored ? <div className="grid gap-4 text-sm leading-relaxed text-[color:var(--text-secondary)] sm:grid-cols-2">
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', borderLeft: `3px solid ${leftCompany.color}`, background: 'var(--surface-elevated)' }}>
          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{leftCompany.ticker} · {leftWins.length} wins</span>
          <p className="mt-2 text-[color:var(--text-muted)]">{leftWins.length ? leftWins.slice(0, 3).join(' · ') : 'No metric leads in eligible rounds'}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', borderLeft: `3px solid ${rightCompany.color}`, background: 'var(--surface-elevated)' }}>
          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{rightCompany.ticker} · {rightWins.length} wins</span>
          <p className="mt-2 text-[color:var(--text-muted)]">{rightWins.length ? rightWins.slice(0, 3).join(' · ') : 'No metric leads in eligible rounds'}</p>
        </div>
      </div> : <p className="text-sm text-[color:var(--text-muted)]">Not enough matched annual SEC figures to score this matchup.</p>}
    </motion.section>
  )
}
