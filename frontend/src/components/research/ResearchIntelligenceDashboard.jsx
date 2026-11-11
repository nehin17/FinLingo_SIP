import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, ReferenceLine,
  CartesianGrid, XAxis, YAxis, Tooltip,
} from 'recharts'
import {
  Activity, AlertTriangle, ArrowUpRight, BarChart3, CheckCircle2,
  ChevronDown, Database, FileText, Info, RefreshCw, Scale,
  ShieldCheck, TrendingUp, Users,
} from 'lucide-react'
import './researchIntelligence.css'

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '')
const list = (value) => Array.isArray(value) ? value : []
const valid = (value) => typeof value === 'number' && Number.isFinite(value)
const format = (value, digits = 1, suffix = '') => valid(value) ? `${value.toFixed(digits)}${suffix}` : '—'
const signed = (value) => valid(value) ? `${value > 0 ? '+' : ''}${format(value, 1, '%')}` : '—'
const levelLabel = (value, unit) => valid(value) ? (unit === 'USD/share' ? `$${value.toFixed(2)}` : `$${value.toFixed(2)}B`) : '—'
const safeUrl = (value) => typeof value === 'string' && /^https:\/\//i.test(value) ? value : null
const money = (value) => {
  if (!valid(value)) return '—'
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : ''
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`
  return `${sign}$${abs.toLocaleString()}`
}

function Heading({ icon: Icon, title, subtitle, side }) {
  return <header className="ri-heading">
    <span className="ri-heading-icon"><Icon size={19} strokeWidth={1.9} /></span>
    <div className="ri-heading-copy"><h3>{title}</h3><p>{subtitle}</p></div>
    {side && <span className="ri-heading-side">{side}</span>}
  </header>
}

function Missing({ text = 'No verified data available for this period.' }) {
  return <div className="ri-missing">{text}</div>
}

function Valuation({ rows }) {
  const available = list(rows).filter(item => item.company !== null && item.company !== undefined)
  return <section className="ri-panel ri-valuation">
    <Heading icon={Scale} title="Valuation" subtitle="Pricing relative to comparable companies" side={`${available.length} ratios`} />
    <div className="ri-table-wrap"><table className="ri-table">
      <thead><tr><th>Metric</th><th>Company</th><th>Peer median</th></tr></thead>
      <tbody>{list(rows).map((r) => <tr key={r.metric}>
        <td><span className="ri-metric-label" title={r.formula || ''}>{r.metric}<Info size={12} /></span></td>
        <td className="ri-bold-val">{r.company ?? '—'}</td>
        <td className={r.industry ? '' : 'ri-not-enough'} title={!r.industry ? 'Fewer than two peers have this comparable metric.' : ''}>{r.industry ?? 'Limited peers'}</td>
      </tr>)}</tbody>
    </table></div>
    <span className="ri-panel-caption">Peer benchmarks require two comparable observations. Unavailable values are never estimated.</span>
  </section>
}

function Profitability({ rows }) {
  return <section className="ri-panel ri-profit">
    <Heading icon={TrendingUp} title="Profitability" subtitle="Margins and return on capital" side="SEC annual" />
    <div className="ri-profit-items">{list(rows).map((r) => {
      const n = valid(r.value) ? r.value : null
      const peer = valid(r.benchmark) ? r.benchmark : null
      const range = Math.max(100, Math.abs(n ?? 0), Math.abs(peer ?? 0)) * 1.04
      const width = n === null ? 0 : Math.min(100, Math.max(0, n) / range * 100)
      const position = peer === null ? 0 : Math.min(99, Math.max(0, peer) / range * 100)
      return <div key={r.label} className="ri-profit-item">
        <div className="ri-profit-meta"><strong>{r.label}</strong><span className="ri-profit-value">{format(n, 1, '%')}{peer !== null && <small>Peer {format(peer, 1, '%')}</small>}</span></div>
        <div className="ri-track" role="img" aria-label={`${r.label}: ${format(n, 1, '%')}; peer median: ${format(peer, 1, '%')}`}>
          <div className="ri-fill" style={{ width: `${width}%` }} />
          {peer !== null && <span className="ri-peer-marker" style={{ left: `${position}%` }} />}
        </div>
      </div>
    })}</div>
    <div className="ri-track-key"><span><i className="ri-dot ri-dot-blue" /> Company</span><span><i className="ri-marker-key" /> Peer median (if available)</span></div>
  </section>
}

const flagName = { positive: 'STRONG', watch: 'WATCH', reported: 'REPORTED', missing: 'NO DATA' }
function Balance({ rows }) {
  return <section className="ri-panel ri-balance">
    <Heading icon={ShieldCheck} title="Balance Sheet Health" subtitle="Liquidity, financing and solvency" side="7 metrics" />
    <div className="ri-balance-grid">{list(rows).map((r) => <div className="ri-stat-card" key={r.label}>
      <div className="ri-stat-header"><strong>{r.label}</strong><span className={`ri-flag ri-flag-${r.status || 'reported'}`}>{r.value ? flagName[r.status] || 'REPORTED' : 'NO DATA'}</span></div>
      <div className="ri-stat-number">{r.value ?? '—'}</div>
      <p>{r.note}</p>
    </div>)}</div>
  </section>
}

function GrowthTooltip({ active, payload, label, mode, unit }) {
  if (!active || !payload?.length) return null
  const value = Number(payload[0]?.value)
  return <div className="ri-chart-tooltip"><strong>{label}</strong><span>{mode === 'growth' ? signed(value) : levelLabel(value, unit)}</span></div>
}

function Growth({ rows }) {
  const [mode, setMode] = useState('growth')
  return <section className="ri-panel ri-wide ri-growth">
    <div className="ri-growth-title-row"><Heading icon={Activity} title="Growth Trends" subtitle="Reported annual growth and underlying SEC financial figures" />
      <div className="ri-segmented" aria-label="Growth chart view">
        <button type="button" aria-pressed={mode === 'growth'} className={mode === 'growth' ? 'active' : ''} onClick={() => setMode('growth')}>YoY %</button>
        <button type="button" aria-pressed={mode === 'levels'} className={mode === 'levels' ? 'active' : ''} onClick={() => setMode('levels')}>Reported values</button>
      </div>
    </div>
    <div className="ri-growth-grid">{list(rows).map((series, index) => {
      const raw = mode === 'growth' ? series.data : series.levels
      const points = list(raw).filter(p => valid(p.value) && typeof p.period === 'string')
      const latest = points.length ? points.at(-1).value : null
      const gradient = `riAreaV3${index}`
      const low = Math.min(0, ...points.map(p => p.value))
      const high = Math.max(0, ...points.map(p => p.value))
      const margin = Math.max(0.5, (high - low) * 0.18)
      return <div className="ri-chart-tile" key={series.label}>
        <div className="ri-chart-top"><div><strong>{series.label}</strong><small>{mode === 'growth' ? 'Latest annual change' : series.unit || 'Fiscal-year value'}</small></div>
          <b className={latest !== null && latest < 0 ? 'ri-negative' : 'ri-positive'}>{mode === 'growth' ? signed(latest) : levelLabel(latest, series.unit)}</b></div>
        {points.length < 2 ? <Missing text="Not enough comparable annual SEC facts to draw a trend." /> : <div className="ri-chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 16, bottom: 4, left: 0, right: 12 }}>
              <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#376af1" stopOpacity={0.17}/><stop offset="95%" stopColor="#376af1" stopOpacity={0.01}/></linearGradient></defs>
              <CartesianGrid stroke="var(--border, #e2e8f0)" strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted,#66758e)' }} tickMargin={11} minTickGap={7}/>
              <YAxis axisLine={false} tickLine={false} domain={[low - margin, high + margin]} tick={{ fontSize: 10, fill: 'var(--text-muted,#66758e)' }} width={50} tickFormatter={v => mode === 'growth' ? `${Number(v).toFixed(0)}%` : `${Number(v).toFixed(0)}${series.unit === 'USD/share' ? '' : 'B'}`} tickCount={5}/>
              <ReferenceLine y={0} stroke="#a8b4ca" strokeDasharray="4 4" />
              <Tooltip content={<GrowthTooltip mode={mode} unit={series.unit} />} cursor={{ stroke: '#7892ce', strokeDasharray: '3 3' }} />
              <Area type="monotone" dataKey="value" stroke="#376af1" strokeWidth={2.6} fill={`url(#${gradient})`} dot={{ r: 3.5, stroke: '#376af1', fill: 'var(--surface,#fff)', strokeWidth: 2 }} activeDot={{ r: 5.5 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>}
        {points.length > 0 && <div className="ri-chart-period">{points[0].period} – {points.at(-1).period}</div>}
      </div>
    })}</div>
  </section>
}

function EvidenceGroup({ title, icon: Icon, entries, tone, emptyMessage }) {
  return <div className="ri-evidence-column">
    <div className={`ri-evidence-heading ri-evidence-${tone}`}><Icon size={18} /><h4>{title}</h4><span>{entries.length} signals</span></div>
    <div className="ri-evidence-stack">{entries.length ? entries.map((e, index) => <article className="ri-evidence-card" key={`${e.title}-${index}`}>
      <div className="ri-evidence-body"><span className={`ri-evidence-number ri-evidence-${tone}`}>{String(index + 1).padStart(2, '0')}</span><div><h5>{e.title}</h5><p>{e.description}</p></div></div>
      <div className="ri-evidence-source"><span>{e.sourceLabel ? `${e.sourceLabel} · ` : ''}{e.calculation || 'Financial screening metric'}</span>{safeUrl(e.sourceUrl) && <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`View evidence for ${e.title}`}>Source <ArrowUpRight size={13}/></a>}</div>
    </article>) : <Missing text={emptyMessage || 'No financial ratio triggered this screening rule; review filing disclosures below.'} />}</div>
  </div>
}

function FilingEvidence({ data }) {
  const findings = list(data?.filingRisks)
  const status = data?.filingStatus
  return <div className="ri-filing-evidence">
    <header className="ri-filing-header"><div><span className="ri-filing-overline">FROM THE ANNUAL REPORT</span>
      <h4>Risks disclosed by the company</h4><p>Short, attributed excerpts from Form 10-K Item 1A. These are disclosures, not probability estimates.</p></div>
      {safeUrl(data?.filingUrl) && <a href={data.filingUrl} target="_blank" rel="noopener noreferrer">Open 10-K <ArrowUpRight size={14}/></a>}
    </header>
    {findings.length ? <div className="ri-filing-grid">{findings.map((f, i) => <article className="ri-filing-card" key={`${f.title}-${i}`}>
      <div className="ri-filing-card-top"><span className="ri-risk-dot"/><strong>{f.title}</strong></div>
      <p>{f.description}</p>
      <div className="ri-filing-card-foot"><span>Company disclosure · {f.periodEnd || 'latest 10-K'}</span>
        {safeUrl(f.sourceUrl) && <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer">Read context <ArrowUpRight size={12}/></a>}</div>
    </article>)}</div> : <Missing text={status === 'not_configured'
      ? 'Configure SEC_USER_AGENT to retrieve company risk disclosures.'
      : status === 'request_failed' ? 'SEC filing access is temporarily unavailable. Financial screening remains usable.'
      : 'A reliable Item 1A excerpt could not be extracted from this filing. Use the linked report for a manual risk review.'} />}
  </div>
}

function Competitive({ data, source }) {
  const strengths = list(data?.strengths)
  const risks = list(data?.risks)
  const news = list(data?.news)
  return <section className="ri-panel ri-wide ri-competitive">
    <Heading icon={BarChart3} title="Investment strengths & risk review" subtitle="Financial screening plus independently attributed company disclosures" side={source?.latestPeriod ? `FY ${source.latestPeriod}` : 'Company research'} />
    <div className="ri-evidence-grid">
      <EvidenceGroup title="Financial strengths" tone="good" entries={strengths} icon={CheckCircle2} emptyMessage="No screened strength was identified from the available annual figures." />
      <EvidenceGroup title="Financial risks & valuation watchpoints" tone="warn" entries={risks} icon={AlertTriangle} emptyMessage="No numerical screening threshold triggered; this does not mean the company is risk-free." />
    </div>
    <FilingEvidence data={data}/>
    {news.length > 0 && <details className="ri-news-details"><summary><FileText size={16} /> Recent headlines for further investigation <ChevronDown size={14}/></summary>
      <div className="ri-news-grid">{news.map((n, i) => <a href={safeUrl(n.url) || '#'} key={`${n.url}-${i}`} target="_blank" rel="noopener noreferrer" className="ri-news-item"><strong>{n.headline}</strong><small>{[n.source, n.date].filter(Boolean).join(' · ')}</small><ArrowUpRight size={14}/></a>)}</div>
    </details>}
  </section>
}

function Peers({ rows, ticker, sector, coverage }) {
  const data = list(rows)
  const best = useMemo(() => {
    const values = key => data.map(r => r[key]).filter(valid)
    return {
      pe: values('pe').length >= 2 ? Math.min(...values('pe')) : null,
      revenueGrowth: values('revenueGrowth').length >= 2 ? Math.max(...values('revenueGrowth')) : null,
      operatingMargin: values('operatingMargin').length >= 2 ? Math.max(...values('operatingMargin')) : null,
    }
  }, [rows])
  const bestClass = (value, target) => valid(value) && valid(target) && value === target ? 'ri-best' : ''
  return <section className="ri-panel ri-wide ri-peers">
    <Heading icon={Users} title="Peer Comparison" subtitle={`Industry-aligned companies${sector ? ` · ${sector}` : ''} · SEC + available Finnhub metrics`} side={`${data.length} companies`} />
    {data.length < 2 ? <Missing text="There aren't enough comparable companies in the stored universe." /> : <div className="ri-table-wrap"><table className="ri-table ri-peer-table">
      <thead><tr><th>Company</th><th>Market cap</th><th>P/E</th><th>Revenue growth</th><th>Operating margin</th><th>Annual period</th></tr></thead>
      <tbody>{data.map(r => <tr key={r.ticker} className={r.ticker?.toUpperCase() === ticker?.toUpperCase() ? 'ri-selected-peer' : ''}>
        <td><div className="ri-company-cell"><span className="ri-company-monogram">{r.ticker?.slice(0, 2) || '?'}</span><div><strong>{r.ticker}</strong><small>{r.name}</small></div>{r.ticker?.toUpperCase() === ticker?.toUpperCase() && <em>Selected</em>}</div></td>
        <td>{money(r.marketCap)}</td>
        <td className={bestClass(r.pe, best.pe)}>{format(r.pe, 1, 'x')}</td>
        <td className={bestClass(r.revenueGrowth, best.revenueGrowth)} title={r.revenueGrowthSource || ''}>{signed(r.revenueGrowth)}</td>
        <td className={bestClass(r.operatingMargin, best.operatingMargin)}>{format(r.operatingMargin, 1, '%')}</td>
        <td>{safeUrl(r.sourceUrl) ? <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="ri-period-link">{r.periodEnd || 'SEC'} <ArrowUpRight size={12}/></a> : '—'}</td>
      </tr>)}</tbody>
    </table></div>}
    <div className="ri-peer-summary"><span>{coverage?.withSECAnnuals ?? 0}/{coverage?.companies ?? data.length} records have SEC annuals · {coverage?.peValidPeers ?? 0} peers have P/E · {coverage?.psValidPeers ?? 0} peers have P/S</span><span>Dates may differ across issuers; absent API values are not replaced with estimates.</span></div>
  </section>
}

export default function ResearchIntelligenceDashboard({ ticker }) {
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    if (!ticker) { setPayload(null); setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    setPayload(null)
    setError('')
    fetch(`${API_ROOT}/companies/${encodeURIComponent(ticker)}/intelligence`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(`The research endpoint returned HTTP ${response.status}`)
        return response.json()
      })
      .then(data => { if (!controller.signal.aborted) setPayload(data) })
      .catch(err => { if (!controller.signal.aborted) setError(err.message || 'Research unavailable') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [ticker, refresh])

  return <div className="ri-root" id="finlingo-financial-intelligence" aria-label="FINLINGO financial intelligence">
    <div className="ri-hero"><div><div className="ri-eyebrow"><Database size={13}/> FINANCIAL INTELLIGENCE</div><h2>Company fundamentals, in context.</h2><p>Evidence-backed valuation, growth, financial health and competitor benchmarking.</p></div>
      <div className="ri-toolbar">{payload?.periodEnd && <span className="ri-period-pill">FY ended {payload.periodEnd}</span>}<button type="button" onClick={() => setRefresh(v => v + 1)} disabled={loading}><RefreshCw size={15}/>Refresh</button></div>
    </div>
    {loading && <div className="ri-status" role="status"><span className="ri-spinner"/>Loading company and peer filings…</div>}
    {!loading && error && <div className="ri-status ri-error" role="alert"><AlertTriangle size={18}/><div><strong>Financial research is unavailable.</strong><p>{error}. Verify your FINLINGO backend and SEC configuration.</p></div></div>}
    {!loading && payload && <>
      <div className="ri-sourcebar"><span><ShieldCheck size={15} /> {payload?.source?.status === 'available' ? 'SEC annual filing data' : 'Stored fundamentals · SEC data currently unavailable'}</span><span>{payload.companyName || payload.ticker}</span>
        {safeUrl(payload?.source?.url) && <a href={payload.source.url} target="_blank" rel="noopener noreferrer">Financial source <ArrowUpRight size={13}/></a>}
      </div>
      <div className="ri-grid">
        <Valuation rows={payload.valuation}/>
        <Profitability rows={payload.profitability}/>
        <Balance rows={payload.balanceSheet}/>
        <Growth rows={payload.growth}/>
        <Competitive data={payload.competitivePosition} source={payload.source}/>
        <Peers rows={payload.peers} ticker={payload.ticker} sector={payload.sector} coverage={payload.peerCoverage}/>
      </div>
      <details className="ri-method"><summary><Info size={15}/> Data sources &amp; calculation notes <ChevronDown size={14}/></summary><div><p>Annual financials come from SEC EDGAR XBRL company facts. Market capitalisation and trailing P/E are FINLINGO's most recently stored Finnhub metrics; they may have a different observation date. Ratios use the latest available annual amounts and may therefore mix valuation dates.</p><p>Peers normally come from the FINLINGO database. For semiconductor companies the backend can add a small curated list of disclosed SEC reporting issuers; their financial ratios require an available Finnhub valuation record. Fiscal periods may differ. Calculated metrics are screening indicators, not audited credit scores or investing recommendations.</p><p>Free cash flow = cash from operating activities minus capital expenditure. Growth rates require a positive base year. The reported-value graph lets you verify percentage spikes against actual base-year values. Peer medians require at least two observations.</p><p>Qualitative risks are short excerpts from Form 10-K Item 1A only when a section can be confidently extracted. SEC and news-provider errors do not generate substitute AI narratives. Always read the full linked filing before drawing investment conclusions.</p></div></details>
    </>}
  </div>
}
