import { motion, useReducedMotion } from 'framer-motion'
import { Trophy } from 'lucide-react'

function StrengthCard({ company, points }) {
  const reducedMotion = useReducedMotion()
  return (
    <motion.section initial={reducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="h-full rounded-2xl border p-5 sm:p-6" style={{ background: 'var(--surface)', borderColor: `${company.color}65` }}>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ color: company.color, background: `${company.color}1c` }}><Trophy size={19} /></span>
        <div><h3 className="text-lg font-bold text-[color:var(--text-primary)]">Where {company.ticker} Wins</h3><p className="text-xs text-[color:var(--text-muted)]">Scored financial rounds</p></div>
      </div>
      <div className="space-y-3">
        {points.length ? points.map((point, index) => (
          <motion.div key={point.name} initial={reducedMotion ? false : { opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: reducedMotion ? 0 : index * 0.09 }} whileHover={reducedMotion ? undefined : { y: -2 }}
            className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-elevated)' }}>
            <div className="min-w-0"><h4 className="text-sm font-semibold text-[color:var(--text-primary)]">{point.name}</h4>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">{point.period ? `FY ${point.period.slice(0, 4)}` : 'Reported annual'}</p></div>
            <div className="text-right"><div className="whitespace-nowrap text-lg font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{point.value}</div>
              {point.sourceUrl && <a href={point.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="text-xs text-[color:var(--text-muted)] hover:text-primary hover:underline">SEC source</a>}
            </div>
          </motion.div>
        )) : <p className="rounded-xl border border-[var(--border)] px-4 py-5 text-sm text-[color:var(--text-muted)]">No round wins in this matchup.</p>}
      </div>
    </motion.section>
  )
}

export default function CompanyStrengths({ leftCompany, rightCompany }) {
  const wins = (company) => Object.entries(company?.metrics || {})
    .filter(([, metric]) => metric?.score === 100).slice(0, 4)
    .map(([name, metric]) => ({ name, value: metric.value, period: metric.period, sourceUrl: metric.sourceUrl }))
  return <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
    <StrengthCard company={leftCompany} points={wins(leftCompany)} />
    <StrengthCard company={rightCompany} points={wins(rightCompany)} />
  </div>
}
