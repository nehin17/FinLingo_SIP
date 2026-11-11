import { motion } from 'framer-motion'

const RISKS = [
  { label: 'Profitability', metric: 'Operating Margin' },
  { label: 'Cash Generation', metric: 'Operating Cash Flow Margin' },
  { label: 'Leverage Context', metric: 'Liabilities / Equity' },
  { label: 'Equity Cushion', metric: 'Equity / Assets' },
  { label: 'Valuation Context', metric: 'P/E Ratio' },
]
function Value({ company, name }) {
  const item = company?.metrics?.[name]
  return <div className="flex flex-col items-center gap-1">
    <span className="inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
      style={{ background: 'var(--surface-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
      {item?.value || 'Not available'}
    </span>
    {item?.period && <span className="text-xs text-[color:var(--text-muted)]">FY {item.period.slice(0, 4)}</span>}
  </div>
}
export default function RiskComparison({ leftCompany, rightCompany }) {
  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    className="mb-12 overflow-hidden rounded-2xl border p-8" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
    <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Key Risks</h3>
    <p className="mb-6 mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Reported ratios for further investigation · Not risk ratings.</p>
    <div className="overflow-x-auto"><table className="w-full min-w-[540px] text-sm"><thead><tr className="border-b" style={{ background: 'var(--surface-elevated)', borderColor: 'var(--border)' }}>
      <th className="px-4 py-4 text-left font-semibold text-[color:var(--text-primary)]">Risk context</th>
      <th className="px-4 py-4 text-center font-semibold text-[color:var(--text-primary)]">{leftCompany?.ticker}</th>
      <th className="px-4 py-4 text-center font-semibold text-[color:var(--text-primary)]">{rightCompany?.ticker}</th>
    </tr></thead><tbody>{RISKS.map((entry, index) => <motion.tr key={entry.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.035 }}
      className="border-b last:border-b-0 hover:bg-[var(--surface-elevated)]" style={{ borderColor: 'var(--border)' }}>
      <td className="px-4 py-5 font-medium text-[color:var(--text-primary)]">{entry.label}</td>
      <td className="px-4 py-5 text-center"><Value company={leftCompany} name={entry.metric}/></td>
      <td className="px-4 py-5 text-center"><Value company={rightCompany} name={entry.metric}/></td>
    </motion.tr>)}</tbody></table></div>
  </motion.div>
}
