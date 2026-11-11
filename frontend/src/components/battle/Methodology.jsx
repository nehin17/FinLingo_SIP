import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, Info } from 'lucide-react'

export default function Methodology({ rounds = 0 }) {
  const [open, setOpen] = useState(false)
  const reducedMotion = useReducedMotion()
  return (
    <section className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-5 py-4">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]"><Info size={16} className="text-primary" /> Scoring Method</span>
        <span className="flex items-center gap-2 text-xs text-[color:var(--text-muted)]">{rounds}/9 matched rounds <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} /></span>
      </button>
      <AnimatePresence initial={false}>
        {open && <motion.div initial={reducedMotion ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <p className="mt-3 border-t border-[var(--border)] pt-3 text-sm leading-relaxed text-[color:var(--text-muted)]">
            Only matching annual SEC fundamentals are scored. Each metric win earns 1 point; ties earn ½. Fiscal year-ends must be within 185 days. Missing figures and undated P/E ratios are excluded. Scores compare reported metrics, not expected returns.
          </p>
        </motion.div>}
      </AnimatePresence>
    </section>
  )
}
