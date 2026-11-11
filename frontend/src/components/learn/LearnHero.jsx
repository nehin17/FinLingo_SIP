import { motion } from 'framer-motion'
import { BookOpen, ArrowRight, ShieldCheck } from 'lucide-react'

export default function LearnHero({ isAuthenticated, progress, onSignInClick, onSignUpClick, onContinue, onExplore }) {
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="mb-9 rounded-3xl border border-border p-6 sm:p-9" style={{ background: 'var(--surface)' }}>
      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-primary"><BookOpen size={15} /> FinLingo Academy</p>
      <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">{isAuthenticated ? 'Your Learning Hub' : 'Learn Hub'}</h1>
      <p className="max-w-3xl text-base leading-relaxed text-text-secondary">
        Learn how to read financial statements, assess cash flow and business quality, and build a defensible valuation. Study in a recommended order, then apply each concept to real company filings.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={isAuthenticated && progress?.nextLesson ? onContinue : onExplore}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          {isAuthenticated && progress?.nextLesson ? 'Continue Your Course' : 'Start the Study Plan'} <ArrowRight size={16} />
        </button>
        {isAuthenticated && progress?.nextLesson && <button type="button" onClick={onExplore} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-text-primary hover:border-primary">Browse All Lessons</button>}
      </div>
      {!isAuthenticated && <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <ShieldCheck size={19} className="text-primary" />
        <p className="min-w-[180px] flex-1 text-sm text-text-secondary">Every lesson is free to study. Sign in only to sync completions, practice results and your learning streak.</p>
        <button type="button" onClick={onSignInClick} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-primary hover:border-primary">Sign In</button>
        <button type="button" onClick={onSignUpClick} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Create Account</button>
      </div>}
    </motion.section>
  )
}
