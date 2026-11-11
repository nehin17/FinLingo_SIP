import { motion } from 'framer-motion'
import { BookMarked, Flame, Zap, Clock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'

const statIcons = [BookMarked, Flame, Zap, Clock]

export default function ProgressDashboard({ progress, loading, error, onRetry, onContinue, onReconnect }) {
  if (loading) return <div role="status" className="mb-10 rounded-2xl border border-border p-6 text-sm text-text-secondary" style={{ background: 'var(--surface)' }}>Connecting to your learning account…</div>
  if (error) return <section role="alert" className="mb-8 rounded-xl border border-border p-4 sm:p-5" style={{ background: 'var(--surface)' }}>
    <div className="flex items-start gap-3"><AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={19}/><div>
      <h2 className="font-bold text-text-primary">Progress sync needs attention</h2>
      <p className="mt-1 text-sm leading-relaxed text-text-secondary">{error.message || String(error)}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {error.kind === 'session' && <button type="button" onClick={onReconnect} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Sign in again</button>}
        <button type="button" onClick={onRetry} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-primary">Retry connection</button>
      </div>
    </div></div>
  </section>
  if (!progress) return null
  const stats = [
    ['Lessons Completed', `${progress.lessonsCompleted} / ${progress.totalLessons}`],
    ['Learning Streak', `${progress.streakDays} ${progress.streakDays === 1 ? 'day' : 'days'}`],
    ['Course Stage', progress.currentLevel],
    ['Lesson Time Left', `${progress.timeRemainingHours}h ${progress.timeRemainingMinutes}m`],
  ]
  return <section className="mb-12" aria-label="Your saved learning progress">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold text-text-primary">Your Learning Dashboard</h2>
      <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary"><CheckCircle2 size={15} className="text-emerald-600"/> Account synced</span></div>
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map(([label, value], index) => { const Icon = statIcons[index]; return <motion.div key={label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
        className="rounded-2xl border border-border p-4 sm:p-5" style={{ background: 'var(--surface)' }}><Icon size={18} className="mb-3 text-primary"/><p className="text-xl font-extrabold text-text-primary sm:text-2xl">{value}</p><p className="mt-1 text-xs text-text-secondary">{label}</p></motion.div> })}
    </div>
    <div className="rounded-2xl border border-border p-5" style={{ background: 'var(--surface)' }}>
      <div className="mb-2 flex flex-wrap justify-between gap-2"><p className="font-semibold text-text-primary">Course progress</p><p className="text-sm font-bold text-primary">{progress.overallPercent}%</p></div>
      <div className="mb-5 h-2.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-elevated)' }} role="progressbar" aria-label="Curriculum complete" aria-valuenow={progress.overallPercent} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${progress.overallPercent}%` }} transition={{ duration: 0.6 }}/></div>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-text-muted">{progress.nextLesson ? 'Recommended next lesson' : 'Course finished'}</p>
        <p className="font-semibold text-text-primary">{progress.nextLesson?.lessonName || 'All lessons complete'}</p>
        {progress.nextLesson && <p className="text-xs text-text-secondary">{progress.nextLesson.pathName}</p>}
        <p className="mt-2 text-xs text-text-muted">Practice: {progress.challengeCorrect} correct out of {progress.challengeAttempts} saved attempts</p>
      </div>{progress.nextLesson && <button type="button" onClick={onContinue} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">Continue Course <ArrowRight size={15}/></button>}</div>
    </div>
  </section>
}
