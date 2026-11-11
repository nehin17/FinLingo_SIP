import { useEffect, useState } from 'react'
import { CheckCircle2, ArrowRight, RotateCcw } from 'lucide-react'
import { ANALYST_CHALLENGES } from '../../data/learningCurriculum.js'
import { learningService } from '../../services/learningService.js'

export default function MiniAnalystChallenge({ isAuthenticated = false, canSave = false, onAttemptSaved, onSignInClick }) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answer, setAnswer] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const challenge = ANALYST_CHALLENGES[index]
  useEffect(() => { if (!isAuthenticated) setSaved(false) }, [isAuthenticated])

  const submit = async () => {
    if (selected === null || saving || answer) return
    setError('')
    setSaving(true)
    setSaved(false)
    // Even if the account service is down, the learner still receives the educational explanation.
    const localResult = { correct: selected === challenge.correctIndex, correctIndex: challenge.correctIndex }
    if (canSave) {
      try {
        const verified = await learningService.submitChallenge(challenge.id, selected)
        setAnswer(verified)
        setSaved(true)
        onAttemptSaved?.()
      } catch (err) {
        setAnswer(localResult)
        setError('Your answer was checked, but could not be saved. Reconnect your session to save future attempts.')
      }
    } else {
      setAnswer(localResult)
    }
    setSaving(false)
  }
  const next = () => { setIndex((n) => (n + 1) % ANALYST_CHALLENGES.length); setSelected(null); setAnswer(null); setError(''); setSaved(false) }
  return <section className="mb-14" aria-label="Mini Analyst Challenge">
    <div className="mb-6"><h2 className="text-2xl font-bold text-text-primary">Practice & Recall</h2><p className="mt-2 text-sm text-text-secondary">Answer without looking at your notes. Use the explanation to correct your reasoning.</p></div>
    <div className="max-w-4xl rounded-2xl border border-border p-5 sm:p-8" style={{ background: 'var(--surface)' }}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-wider text-primary">Question {index + 1} / {ANALYST_CHALLENGES.length}</span>
        <span className="text-xs text-text-secondary">{saved ? 'Saved to account' : canSave ? 'Answers are saved after submission' : isAuthenticated ? 'Practice' : 'Guest practice · not saved'}</span></div>
      <h3 className="mb-5 text-lg font-semibold leading-relaxed text-text-primary">{challenge.question}</h3>
      <div className="mb-5 space-y-2">{challenge.options.map((option, optionIndex) => <button key={option} type="button" onClick={() => { if (!answer) setSelected(optionIndex) }} disabled={Boolean(answer)}
        className="flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm font-medium text-text-primary disabled:cursor-default"
        style={{ background: selected === optionIndex ? 'var(--surface-elevated)' : 'var(--surface)', borderColor: answer && optionIndex === answer.correctIndex ? '#16A34A' : selected === optionIndex ? 'var(--primary)' : 'var(--border)' }}>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-text-primary">{String.fromCharCode(65 + optionIndex)}</span>{option}
      </button>)}</div>
      {answer && <div className="mb-5 rounded-xl border border-border p-4" style={{ background: 'var(--surface-elevated)' }}><p className="mb-1 flex items-center gap-2 font-semibold text-text-primary">{answer.correct ? <CheckCircle2 size={17} className="text-emerald-500"/> : <RotateCcw size={16} className="text-primary" />} {answer.correct ? 'Correct — explain why' : 'Review the reasoning'}</p><p className="text-sm leading-relaxed text-text-secondary">{challenge.explanation}</p></div>}
      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
      {!answer ? <button type="button" onClick={submit} disabled={selected === null || saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{saving ? 'Checking…' : 'Check Answer'}</button>
        : <button type="button" onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">Next Question <ArrowRight size={16}/></button>}
      {!isAuthenticated && <p className="mt-4 text-xs text-text-secondary">Want to keep your practice history? <button type="button" onClick={onSignInClick} className="font-semibold text-primary hover:underline">Sign in</button>.</p>}

    </div>
  </section>
}
