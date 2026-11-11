import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, BookOpen, Lightbulb, AlertCircle, ExternalLink, ClipboardCopy } from 'lucide-react'
import { getLearningPath, getLearningLesson, LESSONS } from '../../data/learningCurriculum.js'
import { learningService } from '../../services/learningService.js'

const APPLICATION = {
  'financial-statements': 'Open an annual filing. Find this concept in the reported statement or its notes, record the fiscal year and source, then explain one accounting judgment that affects it.',
  'cash-flow-mastery': 'Compare operating cash flow, net income and capex for two annual periods. Explain the major difference instead of relying on a single ratio.',
  'moats-competitive-advantage': 'Use the business overview and risk disclosures to write one piece of evidence for the claimed advantage and one reason it might not persist.',
  'valuation-fundamentals': 'Pick two similar businesses. Check that their reporting periods, earnings definitions and share-price dates are comparable before interpreting a multiple.',
}

export default function LessonWorkspace({ pathId, lessonId, progress, isAuthenticated, canSave, onBack, onOpenLesson, onToggle, saving, onSignInClick, onReconnect, error }) {
  const path = getLearningPath(pathId)
  const lesson = getLearningLesson(lessonId)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [scratchpad, setScratchpad] = useState('')
  const [copied, setCopied] = useState(false)
  const [noteStatus, setNoteStatus] = useState('idle')
  const [noteError, setNoteError] = useState('')
  const [noteReload, setNoteReload] = useState(0)
  const items = useMemo(() => LESSONS.filter((item) => item.pathId === pathId), [pathId])
  useEffect(() => { setSelectedAnswer(null); setSubmitted(false); setScratchpad(''); setCopied(false) }, [lessonId])
  useEffect(() => {
    let active = true
    setScratchpad('')
    setNoteError('')
    if (!isAuthenticated || !lessonId) { setNoteStatus('guest'); return undefined }
    setNoteStatus('loading')
    learningService.getNote(`lesson-${lessonId}`).then((result) => {
      if (!active) return
      setScratchpad(result?.text || '')
      setNoteStatus('ready')
    }).catch(() => {
      if (!active) return
      setNoteStatus('error')
      setNoteError('Unable to load saved notes. Retry the connection before writing.')
    })
    return () => { active = false }
  }, [lessonId, isAuthenticated, noteReload])
  const saveScratchpad = async () => {
    if (!isAuthenticated || !lessonId || noteStatus === 'loading' || noteStatus === 'saving') return
    const text = scratchpad
    setNoteError('')
    setNoteStatus('saving')
    try {
      await learningService.saveNote(`lesson-${lessonId}`, text)
      setNoteStatus('saved')
    } catch {
      setNoteStatus('error')
      setNoteError('Notes could not be saved. Check the account connection and retry.')
    }
  }
  if (!path) return <section className="rounded-2xl border border-border p-6 text-text-primary" style={{ background: 'var(--surface)' }}>This learning path wasn't found. <button type="button" className="ml-2 font-semibold text-primary" onClick={onBack}>Browse paths</button></section>
  const hasLesson = lesson?.pathId === pathId
  const completed = new Set(progress?.completedLessonIds || [])
  const index = hasLesson ? items.findIndex((item) => item.id === lesson.id) : -1
  const next = index >= 0 ? items[index + 1] : null
  const previous = index > 0 ? items[index - 1] : null
  const correct = submitted && selectedAnswer === lesson?.correctIndex
  const completedCount = items.filter((item) => completed.has(item.id)).length
  const copy = async () => {
    if (!scratchpad.trim()) return
    try { await navigator.clipboard.writeText(scratchpad); setCopied(true) } catch { setCopied(false) }
  }

  return <section className="mb-12">
    <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft size={17}/> All Learning Paths</button>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">{path.level} · {path.time} total lesson time</p><h1 className="text-2xl font-extrabold text-text-primary sm:text-3xl">{path.name}</h1></div>
      {canSave && <span className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-text-secondary">{completedCount} / {items.length} completed</span>}
    </div>
    {!hasLesson ? <div className="space-y-3">
      <p className="mb-4 text-sm text-text-secondary">Take each lesson in sequence. Check your understanding and apply the concept to a company before moving on.</p>
      {items.map((item, i) => <button type="button" key={item.id} onClick={() => onOpenLesson(item.id)} className="flex w-full items-center gap-4 rounded-2xl border border-border p-4 text-left transition-colors hover:border-primary sm:p-5" style={{ background: 'var(--surface)' }}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-primary" style={{ background: 'var(--surface-elevated)' }}>{String(i + 1).padStart(2, '0')}</span>
        <span className="min-w-0 flex-1"><span className="block text-base font-semibold text-text-primary">{item.title}</span><span className="block text-xs text-text-secondary">{item.minutes} min · Lesson {i + 1}</span></span>
        {completed.has(item.id) ? <CheckCircle2 size={20} className="shrink-0 text-emerald-600"/> : <ArrowRight size={18} className="shrink-0 text-primary"/>}
      </button>)}
    </div> : <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <article className="min-w-0 rounded-2xl border border-border p-5 sm:p-8" style={{ background: 'var(--surface)' }}>
        <div className="mb-5 flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-widest text-primary">Lesson {lesson.number} / {items.length} · {lesson.minutes} min</p>
          {completed.has(lesson.id) && <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><CheckCircle2 size={14}/> Completed</span>}</div>
        <h2 className="mb-4 text-2xl font-extrabold text-text-primary">{lesson.title}</h2>
        <div className="mb-7 rounded-xl border border-border p-4" style={{ background: 'var(--surface-elevated)' }}>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">Learning objective</p>
          <p className="text-sm leading-relaxed text-text-secondary">Explain {lesson.title.toLowerCase()} in your own words, apply the relevant method, and identify an important limitation when using it in equity research.</p>
        </div>
        <div className="space-y-7 text-sm leading-7 text-text-secondary sm:text-base">
          <div><h3 className="mb-2 flex items-center gap-2 font-bold text-text-primary"><BookOpen size={17} className="text-primary"/> 01 · Understand</h3><p>{lesson.explanation}</p></div>
          <div className="rounded-xl border border-border p-5" style={{ background: 'var(--surface-elevated)' }}><p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-primary">02 · Analytical method</p><p className="font-semibold text-text-primary">{lesson.formula}</p></div>
          <div><h3 className="mb-2 flex items-center gap-2 font-bold text-text-primary"><Lightbulb size={17} className="text-primary"/> 03 · Worked example</h3><p>{lesson.example}</p></div>
          <div className="rounded-xl border border-border p-4" style={{ background: 'var(--surface-elevated)' }}><h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-primary"><AlertCircle size={15}/> Analyst's caution</h3><p className="text-sm">{lesson.caution}</p></div>
        </div>

        <div className="mt-9 border-t border-border pt-7"><h3 className="mb-2 text-lg font-bold text-text-primary">04 · Recall & Practice</h3><p className="mb-4 text-sm text-text-secondary">Try this without referring to the lesson. Correct answers unlock completion; wrong answers can be retried.</p>
          <p className="mb-4 text-sm font-semibold text-text-primary">{lesson.question}</p>
          <div className="space-y-2">{lesson.options.map((option, optionIndex) => <button key={option} type="button" onClick={() => { if (!submitted) setSelectedAnswer(optionIndex) }} disabled={submitted}
            className="flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm text-text-primary transition-colors disabled:cursor-default"
            style={{ borderColor: submitted && optionIndex === lesson.correctIndex ? '#16A34A' : selectedAnswer === optionIndex ? 'var(--primary)' : 'var(--border)', background: selectedAnswer === optionIndex ? 'var(--surface-elevated)' : 'var(--surface)' }}>
            <span className="w-5 text-center font-bold text-primary">{String.fromCharCode(65 + optionIndex)}</span>{option}</button>)}</div>
          {!submitted ? <button type="button" disabled={selectedAnswer === null} onClick={() => setSubmitted(true)} className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Check Answer</button>
            : <div className="mt-4 rounded-xl border border-border p-4 text-sm" style={{ background: 'var(--surface-elevated)' }}><p className={`mb-1 font-semibold ${correct ? 'text-emerald-600' : 'text-text-primary'}`}>{correct ? 'Correct — well done' : 'Not quite — review and retry'}</p>
              <p className="text-text-secondary">Answer: {lesson.options[lesson.correctIndex]}. {lesson.caution}</p>
              {!correct && <button type="button" onClick={() => { setSubmitted(false); setSelectedAnswer(null) }} className="mt-2 text-sm font-semibold text-primary hover:underline">Try again</button>}</div>}
        </div>
        <div className="mt-9 border-t border-border pt-7">
          <h3 className="mb-2 text-lg font-bold text-text-primary">05 · Apply to a Company</h3>
          <p className="mb-3 text-sm leading-relaxed text-text-secondary">{APPLICATION[pathId]}</p>
          <Link to="/dashboard?ticker=AAPL" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">Open an example company's Research page <ExternalLink size={15}/></Link>
          <label htmlFor="lesson-scratchpad" className="mt-5 block text-sm font-semibold text-text-primary">Your working notes {!isAuthenticated && <span className="font-normal text-text-muted">(guest draft)</span>}</label>
          <textarea id="lesson-scratchpad" rows={4} value={scratchpad} disabled={noteStatus === 'loading'} onChange={(event) => { setScratchpad(event.target.value); setCopied(false); if (isAuthenticated) setNoteStatus('ready') }}
            className="mt-2 w-full resize-y rounded-xl border border-border bg-transparent p-3 text-sm text-text-primary outline-none focus:border-primary"
            placeholder="Record the figures, fiscal period, original source and your interpretation…" />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {isAuthenticated && <button type="button" onClick={saveScratchpad} disabled={noteStatus === 'loading' || noteStatus === 'saving'}
              className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-40">
              {noteStatus === 'saving' ? 'Saving…' : noteStatus === 'saved' ? 'Saved to account' : 'Save notes'}
            </button>}
            <button type="button" onClick={copy} disabled={!scratchpad.trim()} className="inline-flex items-center gap-2 text-xs font-semibold text-primary disabled:opacity-40"><ClipboardCopy size={14}/>{copied ? 'Copied to clipboard' : 'Copy notes'}</button>
            {isAuthenticated && noteStatus === 'error' && <button type="button" onClick={() => setNoteReload((n) => n + 1)} className="text-xs font-semibold text-primary">Retry loading</button>}
          </div>
          {noteError && <p role="alert" className="mt-2 text-xs text-red-600">{noteError}</p>}
        </div>
        <div className="mt-8 border-t border-border pt-6">
          {canSave ? <button type="button" disabled={saving || (!completed.has(lesson.id) && !correct)} onClick={() => onToggle(lesson.id, !completed.has(lesson.id))} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            {completed.has(lesson.id) ? <><CheckCircle2 size={17}/> Mark as Incomplete</> : <><Circle size={17}/> Mark Lesson Complete</>}</button>
            : <div className="flex flex-wrap items-center gap-3"><p className="text-sm text-text-secondary">{isAuthenticated ? 'Lesson completion will be available after progress sync is restored.' : 'Sign in to save lesson completion across devices.'}</p>
              <button type="button" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" onClick={isAuthenticated ? onReconnect : onSignInClick}>{isAuthenticated ? 'Retry account sign-in' : 'Sign In'}</button></div>}
          {canSave && !correct && !completed.has(lesson.id) && <p className="mt-2 text-xs text-text-muted">Pass the knowledge check to mark this lesson complete.</p>}
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-6 flex flex-wrap gap-3">{previous && <button type="button" onClick={() => onOpenLesson(previous.id)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-primary"><ArrowLeft size={16}/> Previous</button>}
            {next ? <button type="button" onClick={() => onOpenLesson(next.id)} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-primary">Next Lesson <ArrowRight size={16}/></button>
              : <button type="button" onClick={() => onOpenLesson(null)} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-primary">Path Overview <ArrowRight size={16}/></button>}</div>
        </div>
      </article>
      <aside className="h-fit rounded-2xl border border-border p-5" style={{ background: 'var(--surface)' }}><h3 className="mb-2 text-sm font-bold text-text-primary">Course outline</h3><p className="mb-4 text-xs text-text-muted">Work through all {items.length} lessons in order.</p>
        <div className="space-y-1">{items.map((item) => <button type="button" key={item.id} onClick={() => onOpenLesson(item.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs transition-colors hover:bg-primary/10" style={{ background: item.id === lesson.id ? 'var(--surface-elevated)' : 'transparent', color: item.id === lesson.id ? 'var(--primary)' : 'var(--text)' }}>
          {completed.has(item.id) ? <CheckCircle2 size={15} className="shrink-0 text-emerald-600"/> : <span className="w-4 text-center text-text-muted">{item.number}</span>}{item.title}</button>)}</div>
      </aside>
    </div>}
  </section>
}
