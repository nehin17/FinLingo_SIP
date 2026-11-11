import { useEffect, useMemo, useState } from 'react'
import { animate, motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { CheckCircle2, MinusCircle, Trophy } from 'lucide-react'

function AnimatedScore({ value, color }) {
  const [shown, setShown] = useState(value == null ? '—' : 0)
  const reducedMotion = useReducedMotion()
  useEffect(() => {
    if (value == null) { setShown('—'); return undefined }
    if (reducedMotion) { setShown(value); return undefined }
    const controls = animate(0, value, { duration: 0.75, ease: 'easeOut', onUpdate: (number) => setShown(Math.round(number)) })
    return () => controls.stop()
  }, [value, reducedMotion])
  return <motion.div initial={{ opacity: 0, scale: 0.87 }} animate={{ opacity: 1, scale: 1 }}
    className="mb-3 text-6xl font-bold tabular-nums md:text-7xl" style={{ color: 'var(--text-primary)' }}>{shown}</motion.div>
}

const asScore = (company) => {
  const scored = Object.values(company?.metrics || {}).filter((metric) => typeof metric?.score === 'number')
  return scored.length ? Math.round(scored.reduce((sum, metric) => sum + metric.score, 0) / scored.length) : null
}

export default function BattleScore({ leftCompany, rightCompany, roundDetails = [] }) {
  const leftScore = useMemo(() => asScore(leftCompany), [leftCompany])
  const rightScore = useMemo(() => asScore(rightCompany), [rightCompany])
  const scored = roundDetails.filter((round) => round.scored)
  const rounds = scored.length
  const winsLeft = scored.filter((round) => round.winner === 'left').length
  const winsRight = scored.filter((round) => round.winner === 'right').length
  const ties = scored.filter((round) => round.winner === 'tie').length
  const leader = leftScore == null || rightScore == null || leftScore === rightScore ? null
    : leftScore > rightScore ? leftCompany : rightCompany
  const [showBreakdown, setShowBreakdown] = useState(false)
  return (
    <div className="mb-8 rounded-2xl border p-5 sm:p-8" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[color:var(--text-primary)]">Battle Score</h2>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">Comparable SEC fundamentals · head-to-head points</p>
        </div>
        <button type="button" onClick={() => setShowBreakdown((current) => !current)}
          aria-expanded={showBreakdown} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[color:var(--text-primary)] transition-colors hover:border-primary hover:text-primary">
          {showBreakdown ? 'Hide' : 'Show'} Breakdown
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 items-center gap-7 md:grid-cols-3">
        {[[leftCompany, leftScore]].map(([company, score]) => <div key={company.ticker} className="text-center">
          <AnimatedScore value={score} color={company.color} />
          <div className="mb-3 h-3 overflow-hidden rounded-full" style={{ background: 'var(--surface-elevated)' }}>
            <motion.div key={company.ticker} initial={{ width: 0 }} animate={{ width: `${score ?? 0}%` }}
              transition={{ duration: 0.85, ease: 'easeOut' }} className="h-full rounded-full" style={{ background: company.color }}/>
          </div>
          <p className="text-lg font-semibold text-[color:var(--text-primary)]">{company.ticker}</p>
          <p className="text-xs text-[color:var(--text-muted)]">{winsLeft} round{winsLeft === 1 ? '' : 's'} won</p>
        </div>)}

        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.div key={leader?.ticker || (rounds ? 'tie' : 'limited')}
              initial={{ scale: 0.75, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <span className="mb-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold"
                style={leader ? { background: 'var(--surface-elevated)', border: `1px solid ${leader.color}80`, color: 'var(--text-primary)' }
                  : { background: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
                {leader && <Trophy size={16}/>} {leader ? `${leader.ticker} Leads` : rounds ? 'Draw' : 'No scored rounds'}
              </span>
            </motion.div>
          </AnimatePresence>
          <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--text-muted)]">{rounds}/9 rounds</p>
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">{rounds ? `${leftCompany.ticker} ${winsLeft} wins · ${ties} tied · ${rightCompany.ticker} ${winsRight} wins` : 'No eligible rounds'}</p>
        </div>

        {[[rightCompany, rightScore]].map(([company, score]) => <div key={company.ticker} className="text-center">
          <AnimatedScore value={score} color={company.color} />
          <div className="mb-3 h-3 overflow-hidden rounded-full" style={{ background: 'var(--surface-elevated)' }}>
            <motion.div key={company.ticker} initial={{ width: 0 }} animate={{ width: `${score ?? 0}%` }}
              transition={{ duration: 0.85, ease: 'easeOut' }} className="h-full rounded-full" style={{ background: company.color }}/>
          </div>
          <p className="text-lg font-semibold text-[color:var(--text-primary)]">{company.ticker}</p>
          <p className="text-xs text-[color:var(--text-muted)]">{winsRight} round{winsRight === 1 ? '' : 's'} won</p>
        </div>)}
      </div>

      <AnimatePresence initial={false}>
        {showBreakdown && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-[var(--border)]">
          <div className="space-y-2 pt-6">
            <p className="mb-3 text-sm font-semibold text-[color:var(--text-primary)]">Round-by-round results</p>
            {roundDetails.map((round) => {
              const winner = round.winner === 'left' ? leftCompany : round.winner === 'right' ? rightCompany : null
              return <div key={round.name} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--surface-elevated)] px-4 py-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  {round.scored ? <CheckCircle2 size={15} style={{ color: winner?.color || 'var(--text-muted)' }} /> : <MinusCircle size={15} className="text-[color:var(--text-muted)]" />}
                  <span className="font-medium text-[color:var(--text-primary)]">{round.name}</span>
                </div>
                <div className="text-right text-xs sm:text-sm" style={{ color: winner?.color || 'var(--text-muted)' }}>
                  {round.scored ? <>{round.left} vs {round.right} · {winner ? `${winner.ticker} wins` : 'Tie'}</>
                    : `Excluded · ${round.reason}`}
                </div>
              </div>
            })}
          </div>
        </motion.div>}
      </AnimatePresence>
    </div>
  )
}
