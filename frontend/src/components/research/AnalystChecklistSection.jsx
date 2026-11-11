import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, FileText, RotateCcw } from 'lucide-react'

const CFA_COMPANY = 'https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/company-analysis-past-and-present'
const CFA_FINANCIAL = 'https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/introduction-financial-statement-analysis'
const CFA_TECHNIQUES = 'https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/financial-analysis-techniques'
const SEC_TEN_K = 'https://www.investor.gov/introduction-investing/getting-started/researching-investments/how-read-10-k'

const FRAMEWORK = [
  { id: 'business', group: 'Business model', title: 'Understand the business and competitive position',
    prompt: 'How does this company generate revenue, and what gives it a sustainable advantage?',
    help: 'Review revenue sources, customer concentration, and market positioning.',
    destination: 'finlingo-business', destinationLabel: 'Business overview', learn: CFA_COMPANY },
  { id: 'growth', group: 'Growth quality', title: 'Evaluate revenue drivers and their durability',
    prompt: 'Is growth coming from volumes, pricing, acquisitions, or a change in the business mix?',
    help: 'Compare annual trends with management commentary and segment performance.',
    destination: 'finlingo-financial', destinationLabel: 'Income statement', learn: CFA_FINANCIAL },
  { id: 'profitability', group: 'Profitability', title: 'Assess margins and operating efficiency',
    prompt: 'Are profits sustainable, and what happened to margins across reporting periods?',
    help: 'Compare gross, operating, and net margins over time.',
    destination: 'finlingo-financial', destinationLabel: 'Financial statements', learn: CFA_TECHNIQUES },
  { id: 'cash', group: 'Cash flow or capital quality', title: 'Assess cash generation and capital requirements',
    prompt: 'Can the company fund its operations, reinvestment and obligations without relying on unsustainable financing?',
    help: 'Compare operating cash flow, capital expenditure, and earnings. For banks, review capital, liquidity, and credit quality.',
    destination: 'finlingo-financial', destinationLabel: 'Cash flow / balance sheet', learn: CFA_FINANCIAL },
  { id: 'balance', group: 'Financial position', title: 'Evaluate leverage, liquidity and resilience',
    prompt: 'What could weaken the balance sheet during a downturn?',
    help: 'Review liquidity, debt obligations, and asset quality.',
    destination: 'finlingo-financial', destinationLabel: 'Balance sheet', learn: CFA_FINANCIAL },
  { id: 'valuation', group: 'Valuation', title: 'Develop a valuation case, not just a price target',
    prompt: 'What assumptions would justify the current valuation relative to history and comparable companies?',
    help: 'Document valuation assumptions, comparable companies, and downside scenarios.',
    destination: 'finlingo-price', destinationLabel: 'Historical pricing', learn: CFA_TECHNIQUES },
  { id: 'risks', group: 'Risks and disclosures', title: 'Review material risks, catalysts and evidence quality',
    prompt: 'What is the strongest argument against investing, and what could change the thesis?',
    help: 'Review material risks, management discussion, and recent disclosures.',
    destination: 'finlingo-news', destinationLabel: 'News and filings', learn: SEC_TEN_K },
  { id: 'thesis', group: 'Investment conclusion', title: 'Record the thesis and your decision criteria',
    prompt: 'Can you summarize the bull case, bear case and evidence that would change your view?',
    help: 'Summarize the investment case, principal risks, and reassessment criteria.',
    destination: 'finlingo-financial', destinationLabel: 'Financial evidence', learn: CFA_COMPANY },
]

export const REVIEW_STATUS = {
  unreviewed: 'Not reviewed',
  reviewed: 'Reviewed',
  followup: 'Needs follow-up',
}

// Show earlier saved assessments under the simpler three-status system.
function reviewStatus(status) {
  if (status === 'reviewed' || status === 'supported' || status === 'na') return 'reviewed'
  if (status === 'concern' || status === 'followup') return 'followup'
  return 'unreviewed'
}

function storageKey(ticker, owner) {
  return `finlingo_analyst_review_v1:${String(owner || 'guest')}:${String(ticker || '').toUpperCase()}`
}

export function readAnalystReview(ticker, owner = 'guest') {
  if (!ticker || typeof window === 'undefined') return { answers: {}, thesis: '' }
  try {
    const raw = localStorage.getItem(storageKey(ticker, owner))
    if (!raw) return { answers: {}, thesis: '' }
    const parsed = JSON.parse(raw)
    return {
      answers: parsed?.answers && typeof parsed.answers === 'object' ? parsed.answers : {},
      thesis: typeof parsed?.thesis === 'string' ? parsed.thesis : '',
      updatedAt: parsed?.updatedAt || null,
    }
  } catch {
    return { answers: {}, thesis: '' }
  }
}

function formatBillions(millions) {
  if (!Number.isFinite(millions)) return null
  return `$${(millions / 1000).toFixed(2)}B`
}

function annualMetric(financials, label, index = 0) {
  const annual = financials?.annual
  const period = annual?.periods?.[index]
  if (!period) return null
  const row = ['income', 'cashFlow', 'balance']
    .flatMap((key) => annual[key] || [])
    .find((item) => item.label === label)
  const entry = row?.values?.find((item) => item.period === period)
  return entry && Number.isFinite(entry.value) ? { value: entry.value, period } : null
}

export function analystEvidence(id, research) {
  const company = research?.company
  const business = research?.business
  const financials = research?.financials
  if (!company) return 'Select a company to review.'
  const ticker = company.ticker
  const last = financials?.annual?.periods?.[0]
  const revenue = annualMetric(financials, 'Revenue')
  const earlier = annualMetric(financials, 'Revenue', 1)
  const net = annualMetric(financials, 'Net Income')
  const cash = annualMetric(financials, 'Operating Cash Flow')
  const capex = annualMetric(financials, 'Capital Expenditures')
  const assets = annualMetric(financials, 'Total Assets')
  const liabilities = annualMetric(financials, 'Total Liabilities')
  const pe = (research?.snapshot || []).find((item) => item.label === 'P/E Ratio')?.value
  switch (id) {
    case 'business':
      return `${company.name || ticker} · ${business?.industry || company.sector || 'Industry not recorded'}${business?.segments?.length ? ` · ${business.segments.length} reported revenue categories (period ${business.segmentPeriod || 'not specified'})` : ' · Revenue mix unavailable'}.`
    case 'growth':
      if (!revenue) return 'Annual revenue unavailable.'
      if (earlier && earlier.value !== 0) return `${revenue.period}: ${formatBillions(revenue.value)} revenue · ${((revenue.value / earlier.value - 1) * 100).toFixed(1)}% versus previous available annual period (${earlier.period}).`
      return `${revenue.period}: ${formatBillions(revenue.value)} revenue · Prior-year comparison unavailable.`
    case 'profitability':
      return revenue && net && revenue.period === net.period && revenue.value !== 0
        ? `${last}: Net income ${formatBillions(net.value)} · Net margin ${(net.value / revenue.value * 100).toFixed(1)}%.`
        : 'Comparable annual revenue and net income unavailable.'
    case 'cash':
      if (/bank|financial services/i.test(company.sector || '') || ticker === 'JPM') return 'Bank: review regulatory capital, liquidity, and credit quality.'
      if (cash && capex && cash.period === capex.period) return `${cash.period}: Operating cash flow ${formatBillions(cash.value)} · Capital expenditure ${formatBillions(Math.abs(capex.value))} · Approximate FCF ${formatBillions(cash.value - Math.abs(capex.value))}.`
      return 'Comparable cash-flow and capital-spending data unavailable.'
    case 'balance':
      return assets && liabilities && assets.period === liabilities.period
        ? `${assets.period}: Assets ${formatBillions(assets.value)} · Total liabilities ${formatBillions(liabilities.value)}.`
        : 'Comparable balance-sheet data unavailable.'
    case 'valuation':
      return pe ? `P/E: ${pe} · Historical market metric.` : 'Valuation data unavailable.'
    case 'risks':
      return `SEC sources: ${(research?.filings || []).length} · News articles: ${(research?.news || []).length}`
    case 'thesis':
      return 'Investment thesis and supporting evidence.'
    default: return ''
  }
}

export function analystFramework() { return FRAMEWORK }

export default function AnalystChecklistSection({ ticker, research, owner = 'guest' }) {
  const [review, setReview] = useState(() => readAnalystReview(ticker, owner))
  const [expanded, setExpanded] = useState('business')
  const [storageError, setStorageError] = useState(false)
  const answers = review.answers || {}
  const completed = FRAMEWORK.filter((item) => reviewStatus(answers[item.id]?.status) !== 'unreviewed').length

  function save(next) {
    const value = { ...next, updatedAt: new Date().toISOString() }
    setReview(value)
    try { localStorage.setItem(storageKey(ticker, owner), JSON.stringify(value)); setStorageError(false) }
    catch { setStorageError(true) }
  }

  function updateAnswer(id, field, value) {
    save({ ...review, answers: { ...answers, [id]: { ...(answers[id] || {}), [field]: value } } })
  }

  function reset() {
    if (!window.confirm(`Clear your review for ${ticker}? This cannot be undone.`)) return
    try { localStorage.removeItem(storageKey(ticker, owner)); setStorageError(false) }
    catch { setStorageError(true) }
    setReview({ answers: {}, thesis: '' })
  }

  return (
    <section className="rounded-3xl border border-border p-5 sm:p-6 shadow-sm" style={{ background: 'var(--surface)' }} aria-label={`${ticker} analyst review`}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-text-primary">Analyst Review · {ticker}</h3>
          <p className="text-xs text-text-muted mt-1" title="Notes are stored in this browser. They are not synced to an account or included in shared links.">Company analysis · Private notes on this device</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-semibold text-text-primary tabular-nums">{completed}<span className="text-sm text-text-muted"> / {FRAMEWORK.length}</span></span>
          <p className="text-[11px] text-text-muted">Reviewed</p>
        </div>
      </div>

      <div role="progressbar" aria-label="Review completion" aria-valuemin={0} aria-valuemax={FRAMEWORK.length} aria-valuenow={completed} className="h-2 rounded-full overflow-hidden mb-5" style={{ background: 'var(--surface-elevated)' }}>
        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${completed / FRAMEWORK.length * 100}%` }} />
      </div>
      {storageError && <p role="alert" className="mb-3 text-xs text-red-500">Your browser blocked local storage. These notes may not survive a refresh.</p>}

      <div className="space-y-2">
        {FRAMEWORK.map((item, i) => {
          const answer = answers[item.id] || {}
          const isOpen = expanded === item.id
          return <div key={item.id} className="rounded-xl border border-border overflow-hidden" style={{ background: 'var(--surface-elevated)' }}>
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 sm:p-4">
              <button type="button" onClick={() => setExpanded(isOpen ? null : item.id)} aria-expanded={isOpen}
                className="flex flex-1 min-w-[190px] items-center gap-3 text-left">
                <span className="h-8 w-8 rounded-lg border border-border inline-flex items-center justify-center shrink-0 text-xs font-semibold text-text-muted">{String(i + 1).padStart(2, '0')}</span>
                <span className="flex-1 min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-wide text-text-muted">{item.group}</span>
                  <span className="block text-sm font-semibold text-text-primary mt-0.5">{item.title}</span></span>
                {isOpen ? <ChevronUp size={16} className="text-text-muted shrink-0" /> : <ChevronDown size={16} className="text-text-muted shrink-0" />}
              </button>
              <select aria-label={`${item.group} assessment`} value={reviewStatus(answer.status)}
                onChange={(event) => updateAnswer(item.id, 'status', event.target.value)}
                className="w-full sm:w-[178px] rounded-lg border border-border px-2 py-2 text-xs font-semibold text-text-primary"
                style={{ background: 'var(--surface)' }}>
                {Object.entries(REVIEW_STATUS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </div>
            {isOpen && <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
              <p className="text-sm font-medium text-text-primary">{item.prompt}</p>
              <p className="text-xs text-text-muted leading-5">{item.help}</p>
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500 mb-1">{ticker} · Key figures</p>
                <p className="text-xs leading-5 text-text-secondary">{analystEvidence(item.id, research)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <a href={`#${item.destination}`} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-500 hover:underline"><FileText size={13} /> {item.destinationLabel}</a>
                <a href={item.learn} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-text-muted hover:text-blue-500"><BookOpen size={13} /> Reference <ExternalLink size={11} /></a>
              </div>
              <div>
                <label htmlFor={`review-${ticker}-${item.id}`} className="block text-xs font-semibold text-text-primary mb-1">Analyst notes</label>
                <textarea id={`review-${ticker}-${item.id}`} rows={2} maxLength={2500} value={answer.note || ''}
                  onChange={(event) => updateAnswer(item.id, 'note', event.target.value)}
                  placeholder="Findings, sources, and follow-up questions…"
                  className="w-full resize-y rounded-lg border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue-500/60"
                  style={{ background: 'var(--surface)' }} />
              </div>
            </div>}
          </div>
        })}
      </div>
      <div className="mt-5 rounded-xl border border-border p-4" style={{ background: 'var(--surface-elevated)' }}>
        <label htmlFor={`thesis-${ticker}`} className="block text-sm font-semibold text-text-primary mb-1">Investment Thesis</label>
        <p className="text-xs text-text-muted mb-3">Investment case · Downside risks · Reassessment criteria</p>
        <textarea id={`thesis-${ticker}`} rows={3} maxLength={5000} value={review.thesis || ''}
          onChange={(event) => save({ ...review, thesis: event.target.value })}
          placeholder={`Investment case for ${ticker}…`}
          className="w-full resize-y rounded-lg border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue-500/60"
          style={{ background: 'var(--surface)' }} />
      </div>
      <div className="mt-4 flex flex-wrap justify-between items-center gap-3">
        <span className="text-xs text-text-muted">Personal research notes</span>
        <button type="button" onClick={reset} className="inline-flex gap-1 items-center text-xs font-medium text-text-muted hover:text-red-500"><RotateCcw size={13} /> Clear review</button>
      </div>
    </section>
  )
}
