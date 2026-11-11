import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle, ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronRight,
  ClipboardCopy, ExternalLink, FileText, Lightbulb, RefreshCw, Scale, SearchCheck,
} from 'lucide-react'
import { caseStudies } from '../../data/caseStudies.js'
import { fetchCompanyResearch } from '../../services/researchService.js'
import { learningService } from '../../services/learningService.js'
import { useAuth } from '../../context/AuthContext.jsx'

const DISPLAY_METRICS = [
  'Revenue', 'Revenue growth', 'Operating margin', 'Net margin',
  'Operating cash flow margin', 'Free cash flow', 'Free cash flow margin',
  'Return on equity', 'Equity / assets',
]

const formatPercent = (value) => value == null ? '—' : `${value.toFixed(1)}%`
const formatMoney = (millions) => {
  if (millions == null || !Number.isFinite(millions)) return '—'
  const magnitude = Math.abs(millions)
  const amount = magnitude >= 1_000_000 ? `$${(magnitude / 1_000_000).toFixed(2)}T`
    : magnitude >= 1000 ? `$${(magnitude / 1000).toFixed(2)}B` : `$${magnitude.toFixed(1)}M`
  return millions < 0 ? `−${amount}` : amount
}
const dateDiff = (first, second) => Math.abs(Date.parse(`${first}T12:00:00Z`) - Date.parse(`${second}T12:00:00Z`)) / 86400000
const finite = (value) => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)
const safeSEC = (url) => typeof url === 'string' && /^https:\/\/www\.sec\.gov\//i.test(url) ? url : null

function comparablePeriods(records) {
  const periods = records.map((record) => record?.financials?.annual?.periods || [])
  if (periods.length === 1) return periods[0].length ? [periods[0][0]] : [null]
  if (periods.length !== 2) return records.map(() => null)
  const candidates = periods[0].flatMap((a) => periods[1].map((b) => ({ a, b, gap: dateDiff(a, b) })))
    .filter((entry) => Number.isFinite(entry.gap) && entry.gap <= 185)
    .sort((a, b) => Math.min(Date.parse(b.a), Date.parse(b.b)) - Math.min(Date.parse(a.a), Date.parse(a.b)) || a.gap - b.gap)
  return candidates.length ? [candidates[0].a, candidates[0].b] : [periods[0][0] || null, periods[1][0] || null]
}

function extractEvidence(research, period) {
  const annual = research?.financials?.annual
  if (!annual || !period) return { period: null, metrics: {}, hasFacts: false }
  const positions = annual.periods || []
  const idx = positions.indexOf(period)
  if (idx < 0) return { period: null, metrics: {}, hasFacts: false }
  const entries = [...(annual.income || []), ...(annual.balance || []), ...(annual.cashFlow || [])]
  const get = (name, offset = 0) => {
    const matchPeriod = positions[idx + offset]
    const item = entries.find((row) => row.label === name)?.values?.find((val) => val.period === matchPeriod)
    const value = finite(item?.value)
    return value == null ? null : { value, source: safeSEC(item.sourceUrl), period: matchPeriod }
  }
  const revenue = get('Revenue')
  const priorRevenue = get('Revenue', 1)
  const net = get('Net Income')
  const operating = get('Operating Income')
  const cash = get('Operating Cash Flow')
  const capex = get('Capital Expenditures')
  const equity = get('Shareholders Equity')
  const priorEquity = get('Shareholders Equity', 1)
  const assets = get('Total Assets')
  const same = (a, b) => a && b && a.period === b.period
  const annualGap = (a, b) => a && b && Number.isFinite(dateDiff(a.period, b.period)) && dateDiff(a.period, b.period) >= 330 && dateDiff(a.period, b.period) <= 400
  const metric = (raw, kind, sourcePoint) => raw != null && Number.isFinite(raw) ? {
    value: kind === 'money' ? formatMoney(raw) : formatPercent(raw), source: sourcePoint?.source || null,
  } : null
  const growth = revenue && priorRevenue && priorRevenue.value > 0 && annualGap(revenue, priorRevenue)
    ? (revenue.value / priorRevenue.value - 1) * 100 : null
  const margin = (part) => same(part, revenue) && revenue.value > 0 ? part.value / revenue.value * 100 : null
  const fcf = same(cash, capex) ? cash.value - Math.abs(capex.value) : null
  const avgEquity = equity && priorEquity && annualGap(equity, priorEquity) && equity.value > 0 && priorEquity.value > 0
    ? (equity.value + priorEquity.value) / 2 : null
  const roe = same(net, equity) && avgEquity ? net.value / avgEquity * 100 : null
  const equityToAssets = same(equity, assets) && assets.value > 0 ? equity.value / assets.value * 100 : null
  return {
    period,
    metrics: {
      Revenue: metric(revenue?.value, 'money', revenue),
      'Revenue growth': metric(growth, 'percent', revenue),
      'Operating margin': metric(margin(operating), 'percent', operating),
      'Net margin': metric(margin(net), 'percent', net),
      'Operating cash flow margin': metric(margin(cash), 'percent', cash),
      'Free cash flow': metric(fcf, 'money', cash),
      'Free cash flow margin': metric(same(cash, revenue) && fcf != null && revenue.value > 0 ? fcf / revenue.value * 100 : null, 'percent', cash),
      'Return on equity': metric(roe, 'percent', net),
      'Equity / assets': metric(equityToAssets, 'percent', equity),
    },
    hasFacts: Boolean(revenue || net || operating || cash),
  }
}

function SectionHeading({ number, title, subtitle }) {
  return <div className="mb-5">
    <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{number}</p>
    <h2 className="text-xl font-bold text-text-primary sm:text-2xl">{title}</h2>
    {subtitle && <p className="mt-1 text-sm leading-6 text-text-secondary">{subtitle}</p>}
  </div>
}

export default function CaseStudyDetailPage() {
  const { caseStudyId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const study = caseStudies.find((item) => item.slug === caseStudyId || item.id === caseStudyId)
  const tickers = useMemo(() => (study?.companies || []).map((company) => company.ticker), [study])
  const [data, setData] = useState({ loading: true, records: [], errors: [] })
  const [refresh, setRefresh] = useState(0)
  const [answer, setAnswer] = useState(null)
  const [checked, setChecked] = useState(false)
  const [notes, setNotes] = useState({ evidence: '', interpretation: '', risk: '', followUp: '' })
  const [copied, setCopied] = useState(false)
  const [noteStatus, setNoteStatus] = useState('idle')
  const [noteError, setNoteError] = useState('')
  const [quizStatus, setQuizStatus] = useState('idle')
  const [noteReload, setNoteReload] = useState(0)
  useEffect(() => { setAnswer(null); setChecked(false); setQuizStatus('idle') }, [caseStudyId])
  useEffect(() => {
    let active = true
    setCopied(false)
    setNoteError('')
    setNotes({ evidence: '', interpretation: '', risk: '', followUp: '' })
    if (!isAuthenticated || !caseStudyId) { setNoteStatus('guest'); return undefined }
    setNoteStatus('loading')
    learningService.getNote(`case-${caseStudyId}`).then((result) => {
      if (!active) return
      try {
        const parsed = result?.text ? JSON.parse(result.text) : {}
        setNotes({ evidence: parsed.evidence || '', interpretation: parsed.interpretation || '', risk: parsed.risk || '', followUp: parsed.followUp || '' })
        setNoteStatus('ready')
      } catch {
        setNoteStatus('error')
        setNoteError('Saved worksheet data could not be read. Copy your notes before retrying.')
      }
    }).catch(() => {
      if (!active) return
      setNoteStatus('error')
      setNoteError('Your worksheet could not be loaded. Retry after reconnecting the learning API.')
    })
    return () => { active = false }
  }, [caseStudyId, isAuthenticated, noteReload])
  const saveWorksheet = async () => {
    if (!isAuthenticated || !caseStudyId || noteStatus === 'loading' || noteStatus === 'saving') return
    setNoteError('')
    setNoteStatus('saving')
    try {
      await learningService.saveNote(`case-${caseStudyId}`, JSON.stringify(notes))
      setNoteStatus('saved')
    } catch {
      setNoteStatus('error')
      setNoteError('Worksheet could not be saved. Copy your analysis and retry after reconnecting.')
    }
  }
  const checkCaseAnswer = async () => {
    setChecked(true)
    if (!isAuthenticated || answer == null || !study) return
    setQuizStatus('saving')
    try {
      await learningService.submitChallenge(`case-${study.slug}`, answer)
      setQuizStatus('saved')
    } catch {
      setQuizStatus('error')
    }
  }
  useEffect(() => {
    if (!study) return undefined
    let active = true
    setData((prev) => ({ ...prev, loading: true, errors: [] }))
    Promise.all(tickers.map((ticker) => fetchCompanyResearch(ticker).then((result) => ({ ticker, result }))
      .catch((error) => ({ ticker, result: null, error })))).then((results) => {
      if (!active) return
      setData({ loading: false, records: results.map((item) => item.result), errors: results.filter((item) => item.error || !item.result?.financials?.annual).map((item) => item.ticker) })
    })
    return () => { active = false }
  }, [study, tickers, refresh])

  const periods = useMemo(() => comparablePeriods(data.records), [data.records])
  const evidence = useMemo(() => data.records.map((record, i) => extractEvidence(record, periods[i])), [data.records, periods])
  const hasAlignedPeriods = periods.length < 2 || Boolean(periods[0] && periods[1] && dateDiff(periods[0], periods[1]) <= 185)
  const copyNotes = useCallback(async () => {
    if (!study) return
    const content = [study.title, `Companies: ${tickers.join(' vs ')}`, ...Object.entries(notes).map(([label, value]) => `${label}: ${value || '[not completed]'}`),
      'Sources: Refer to the dated SEC links in the case study.'].join('\n\n')
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
    } catch { setCopied(false) }
  }, [notes, study, tickers])
  if (!study) return <main className="min-h-screen p-8" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
    <h1 className="mb-4 text-2xl font-bold">Case study not found</h1>
    <button type="button" className="font-semibold text-primary" onClick={() => navigate('/learn')}>Back to Learn Hub</button>
  </main>
  const relevantMetrics = study.metrics || DISPLAY_METRICS
  const copyReady = Object.values(notes).some((value) => value.trim())

  return <main className="min-h-screen px-4 py-7 sm:px-7 sm:py-10" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
    <div className="mx-auto max-w-6xl">
      <button type="button" onClick={() => navigate('/learn')} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft size={16}/> Learn Hub
      </button>
      <div className="mb-8 rounded-2xl border border-border p-5 sm:p-8" style={{ background: 'var(--surface)' }}>
        <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><BookOpen size={15}/> Research Lab · {study.difficulty} · {study.readTime} min</p>
        <h1 className="max-w-4xl text-2xl font-extrabold leading-tight text-text-primary sm:text-4xl">{study.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">{study.description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-2">{study.companies.map((company) =>
          <button key={company.ticker} type="button" onClick={() => navigate(`/dashboard?ticker=${company.ticker}`)}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-semibold text-text-primary transition-colors hover:border-primary"
            style={{ background: 'var(--surface-elevated)' }}><span className="h-2 w-2 rounded-full" style={{ background: company.color }} />{company.name}<ExternalLink size={13}/></button>)}
        </div>
        <div className="mt-7 rounded-xl border-l-4 px-5 py-4" style={{ borderColor: 'var(--primary)', background: 'var(--surface-elevated)' }}>
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">The analyst question</p>
          <p className="text-base font-semibold leading-7 text-text-primary">{study.drivingQuestion}</p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_230px]">
        <div className="min-w-0 space-y-7">
          <section id="objectives" className="rounded-2xl border border-border p-5 sm:p-7" style={{ background: 'var(--surface)' }}>
            <SectionHeading number="01 · Study brief" title="What you'll learn" subtitle="Work through the concepts before making a judgment." />
            <div className="space-y-3">{study.objectives.map((objective) => <p key={objective} className="flex items-start gap-3 text-sm leading-6 text-text-secondary"><CheckCircle2 size={17} className="mt-1 shrink-0 text-primary" />{objective}</p>)}</div>
          </section>

          <section id="concept" className="rounded-2xl border border-border p-5 sm:p-7" style={{ background: 'var(--surface)' }}>
            <SectionHeading number="02 · Understand" title="Core analytical concept" />
            <p className="text-sm leading-7 text-text-secondary">{study.framework.concept}</p>
            <div className="mt-5 rounded-xl border border-border p-4" style={{ background: 'var(--surface-elevated)' }}>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">Method / Formula</p><p className="text-sm font-semibold leading-6 text-text-primary">{study.framework.formula}</p>
            </div>
            <div className="mt-5"><h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-primary"><Lightbulb size={16} className="text-primary"/> Worked example</h3>
              <p className="text-sm leading-7 text-text-secondary">{study.framework.example}</p></div>
            <div className="mt-5 rounded-xl border border-border p-4" style={{ background: 'var(--surface-elevated)' }}>
              <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-primary"><AlertCircle size={16}/> Analyst's caution</p>
              <p className="text-sm leading-6 text-text-secondary">{study.framework.caution}</p>
            </div>
          </section>

          <section id="evidence" className="rounded-2xl border border-border p-5 sm:p-7" style={{ background: 'var(--surface)' }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <SectionHeading number="03 · Investigate" title="Reported company evidence" subtitle="Calculated from the annual SEC financial data stored in FINLINGO." />
              <button type="button" onClick={() => setRefresh((value) => value + 1)} disabled={data.loading}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-primary hover:border-primary disabled:opacity-50"><RefreshCw size={14}/> Reload</button>
            </div>
            {data.loading ? <div className="rounded-xl border border-border p-5 text-sm text-text-secondary" role="status">Loading SEC financial records…</div> : <>
              {data.errors.length > 0 && <p className="mb-4 rounded-xl border border-border p-4 text-sm text-text-secondary" style={{ background: 'var(--surface-elevated)' }}>
                {`Stored annual financials are unavailable for ${data.errors.join(', ')}. The lesson remains available; use the research links to inspect what is stored.`}</p>}
              {!hasAlignedPeriods && <p className="mb-4 rounded-xl border border-border p-4 text-sm text-text-secondary" style={{ background: 'var(--surface-elevated)' }}>Fiscal years differ by more than 185 days. Treat the figures as separate company observations, not a directly aligned comparison.</p>}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[540px] text-left text-sm">
                  <thead style={{ background: 'var(--surface-elevated)' }}><tr>
                    <th className="px-4 py-4 font-semibold text-text-primary">Annual metric</th>
                    {study.companies.map((company, i) => <th key={company.ticker} className="px-4 py-4 text-right font-semibold text-text-primary">
                      <span className="block">{company.ticker}</span><span className="block text-[11px] font-normal text-text-muted">{periods[i] ? `FY ended ${periods[i]}` : 'No annual data'}</span>
                    </th>)}
                  </tr></thead><tbody>{relevantMetrics.map((name) => <tr key={name} className="border-t border-border">
                    <th className="px-4 py-3 text-xs font-semibold text-text-secondary sm:text-sm">{name}</th>
                    {study.companies.map((company, i) => {
                      const fact = evidence[i]?.metrics?.[name]
                      return <td key={company.ticker} className="px-4 py-3 text-right"><span className="block font-semibold tabular-nums text-text-primary">{fact?.value || '—'}</span>
                        {fact?.source && <a className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline" href={fact.source} target="_blank" rel="noopener noreferrer">SEC <ExternalLink size={11}/></a>}</td>
                    })}
                  </tr>)}</tbody>
                </table>
              </div>
              <p className="mt-3 text-xs leading-5 text-text-muted">USD millions converted for display. Margins and growth are derived only when the required underlying periods are available. A dash means unavailable, not zero.</p>
            </>}
          </section>

          <section id="method" className="rounded-2xl border border-border p-5 sm:p-7" style={{ background: 'var(--surface)' }}>
            <SectionHeading number="04 · Analyze" title="Guided research method" subtitle="Use the evidence above to test the case's central question." />
            <div className="space-y-3">{study.method.map((step, i) => <div key={step.title} className="flex gap-4 rounded-xl border border-border p-4" style={{ background: i % 2 ? 'var(--surface-elevated)' : 'var(--surface)' }}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-primary" style={{ background: 'var(--surface-elevated)' }}>{String(i + 1).padStart(2, '0')}</span>
              <div><h3 className="text-sm font-semibold text-text-primary">{step.title}</h3><p className="mt-1 text-sm leading-6 text-text-secondary">{step.text}</p></div></div>)}</div>
            <div className="mt-6"><h3 className="mb-3 text-sm font-semibold text-text-primary">Questions to answer from the filings</h3>
              <div className="space-y-2">{study.researchPrompts.map((prompt) => <p key={prompt} className="flex items-start gap-2 text-sm leading-6 text-text-secondary"><ChevronRight size={16} className="mt-1 shrink-0 text-primary" />{prompt}</p>)}</div></div>
          </section>

          <section id="check" className="rounded-2xl border border-border p-5 sm:p-7" style={{ background: 'var(--surface)' }}>
            <SectionHeading number="05 · Test yourself" title="Interpretation check" subtitle="One question to check whether the main principle is clear." />
            <p className="mb-4 text-sm font-semibold leading-6 text-text-primary">{study.quiz.question}</p>
            <div className="space-y-2">{study.quiz.options.map((option, index) => {
              const isCorrect = checked && index === study.quiz.answer
              return <button key={option} type="button" disabled={checked} onClick={() => setAnswer(index)}
                className="flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm font-medium leading-6 text-text-primary transition-colors disabled:cursor-default"
                style={{ borderColor: isCorrect ? '#16A34A' : answer === index ? 'var(--primary)' : 'var(--border)', background: isCorrect || answer === index ? 'var(--surface-elevated)' : 'var(--surface)' }}>
                <span className="font-bold text-primary">{String.fromCharCode(65 + index)}</span>{option}</button>
            })}</div>
            {checked ? <div className="mt-4 rounded-xl border border-border p-4" style={{ background: 'var(--surface-elevated)' }}>
              <p className="mb-1 text-sm font-bold text-text-primary">{answer === study.quiz.answer ? 'Correct' : 'Review this idea'}</p>
              <p className="text-sm leading-6 text-text-secondary">{study.quiz.explanation}</p>
              <button type="button" onClick={() => { setAnswer(null); setChecked(false); setQuizStatus('idle') }} className="mt-3 text-sm font-semibold text-primary">Try again</button></div>
              : <button type="button" disabled={answer == null} onClick={checkCaseAnswer} className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Check answer</button>}
            {!isAuthenticated && <p className="mt-3 text-xs text-text-muted">Guest practice · Sign in to save attempts.</p>}
            {isAuthenticated && quizStatus === 'saving' && <p className="mt-3 text-xs text-text-muted">Saving attempt…</p>}
            {isAuthenticated && quizStatus === 'saved' && <p className="mt-3 text-xs font-medium text-emerald-600">Attempt saved to your account.</p>}
            {isAuthenticated && quizStatus === 'error' && <p role="alert" className="mt-3 text-xs text-amber-700">Attempt couldn't be synced. Your answer is still shown above.</p>}
          </section>

          <section id="worksheet" className="rounded-2xl border border-border p-5 sm:p-7" style={{ background: 'var(--surface)' }}>
            <SectionHeading number="06 · Produce" title="Your analyst worksheet" subtitle="Write an evidence-based conclusion. Keep facts separate from assumptions." />
            <div className="space-y-4">{[
              ['evidence', 'Reported evidence', 'Which figures and SEC sources support your analysis?'],
              ['interpretation', 'Your interpretation', 'What does the evidence suggest about the central question?'],
              ['risk', 'Counterargument / risk', 'What could make your interpretation wrong?'],
              ['followUp', 'Next verification', 'What disclosure, time period or market observation would you check next?'],
            ].map(([key, title, placeholder]) => <label key={key} className="block"><span className="mb-1.5 block text-sm font-semibold text-text-primary">{title}</span>
              <textarea rows={3} value={notes[key]} placeholder={placeholder} onChange={(event) => { setNotes((previous) => ({ ...previous, [key]: event.target.value })); setCopied(false); if (isAuthenticated) setNoteStatus('ready') }} disabled={noteStatus === 'loading'}
                className="w-full resize-y rounded-xl border border-border p-3 text-sm leading-6 text-text-primary outline-none focus:border-primary" style={{ background: 'var(--surface-elevated)' }}/></label>)}</div>
            <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" disabled={!copyReady} onClick={copyNotes}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><ClipboardCopy size={16}/>{copied ? 'Copied' : 'Copy analysis'}</button>
              {isAuthenticated && <button type="button" disabled={noteStatus === 'loading' || noteStatus === 'saving'} onClick={saveWorksheet}
                className="rounded-lg border border-border px-4 py-2.5 text-xs font-semibold text-text-primary disabled:opacity-40">{noteStatus === 'saving' ? 'Saving…' : noteStatus === 'saved' ? 'Saved to account' : 'Save worksheet'}</button>}
              {!isAuthenticated && <p className="text-xs text-text-muted">Guest draft · Copy your analysis to keep it.</p>}
              {isAuthenticated && noteStatus === 'error' && <button type="button" onClick={() => setNoteReload((n) => n + 1)} className="text-xs font-semibold text-primary">Retry loading</button>}</div>
            {noteError && <p role="alert" className="mt-3 text-xs text-red-600">{noteError}</p>}
          </section>
        </div>
        <aside className="lg:sticky lg:top-24"><div className="rounded-2xl border border-border p-5" style={{ background: 'var(--surface)' }}>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-text-primary"><SearchCheck size={17} className="text-primary"/> Study route</h2>
          <nav className="space-y-1" aria-label="Case study sections">{[
            ['objectives', 'Study brief'], ['concept', 'Understand'], ['evidence', 'SEC evidence'],
            ['method', 'Analyze'], ['check', 'Knowledge check'], ['worksheet', 'Analyst worksheet'],
          ].map(([id, label], index) => <a key={id} href={`#${id}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-text-secondary hover:bg-primary/10 hover:text-primary"><span className="text-xs font-semibold text-text-muted">{String(index + 1).padStart(2, '0')}</span>{label}</a>)}</nav>
          <div className="mt-5 border-t border-border pt-5"><h3 className="mb-3 text-sm font-semibold text-text-primary">Investigate further</h3>
            <div className="space-y-2">{tickers.length > 1 && <button type="button" onClick={() => navigate(`/battle?left=${tickers[0]}&right=${tickers[1]}`)}
              className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left text-xs font-semibold text-text-primary hover:border-primary"><span className="flex items-center gap-2"><Scale size={15}/> Compare in Battle</span><ArrowRight size={14}/></button>}
              {tickers.map((ticker) => <button type="button" key={ticker} onClick={() => navigate(`/dashboard?ticker=${ticker}`)}
                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left text-xs font-semibold text-text-primary hover:border-primary"><span className="flex items-center gap-2"><FileText size={15}/>{ticker} Research</span><ArrowRight size={14}/></button>)}</div>
          </div>
        </div></aside>
      </div>
    </div>
  </main>
}
