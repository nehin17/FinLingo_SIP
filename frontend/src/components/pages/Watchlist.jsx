import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BookOpenCheck, CalendarDays, Check,
  ChevronRight, ClipboardList, ExternalLink, Eye, FileText, Filter, Info,
  LoaderCircle, LockKeyhole, Plus, RefreshCw, Search, ShieldCheck, Star,
  Target, Trash2, X,
} from 'lucide-react'

import Sidebar from '../layout/Sidebar.jsx'
import Navbar from '../layout/Navbar.jsx'
import { api } from '../../services/api.js'
import { updateWatchlistResearch } from '../../services/watchlistResearchService.js'

// Account-owned research journal, not a brokerage portfolio or live trading feed.
const STATES = {
  unassessed: { label: 'Not assessed', dot: '#94a3b8' },
  on_track: { label: 'Thesis on track', dot: '#0d9488' },
  needs_review: { label: 'Review required', dot: '#d97706' },
}
const emptyDraft = () => ({ thesis: '', catalyst: '', risk: '', status: 'unassessed', nextReviewDate: '' })
const safeDate = (value) => value ? String(value).slice(0, 10) : ''
const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const fmtDate = (date) => {
  const value = safeDate(date)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '—'
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
const numeric = (n) => n == null || n === '' || !Number.isFinite(Number(n)) ? null : Number(n)
const fmtUSD = (n) => n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
const fmtChange = (n) => n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(2)}%`
const normalize = (record) => ({
  ...record,
  thesis: record.thesis || '', catalyst: record.catalyst || '', risk: record.risk || '',
  status: STATES[record.status] ? record.status : 'unassessed',
  nextReviewDate: safeDate(record.nextReviewDate),
})
const getLatestSnapshot = (research) => {
  if (!research) return { price: null, date: '', change: null }
  const series = Array.isArray(research.chartData) ? [...research.chartData]
    .filter((p) => numeric(p.value) != null && /^\d{4}-\d{2}-\d{2}/.test(p.date || ''))
    .sort((a, b) => String(a.date).localeCompare(String(b.date))) : []
  const latest = series.at(-1)
  const previous = series.at(-2)
  const price = numeric(latest?.value) ?? numeric(research.price)
  const prevPrice = numeric(previous?.value)
  const change = latest && previous && prevPrice != null && prevPrice !== 0
    ? ((price - prevPrice) / prevPrice) * 100 : null
  return { price, date: safeDate(latest?.date), change }
}

function Panel({ children, className = '', style = {} }) {
  return <section className={`rounded-[22px] border shadow-sm ${className}`} style={{ background: 'var(--surface)', borderColor: 'var(--border)', ...style }}>{children}</section>
}
function Caption({ children }) { return <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{children}</p> }
function Status({ value }) {
  const s = STATES[value] || STATES.unassessed
  return <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--surface-elevated)' }}>
    <span className="h-2 w-2 rounded-full" style={{ background: s.dot }} />{s.label}
  </span>
}
function EmptyState({ onAdd }) {
  return <Panel className="flex flex-col items-center px-5 py-16 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'var(--surface-elevated)', color: 'var(--primary)' }}><ClipboardList size={28} /></div>
    <h2 className="mt-5 text-2xl font-bold">Create your research watchlist</h2>
    <p className="mt-2 max-w-md text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
      Save a company, record why you're following it, and decide what evidence would make you revisit your thesis. Nothing is tracked or rated until you add it.
    </p>
    <button type="button" onClick={onAdd} className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white" style={{ background: '#2563eb' }}><Plus size={17} /> Add your first company</button>
  </Panel>
}
function ValueCard({ icon: Icon, label, value, hint }) {
  return <Panel className="p-4 sm:p-5">
    <div className="flex items-center justify-between"><Caption>{label}</Caption><Icon size={17} style={{ color: 'var(--text-muted)' }} /></div>
    <div className="mt-3 text-3xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</div>
    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>
  </Panel>
}

export default function Watchlist({
  isAuthenticated, user, theme, onThemeToggle, onSignInClick, onSignUpClick,
  onSignOut, navbarProps, sidebarProps,
}) {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [items, setItems] = useState([])
  const [catalog, setCatalog] = useState([])
  const [snapshots, setSnapshots] = useState({})
  const [loading, setLoading] = useState(Boolean(isAuthenticated))
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState('')
  const requestVersion = useRef(0)

  const load = useCallback(async () => {
    if (!isAuthenticated) return
    const version = ++requestVersion.current
    setLoading(true)
    setError('')
    try {
      const records = await api.watchlist.getAll()
      if (version !== requestVersion.current) return
      const next = (Array.isArray(records) ? records : []).map(normalize)
      setItems(next)
      setSelected((previous) => next.some((item) => item.ticker === previous) ? previous : next[0]?.ticker || null)
      const responses = await Promise.allSettled(next.map((item) => api.companies.getByTicker(item.ticker)))
      if (version !== requestVersion.current) return
      setSnapshots(Object.fromEntries(responses.map((result, index) => [next[index].ticker,
        result.status === 'fulfilled' ? getLatestSnapshot(result.value) : { price: null, date: '', change: null }
      ])))
    } catch (err) {
      if (version === requestVersion.current) setError(`Could not load your saved watchlist. ${err?.message || 'Please try again.'}`)
    } finally { if (version === requestVersion.current) setLoading(false) }
  }, [isAuthenticated, user?.email])

  useEffect(() => {
    if (isAuthenticated) { load() }
    else { setItems([]); setSnapshots({}); setSelected(null); setError(''); setNotice(''); setShowAdd(false) }
    return () => { requestVersion.current += 1 }
  }, [isAuthenticated, user?.email, load])

  useEffect(() => {
    const current = items.find((item) => item.ticker === selected)
    setDraft(current ? {
      thesis: current.thesis, catalyst: current.catalyst, risk: current.risk,
      status: current.status, nextReviewDate: current.nextReviewDate,
    } : emptyDraft())
  }, [items, selected])

  const loadCatalog = async () => {
    setQuery('')
    setShowAdd(true)
    setCatalogLoading(true)
    setError('')
    try {
      const available = await api.companies.getAll()
      setCatalog((Array.isArray(available) ? available : []).filter((c) => c?.ticker))
    } catch (err) { setError(`Company search could not load: ${err?.message || 'try again.'}`) }
    finally { setCatalogLoading(false) }
  }

  const add = async (ticker) => {
    setBusy(ticker); setError('')
    try {
      const item = normalize(await api.watchlist.add(ticker))
      setItems((current) => current.some((row) => row.ticker === ticker) ? current : [...current, item])
      setSelected(ticker)
      setShowAdd(false); setQuery('')
      setNotice(`${ticker} added to your account watchlist.`)
      try {
        const research = await api.companies.getByTicker(ticker)
        setSnapshots((previous) => ({ ...previous, [ticker]: getLatestSnapshot(research) }))
      } catch { setSnapshots((previous) => ({ ...previous, [ticker]: { price: null, date: '', change: null } })) }
    } catch (err) { setError(`Couldn't add ${ticker}: ${err?.message || 'Please try again.'}`) }
    finally { setBusy('') }
  }

  const remove = async (ticker) => {
    if (!window.confirm(`Remove ${ticker} and its saved research notes from your watchlist?`)) return
    setBusy(ticker); setError('')
    try {
      await api.watchlist.remove(ticker)
      setItems((current) => current.filter((item) => item.ticker !== ticker))
      setNotice(`${ticker} removed from your watchlist.`)
    } catch (err) { setError(`Couldn't remove ${ticker}: ${err?.message || 'Please try again.'}`) }
    finally { setBusy('') }
  }

  const save = async () => {
    if (!selected) return
    setSaving(true); setError(''); setNotice('')
    try {
      const updated = normalize(await updateWatchlistResearch(selected, {
        thesis: draft.thesis.trim(), catalyst: draft.catalyst.trim(), risk: draft.risk.trim(),
        status: draft.status, nextReviewDate: draft.nextReviewDate || null,
      }))
      setItems((previous) => previous.map((item) => item.ticker === selected ? updated : item))
      setNotice(`${selected} research notes saved to your account.`)
    } catch (err) { setError(`Research notes were not saved: ${err?.message || 'Please try again.'}`) }
    finally { setSaving(false) }
  }

  const selectedItem = items.find((item) => item.ticker === selected)
  const isDirty = selectedItem && (draft.thesis !== selectedItem.thesis || draft.catalyst !== selectedItem.catalyst ||
    draft.risk !== selectedItem.risk || draft.status !== selectedItem.status || draft.nextReviewDate !== selectedItem.nextReviewDate)
  const selectCompany = (ticker) => {
    if (ticker === selected) return
    if (isDirty && !window.confirm('You have unsaved research notes. Switch companies and discard those changes?')) return
    setSelected(ticker)
  }
  const today = todayKey()
  const isDue = (item) => !!item.nextReviewDate && item.nextReviewDate <= today
  const needsBrief = (item) => !item.thesis.trim() || !item.risk.trim()
  const due = items.filter((item) => isDue(item) || item.status === 'needs_review')
  const incomplete = items.filter(needsBrief)
  const filtered = useMemo(() => items.filter((item) =>
    (filter === 'all' || (filter === 'review' && (isDue(item) || item.status === 'needs_review')) ||
      (filter === 'incomplete' && needsBrief(item))) &&
    `${item.ticker} ${item.name}`.toLowerCase().includes(query.toLowerCase())
  ), [items, filter, query, today])
  const queue = useMemo(() => [...items].filter((item) => isDue(item) || item.status === 'needs_review' || needsBrief(item))
    .sort((a, b) => Number(isDue(b)) - Number(isDue(a)) || Number(b.status === 'needs_review') - Number(a.status === 'needs_review')).slice(0, 4), [items, today])
  const possible = catalog.filter((item) => !items.some((tracked) => tracked.ticker === item.ticker) &&
    `${item.ticker} ${item.name} ${item.sector || ''}`.toLowerCase().includes(query.toLowerCase())).slice(0, 40)
  const navigation = navbarProps || { isAuthenticated, user, theme, onThemeToggle, onSignInClick, onSignUpClick, onSignOut }
  const sidebar = sidebarProps || { isAuthenticated, user, onSignInClick, onSignOut }
  const todaySnapshots = items.map((item) => snapshots[item.ticker]).filter((q) => q?.date).map((q) => q.date).sort()
  const newestPriceDate = todaySnapshots.at(-1)

  return <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
    <Navbar {...navigation} onSidebarToggle={() => setMobileOpen(true)} />
    <div className="flex min-h-screen"><Sidebar {...sidebar} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <main className="min-w-0 flex-1 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1250px] space-y-6">
          {!isAuthenticated ? (
            <Panel className="mx-auto mt-14 max-w-2xl px-6 py-14 text-center sm:px-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl" style={{ color: 'var(--primary)', background: 'var(--surface-elevated)' }}><LockKeyhole size={28} /></div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--primary)' }}>Private research workspace</p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Your Watchlist lives in your account</h1>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-7" style={{ color: 'var(--text-muted)' }}>
                Sign in to follow companies, save your investment theses, and plan when each business needs another review. No public sample stocks are displayed as your holdings.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={onSignInClick} className="rounded-xl px-5 py-3 text-sm font-semibold text-white" style={{ background: '#2563eb' }}>Sign In</button>
                <button type="button" onClick={onSignUpClick} className="rounded-xl border px-5 py-3 text-sm font-semibold" style={{ borderColor: 'var(--border)' }}>Create Account</button>
              </div>
            </Panel>
          ) : <>
            <header className="flex flex-wrap items-start justify-between gap-5 py-1">
              <div className="max-w-2xl">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--primary)' }}><Star size={15} /> Private workspace</div>
                <h1 className="text-3xl font-bold sm:text-4xl">Watchlist</h1>
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-muted)' }}>Follow businesses, document your investment thesis, and schedule research reviews. Built around your saved companies, not market guesses.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={load} disabled={loading} type="button" title="Refresh saved data" className="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold disabled:opacity-50" style={{ borderColor: 'var(--border)' }}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</button>
                <button onClick={loadCatalog} type="button" className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ background: '#2563eb' }}><Plus size={16} /> Add Company</button>
              </div>
            </header>

            {error && <div role="alert" className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: '#fca5a5', background: 'rgba(239,68,68,.06)', color: 'var(--text-primary)' }}><Info size={18} color="#dc2626"/><span className="flex-1">{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
            {notice && <div role="status" className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface-elevated)' }}><span className="flex items-center gap-2"><Check size={16} color="#0d9488"/>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={16}/></button></div>}

            {loading ? <Panel className="flex items-center justify-center gap-3 py-20"><LoaderCircle className="animate-spin" size={20} /> Loading your saved watchlist…</Panel>
              : items.length === 0 && error ? <Panel className="p-10 text-center"><p className="text-sm">Your account watchlist could not be loaded.</p><button type="button" onClick={load} className="mt-4 rounded-xl border px-5 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border)' }}>Retry</button></Panel>
              : items.length === 0 ? <EmptyState onAdd={loadCatalog}/>
              : <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <ValueCard icon={Eye} label="Companies followed" value={items.length} hint="Saved to your account" />
                  <ValueCard icon={FileText} label="Thesis notes needed" value={incomplete.length} hint="Missing thesis or risk" />
                  <ValueCard icon={CalendarDays} label="Reviews to address" value={due.length} hint="Due dates or your review flags" />
                  <ValueCard icon={ShieldCheck} label="Documented research" value={items.length - incomplete.length} hint="Thesis and risk recorded" />
                </div>
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
                  <Panel className="min-w-0 overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-5 sm:px-6" style={{ borderColor: 'var(--border)' }}>
                      <div><h2 className="text-lg font-bold">Tracked companies</h2><Caption>Latest stored close, where available · not a live price feed</Caption></div>
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}><Filter size={14}/> {items.length} saved</div>
                    </div>
                    <div className="flex flex-wrap gap-2 border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
                      {[['all','All companies'],['review','Review queue'],['incomplete','Incomplete thesis']].map(([key, label]) =>
                        <button key={key} onClick={() => setFilter(key)} className="rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: filter === key ? 'var(--primary)' : 'var(--border)', background: filter === key ? 'var(--surface-elevated)' : 'transparent', color: filter === key ? 'var(--primary)' : 'var(--text-muted)' }}>{label}</button>)}
                    </div>
                    <div className="px-5 pb-3 pt-4"><label className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}><Search size={16} style={{ color: 'var(--text-muted)' }}/><input className="w-full bg-transparent text-sm outline-none placeholder:opacity-70" placeholder="Filter tracked companies…" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
                    <div className="max-h-[630px] overflow-y-auto px-3 pb-3 sm:px-4">
                      {filtered.length === 0 && <p className="px-3 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No companies match this filter.</p>}
                      {filtered.map((item) => {
                        const data = snapshots[item.ticker] || { price: null, date: '', change: null }
                        const active = item.ticker === selected
                        return <button key={item.ticker} type="button" onClick={() => selectCompany(item.ticker)} className="mb-1 flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors sm:px-4" style={{ borderColor: active ? 'var(--primary)' : 'transparent', background: active ? 'var(--surface-elevated)' : 'transparent' }}>
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold" style={{ background: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>{item.ticker.slice(0, 4)}</div>
                          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.name || item.ticker}</p><p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{item.ticker} · {data.date ? `As of ${fmtDate(data.date)}` : 'Price date unavailable'}</p></div>
                          <div className="hidden shrink-0 text-right sm:block"><p className="text-sm font-bold tabular-nums">{fmtUSD(data.price)}</p><p className="mt-0.5 text-xs tabular-nums" style={{ color: data.change == null ? 'var(--text-muted)' : data.change > 0 ? '#0d9488' : data.change < 0 ? '#dc2626' : 'var(--text-muted)' }}>{fmtChange(data.change)} <span className="sr-only">versus previous stored close</span></p></div>
                          <ChevronRight size={17} style={{ color: 'var(--text-muted)' }}/>
                        </button>
                      })}
                    </div>
                    <div className="border-t px-5 py-3" style={{ borderColor: 'var(--border)' }}><Caption>Changes compare the last two stored price observations, which may not be consecutive trading days. No movement is displayed without sufficient data.</Caption></div>
                  </Panel>

                  <Panel className="min-w-0 p-5 sm:p-6">
                    {selectedItem ? <>
                      <div className="flex flex-wrap items-start justify-between gap-2"><div><Caption>Research file</Caption><h2 className="mt-1 text-xl font-bold">{selectedItem.name || selectedItem.ticker}</h2><p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{selectedItem.ticker}</p></div><Status value={selectedItem.status}/></div>
                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => navigate(`/dashboard?ticker=${encodeURIComponent(selected)}`)} className="flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-semibold" style={{ borderColor: 'var(--border)' }}>Open research <ExternalLink size={13}/></button>
                        <button type="button" onClick={() => navigate('/battle')} className="flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-semibold" style={{ borderColor: 'var(--border)' }}>Compare <ArrowRight size={13}/></button>
                      </div>
                      <div className="mt-5 space-y-4">
                        <label className="block"><span className="mb-1.5 block text-xs font-semibold">Investment thesis</span><textarea rows={3} maxLength={4000} value={draft.thesis} onChange={(e) => setDraft((v) => ({...v, thesis: e.target.value}))} placeholder="Why is this company worth monitoring? Include the core financial argument." className="w-full resize-y rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-blue-500" style={{ borderColor: 'var(--border)' }}/></label>
                        <label className="block"><span className="mb-1.5 block text-xs font-semibold">Evidence to watch</span><textarea rows={2} maxLength={2500} value={draft.catalyst} onChange={(e) => setDraft((v) => ({...v, catalyst: e.target.value}))} placeholder="What reported result or development would strengthen the thesis?" className="w-full resize-y rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-blue-500" style={{ borderColor: 'var(--border)' }}/></label>
                        <label className="block"><span className="mb-1.5 block text-xs font-semibold">Risks / invalidation conditions</span><textarea rows={2} maxLength={2500} value={draft.risk} onChange={(e) => setDraft((v) => ({...v, risk: e.target.value}))} placeholder="What would make you change your mind?" className="w-full resize-y rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-blue-500" style={{ borderColor: 'var(--border)' }}/></label>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className="block"><span className="mb-1.5 block text-xs font-semibold">Your assessment</span><select value={draft.status} onChange={(e) => setDraft((v) => ({ ...v, status: e.target.value }))} className="w-full rounded-xl border px-3 py-3 text-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}><option value="unassessed">Not assessed</option><option value="on_track">Thesis on track</option><option value="needs_review">Review required</option></select></label>
                          <label className="block"><span className="mb-1.5 block text-xs font-semibold">Next review date</span><input type="date" value={draft.nextReviewDate} onChange={(e) => setDraft((v) => ({ ...v, nextReviewDate: e.target.value }))} className="w-full rounded-xl border px-3 py-3 text-sm" style={{ background: 'var(--surface)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}/></label>
                        </div>
                        <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>Assessments are yours, not automatically generated ratings. Review dates are a planning aid; FINLINGO does not send push alerts.</p>
                        <button type="button" disabled={saving} onClick={save} className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60" style={{ background: '#2563eb' }}>{saving ? <LoaderCircle className="animate-spin" size={16}/> : <Check size={16}/>} {saving ? 'Saving to account…' : isDirty ? 'Save changes to account' : 'Save research file'}</button>
                        <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--border)' }}><Caption>Saved {selectedItem.researchUpdatedAt ? fmtDate(selectedItem.researchUpdatedAt) : 'not yet edited'}</Caption><button type="button" disabled={busy === selected} onClick={() => remove(selected)} className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#dc2626' }}><Trash2 size={14}/> Remove</button></div>
                      </div>
                    </> : <div className="flex h-full flex-col items-center justify-center py-12 text-center"><BookOpenCheck size={25} style={{ color: 'var(--primary)' }}/><h2 className="mt-3 text-lg font-bold">Select a company</h2><Caption>Your research file will appear here.</Caption></div>}
                  </Panel>
                </div>
                <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
                  <Panel className="p-5 sm:p-6">
                    <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Research queue</h2><Caption>Action items based on your own notes and review dates</Caption></div><Target size={20} style={{ color: 'var(--text-muted)' }}/></div>
                    {queue.length === 0 ? <p className="mt-5 rounded-xl p-4 text-sm" style={{ background: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>No outstanding review tasks. Add a next-review date to keep a research cadence.</p>
                      : <div className="mt-4 space-y-2">{queue.map((item) => <button key={item.ticker} type="button" onClick={() => {selectCompany(item.ticker); window.scrollTo({ top: 0, behavior: 'smooth' })}} className="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left" style={{ borderColor: 'var(--border)' }}><div><p className="text-sm font-semibold">{item.ticker} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>· {isDue(item) ? 'Review date reached' : item.status === 'needs_review' ? 'Marked for review' : 'Thesis or risk missing'}</span></p><Caption>{item.nextReviewDate ? `Scheduled ${fmtDate(item.nextReviewDate)}` : 'No review date set'}</Caption></div><ArrowUpRight size={17} style={{ color: 'var(--text-muted)' }}/></button>)}</div>}
                  </Panel>
                  <Panel className="p-5 sm:p-6">
                    <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Research discipline</h2><Caption>A repeatable process for every business</Caption></div><BookOpenCheck size={20} style={{ color: 'var(--text-muted)' }}/></div>
                    <ol className="mt-4 space-y-3">{[
                      ['Form the thesis', 'Explain how the company earns returns and why it interests you.'],
                      ['Find the disconfirming evidence', 'Write risks that would invalidate the investment thesis.'],
                      ['Set a review point', 'Choose a date or event for checking current SEC filings.'],
                    ].map(([title, description], i) => <li key={title} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>{i + 1}</span><div><p className="text-sm font-semibold">{title}</p><Caption>{description}</Caption></div></li>)}</ol>
                    <div className="mt-5 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--surface-elevated)' }}><Caption>{newestPriceDate ? `Newest stored quote in your list: ${fmtDate(newestPriceDate)}. Different stocks may have different dates.` : 'No dated quotes available yet.'} No earnings countdowns or news sentiment are inferred without verified data.</Caption></div>
                  </Panel>
                </div>
              </>}
          </>}
        </div>
      </main>
    </div>

    {isAuthenticated && showAdd && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 px-3 py-6" role="presentation" onMouseDown={(e) => {if (e.target === e.currentTarget) {setShowAdd(false); setQuery('')}}}>
      <div role="dialog" aria-modal="true" aria-labelledby="add-company-title" className="w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}><div><h2 id="add-company-title" className="text-lg font-bold">Add a company</h2><Caption>Choose from FINLINGO's supported research universe</Caption></div><button type="button" onClick={() => { setShowAdd(false); setQuery('') }} aria-label="Close add company"><X size={19}/></button></div>
        <label className="mx-5 mt-4 flex items-center gap-2 rounded-xl border px-3 py-3" style={{ borderColor: 'var(--border)' }}><Search size={17} style={{ color: 'var(--text-muted)' }}/><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search by ticker or company name…" /></label>
        <div className="max-h-[400px] overflow-y-auto p-4">{catalogLoading ? <p className="py-12 text-center text-sm">Loading companies…</p> : !possible.length ? <p className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No available companies found.</p> : possible.map((item) => <button key={item.ticker} type="button" disabled={!!busy} onClick={() => add(item.ticker)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-slate-500/10 disabled:opacity-50"><span className="flex h-10 w-12 items-center justify-center rounded-lg text-xs font-bold" style={{ background: 'var(--surface-elevated)' }}>{item.ticker.slice(0,5)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.name}</span><span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{item.ticker} · {item.sector || 'Company'}</span></span>{busy === item.ticker ? <LoaderCircle size={16} className="animate-spin"/> : <Plus size={16}/>}</button>)}</div>
      </div>
    </div>}
  </div>
}
