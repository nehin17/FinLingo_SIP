import { motion } from 'framer-motion'

function TradeColumn({ company, other }) {
  const measured = Object.entries(company?.metrics || {}).filter(([, item]) => typeof item?.score === 'number')
  const advantage = measured.filter(([, item]) => item.score === 100).slice(0, 3)
  const attention = measured.filter(([, item]) => item.score === 0).slice(0, 3)
  const points = [
    ...advantage.map(([name, item]) => ({ name, text: `${name}: ${item.value} compared with ${other?.ticker}'s ${other?.metrics?.[name]?.value || '—'}`, good: true })),
    ...attention.map(([name, item]) => ({ name, text: `${name}: ${item.value} versus ${other?.ticker}'s ${other?.metrics?.[name]?.value || '—'}`, good: false })),
  ]
  return <div>
    <h4 className="mb-4 text-xl font-semibold" style={{ color: 'var(--text)' }}>{company?.ticker}</h4>
    {points.length ? <ul className="space-y-3 text-base">{points.map((point) => <li key={point.name} className="flex items-start gap-3">
      <span className="mt-0.5 text-lg font-bold" style={{ color: point.good ? 'var(--success)' : '#F59E0B' }}>{point.good ? '✓' : '!'}</span>
      <span style={{ color: 'var(--text-muted)' }}>{point.text}</span>
    </li>)}</ul> : <p className="text-sm text-[color:var(--text-muted)]">Insufficient comparable figures for a metric-level trade-off.</p>}
  </div>
}
export default function TradeoffSection({ leftCompany, rightCompany }) {
  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    className="mb-12 rounded-2xl border p-8" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
    <h2 className="mb-6 text-2xl font-bold" style={{ color: 'var(--text)' }}>What Each Side Does Better</h2>
    <div className="mb-8 grid gap-8 md:grid-cols-2">
      <TradeColumn company={leftCompany} other={rightCompany} />
      <TradeColumn company={rightCompany} other={leftCompany} />
    </div>
    <p className="border-t pt-5 text-sm text-[color:var(--text-muted)]" style={{ borderColor: 'var(--border)' }}>
      Reported figures only · Not a prediction of returns.
    </p>
  </motion.div>
}
