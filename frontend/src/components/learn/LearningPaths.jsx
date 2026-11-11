import { ArrowRight, ListChecks } from 'lucide-react'
import LearningPathCard from './LearningPathCard.jsx'
import { LEARNING_PATHS, LESSONS } from '../../data/learningCurriculum.js'

const PHASE_OUTCOMES = {
  'financial-statements': 'Read the three statements and trace where reported numbers come from.',
  'cash-flow-mastery': 'Test whether earnings turn into sustainable cash generation.',
  'moats-competitive-advantage': 'Evaluate competitive advantage using evidence, not brand recognition alone.',
  'valuation-fundamentals': 'Compare valuations with consistent assumptions and fiscal periods.',
}

export default function LearningPaths({ progress, onOpenPath }) {
  const completed = new Set(progress?.completedLessonIds || [])
  const nextPath = LESSONS.find((lesson) => !completed.has(lesson.id))?.pathId || null
  return <section className="mb-14 scroll-mt-24" id="learning-paths">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Your Study Roadmap</h2>
        <p className="mt-1 text-sm text-text-secondary">Follow these four stages in order, or open any lesson to study independently.</p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-semibold text-text-secondary"><ListChecks size={15} /> 31 lessons · 4 stages</span>
    </div>
    <div className="mb-5 grid gap-2 rounded-2xl border border-border p-4 sm:grid-cols-4" style={{ background: 'var(--surface)' }}>
      {['Learn the concept', 'Work the numbers', 'Answer from memory', 'Check a real filing'].map((stage, index) => <div key={stage} className="flex items-center gap-2 text-xs text-text-secondary">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">{index + 1}</span>
        <span className="font-medium">{stage}</span>{index < 3 && <ArrowRight size={13} className="ml-auto hidden text-text-muted sm:block" />}
      </div>)}
    </div>
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {LEARNING_PATHS.map((path, index) => <LearningPathCard key={path.id}
        path={{ ...path, lessons: path.topics.length, phase: index + 1, outcome: PHASE_OUTCOMES[path.id] }}
        pathProgress={progress?.pathProgress?.[path.id]}
        recommended={nextPath === path.id || (!progress && index === 0)}
        onOpen={() => onOpenPath(path.id)} />)}
    </div>
  </section>
}
