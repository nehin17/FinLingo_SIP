import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

const score = (company) => {
  const items = Object.values(company?.metrics || {}).filter((entry) => typeof entry?.score === 'number')
  return items.length ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length) : null
}
export default function FinalVerdict({ leftCompany, rightCompany }) {
  const a = score(leftCompany)
  const b = score(rightCompany)
  const rounds = Object.values(leftCompany?.metrics || {}).filter((item) => typeof item?.score === 'number').length
  const leader = a == null || b == null || a === b ? null : a > b ? leftCompany : rightCompany
  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
    className="mb-12 rounded-2xl border p-8" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
    <div className="mb-6 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl"
      style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.14), rgba(79,70,229,0.18))' }}>
      <Sparkles size={20} style={{ color: 'var(--primary)' }}/></div><div>
      <h3 className="text-2xl font-bold text-[color:var(--text-primary)]">Final Verdict</h3>
      <p className="mt-1 text-sm text-[color:var(--text-muted)]">Head-to-head result · Matched SEC fundamentals</p></div></div>
    <div className="mb-8 grid grid-cols-2 gap-4">{[[leftCompany, a], [rightCompany, b]].map(([company, total]) =>
      <div key={company?.ticker} className="rounded-xl border p-4 text-center" style={{ borderColor: 'var(--border)', borderTop: `3px solid ${company?.color}`, background: 'var(--surface-elevated)' }}>
        <p className="mb-1 text-sm font-medium text-[color:var(--text-muted)]">{company?.ticker}</p>
        <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{total ?? '—'}</p>
      </div>)}</div>
    <div className="mb-8 space-y-4 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
      {rounds ? <p><strong style={{ color: 'var(--text-primary)' }}>{leader ? `${leader.ticker} leads this matchup.` : 'This matchup is tied.'}</strong>{' '}
        Based on {rounds} matched metric{rounds === 1 ? '' : 's'}. Not an overall investment rating.</p>
        : <p><strong className="text-[color:var(--text-primary)]">No scored rounds yet.</strong> Both companies have reported data, but the eligible metrics or fiscal periods are not sufficient for a defensible head-to-head score.</p>}
      <p>Use the result as a starting point for deeper research.</p>
    </div>
    <p className="border-t border-[var(--border)] pt-4 text-xs text-[color:var(--text-muted)]">For research only · Not investment advice.</p>
  </motion.div>
}
