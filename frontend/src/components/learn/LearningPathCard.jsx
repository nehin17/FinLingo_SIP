import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

export default function LearningPathCard({ path, pathProgress, recommended, onOpen }) {
  const hasProgress = Number.isFinite(pathProgress) && pathProgress >= 0
  return <motion.button type="button" onClick={onOpen} whileHover={{ y: -2 }}
    className="group flex w-full flex-col rounded-2xl border border-border p-6 text-left transition-colors hover:border-primary"
    style={{ background: 'var(--surface)' }}>
    <div className="mb-3 flex w-full items-start justify-between gap-3">
      <div><p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">Stage {String(path.phase).padStart(2, '0')}</p><h3 className="text-lg font-bold text-text-primary">{path.name}</h3></div>
      {recommended && <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold text-primary" style={{ background: 'var(--surface-elevated)' }}>Start here</span>}
    </div>
    <p className="mb-4 text-sm leading-relaxed text-text-secondary">{path.outcome}</p>
    <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold text-text-secondary">
      <span className="rounded-full border border-border px-3 py-1">{path.level}</span>
      <span className="rounded-full border border-border px-3 py-1">{path.lessons} lessons</span>
      <span className="rounded-full border border-border px-3 py-1">{path.time} study</span>
    </div>
    <p className="mb-4 flex-1 text-xs leading-relaxed text-text-muted">Begins with {path.topics.slice(0, 2).join(' and ')}.</p>
    {hasProgress && <div className="mb-4"><div className="mb-2 flex justify-between text-xs text-text-secondary"><span>Completed</span><span className="font-bold text-text-primary">{pathProgress}%</span></div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-elevated)' }}><div className="h-full rounded-full transition-all" style={{ width: `${pathProgress}%`, background: path.color }} /></div></div>}
    <span className="mt-auto inline-flex items-center gap-2 border-t border-border pt-4 text-sm font-semibold text-primary">Open {path.name} <ChevronRight size={16} /></span>
  </motion.button>
}
