import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Award, BookOpen, BriefcaseBusiness, Check, ChevronDown, ChevronUp,
  Compass, Flame, GraduationCap, Landmark, Layers, Leaf, Medal,
  Newspaper, PencilLine, Search, Sparkles, Star, Target, Trophy, Zap,
} from 'lucide-react'
import './AchievementMilestones.css'

/*
 * One source of truth: existing FINLINGO milestones + saved /api/profile data.
 * A metric that FINLINGO does not yet expose is NOT fabricated. Such badges
 * remain locked and explicitly say 'Awaiting activity data'.
 * The old milestone markup stays mounted solely to preserve its live logic.
 */
const DEFINITIONS = [
  { id: 'lesson-1', title: 'First Spark', detail: 'Complete your first lesson', category: 'Learning', metric: 'lessons', target: 1, Icon: BookOpen, hue: 'amber' },
  { id: 'lesson-5', title: 'Foundation Builder', detail: 'Complete 5 lessons', category: 'Learning', metric: 'lessons', target: 5, Icon: Layers, hue: 'indigo' },
  { id: 'lesson-10', title: 'Knowledge Collector', detail: 'Complete 10 lessons', category: 'Learning', metric: 'lessons', target: 10, Icon: GraduationCap, hue: 'sky' },
  { id: 'lesson-20', title: 'Market Mind', detail: 'Complete 20 lessons', category: 'Learning', metric: 'lessons', target: 20, Icon: Compass, hue: 'violet' },
  { id: 'lesson-31', title: 'Finance Scholar', detail: 'Complete all 31 lessons', category: 'Learning', metric: 'lessons', target: 31, Icon: Trophy, hue: 'gold' },
  { id: 'practice-1', title: 'First Attempt', detail: 'Submit a practice answer', category: 'Practice', metric: 'practice', target: 1, Icon: PencilLine, hue: 'violet' },
  { id: 'practice-5', title: 'Getting the Hang of It', detail: 'Submit 5 practice answers', category: 'Practice', metric: 'practice', target: 5, Icon: Zap, hue: 'sky' },
  { id: 'practice-15', title: 'Practice Pro', detail: 'Submit 15 practice answers', category: 'Practice', metric: 'practice', target: 15, Icon: Target, hue: 'gold' },
  { id: 'watch-1', title: 'First on the Radar', detail: 'Save a company to your watchlist', category: 'Research', metric: 'watchlist', target: 1, Icon: Star, hue: 'mint' },
  { id: 'watch-5', title: 'Stock Scout', detail: 'Save 5 companies to your watchlist', category: 'Research', metric: 'watchlist', target: 5, Icon: Search, hue: 'sky' },
  { id: 'watch-10', title: 'Curated Watchlist', detail: 'Save 10 companies to your watchlist', category: 'Research', metric: 'watchlist', target: 10, Icon: BriefcaseBusiness, hue: 'indigo' },
  { id: 'analyse-1', title: 'Research Rookie', detail: 'Analyse your first company', category: 'Research', metric: 'companies', target: 1, Icon: Compass, hue: 'mint' },
  { id: 'analyse-5', title: 'Insight Explorer', detail: 'Analyse 5 companies', category: 'Research', metric: 'companies', target: 5, Icon: Search, hue: 'violet' },
  { id: 'analyse-20', title: 'Company Detective', detail: 'Analyse 20 companies', category: 'Research', metric: 'companies', target: 20, Icon: Award, hue: 'gold' },
  { id: 'compare-1', title: 'Head to Head', detail: 'Complete your first battle comparison', category: 'Research', metric: 'comparisons', target: 1, Icon: Target, hue: 'sky' },
  { id: 'compare-5', title: 'Comparison Expert', detail: 'Complete 5 battle comparisons', category: 'Research', metric: 'comparisons', target: 5, Icon: Medal, hue: 'indigo' },
  { id: 'brief-1', title: 'Market Reader', detail: 'Read your first market brief', category: 'Research', metric: 'briefs', target: 1, Icon: Newspaper, hue: 'mint' },
  { id: 'brief-10', title: 'Always Informed', detail: 'Read 10 market briefs', category: 'Research', metric: 'briefs', target: 10, Icon: Newspaper, hue: 'gold' },
  { id: 'earnings-1', title: 'Earnings Explorer', detail: 'Review your first earnings report', category: 'Research', metric: 'earnings', target: 1, Icon: Landmark, hue: 'violet' },
  { id: 'earnings-5', title: 'Numbers Whisperer', detail: 'Review 5 earnings reports', category: 'Research', metric: 'earnings', target: 5, Icon: GraduationCap, hue: 'indigo' },
  { id: 'days-3', title: 'Growing Roots', detail: 'Log 3 research days', category: 'Consistency', metric: 'days', target: 3, Icon: Leaf, hue: 'mint' },
  { id: 'days-7', title: 'One Week Wiser', detail: 'Log 7 research days in total', category: 'Consistency', metric: 'days', target: 7, Icon: Sparkles, hue: 'amber' },
  { id: 'days-30', title: 'Rooted in Research', detail: 'Log 30 research days in total', category: 'Consistency', metric: 'days', target: 30, Icon: Trophy, hue: 'gold' },
  { id: 'streak-3', title: 'Momentum', detail: 'Build a 3-day streak', category: 'Consistency', metric: 'streak', target: 3, Icon: Flame, hue: 'amber' },
  { id: 'streak-7', title: 'On a Roll', detail: 'Build a 7-day streak', category: 'Consistency', metric: 'streak', target: 7, Icon: Flame, hue: 'gold' },
]
const TABS = ['All', 'Learning', 'Practice', 'Research', 'Consistency', 'Unlocked']
const trim = (v) => (v || '').replace(/\s+/g, ' ').trim()

function asCount(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}
function firstCount(...values) {
  for (const v of values) { const result = asCount(v); if (result !== null) return result }
  return null
}
function findMilestone(root, title, description) {
  if (!root) return null
  for (const el of root.querySelectorAll('*')) {
    if (el.children.length || trim(el.textContent) !== title) continue
    let parent = el.parentElement
    let last = null
    while (parent && parent !== root) {
      const text = trim(parent.textContent)
      if (text.includes(description) && text.includes(title)) {
        if (['First lesson', 'Practice started', 'Building foundations', 'Research started'].some((name) => name !== title && text.includes(name))) break
        last = parent
      }
      parent = parent.parentElement
    }
    if (last) return last
  }
  return null
}
function getOriginalState(root) {
  if (!root) return null
  const originals = [
    ['first', 'First lesson', 'Complete your first lesson'],
    ['practice', 'Practice started', 'Submit a practice answer'],
    ['five', 'Building foundations', 'Complete five lessons'],
    ['watch', 'Research started', 'Save a company to your watchlist'],
  ]
  const states = {}
  const unknown = []
  for (const [key, title, desc] of originals) {
    const node = findMilestone(root, title, desc)
    if (!node) continue
    const text = trim(node.textContent)
    const locked = /\b(next|not yet|locked|upcoming|pending)\b/i.test(text)
    const checked = Boolean(node.querySelector('.lucide-check, .lucide-check-circle, .lucide-circle-check, [data-lucide="check"], [aria-label="Completed"], [title="Completed"]'))
    const earned = !locked && (checked || /\b(completed|unlocked|earned|achieved)\b/i.test(text))
    states[key] = earned ? true : locked ? false : null
    if (!earned && !locked) unknown.push(key)
  }
  const match = trim(root.textContent).match(/(\d+)\s+confirmed\b/i)
  const count = match ? Number(match[1]) : null
  if (Number.isInteger(count)) {
    const known = Object.values(states).filter(v => v === true).length
    if (count - known === unknown.length) unknown.forEach(key => { states[key] = true })
  }
  return states
}

function deriveCounts(payload, original) {
  const p = payload?.profile || payload || {}
  const learning = p.learning || p.learn || {}
  const stats = p.stats || {}
  const totals = p.activity?.totals || {}
  const growth = p.growth || {}
  const lessonActual = firstCount(learning.completedLessons, learning.lessonsCompleted, p.completedLessons, stats.lessonsCompleted, stats.completedLessons)
  const practiceActual = firstCount(learning.practiceAnswers, learning.answersSubmitted, p.practiceAnswers, p.practiceSubmissions, stats.practiceAnswers, stats.practiceSubmissions)
  const watchActual = Array.isArray(p.watchlist) ? p.watchlist.length : firstCount(stats.watchlist, stats.watchlistCount, p.watchlistCount)
  // The original four milestones can establish conservative minimums, not precise counts.
  const lessonMinimum = original?.five === true ? 5 : original?.first === true ? 1 : original?.first === false ? 0 : null
  return {
    lessons: { value: lessonActual ?? lessonMinimum, exact: lessonActual !== null || (original?.first === false && original?.five === false) },
    practice: { value: practiceActual ?? (original?.practice === true ? 1 : original?.practice === false ? 0 : null), exact: practiceActual !== null || original?.practice === false },
    watchlist: { value: watchActual !== null ? Math.max(watchActual, original?.watch === true ? 1 : 0) : (original?.watch === true ? 1 : original?.watch === false ? 0 : null), exact: watchActual !== null || original?.watch === false },
    companies: { value: firstCount(totals.companiesAnalysed, totals.companiesAnalyzed), exact: true },
    comparisons: { value: firstCount(totals.battleComparisons), exact: true },
    briefs: { value: firstCount(totals.marketBriefsRead), exact: true },
    earnings: { value: firstCount(totals.earningsReviewed), exact: true },
    days: { value: firstCount(growth.totalResearchDays), exact: true },
    streak: { value: firstCount(growth.streak), exact: true },
  }
}
function formatProgress(item) {
  if (item.value === null) return 'Not tracked yet'
  if (item.done) return 'Completed'
  return `${item.value}${item.exact ? '' : '+'} / ${item.target}`
}

export default function AchievementMilestones({ children }) {
  const originalRef = useRef(null)
  const [original, setOriginal] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tab, setTab] = useState('All')
  const [expanded, setExpanded] = useState(false)

  useLayoutEffect(() => {
    const root = originalRef.current
    if (!root) return
    const update = () => {
      const next = getOriginalState(root)
      setOriginal(prev => JSON.stringify(prev) === JSON.stringify(next) ? prev : next)
    }
    update()
    const obs = new MutationObserver(update)
    obs.observe(root, { subtree: true, childList: true, characterData: true, attributes: true })
    return () => obs.disconnect()
  }, [children])

  useEffect(() => {
    let alive = true
    let pending = false
    const load = async () => {
      if (pending) return
      pending = true
      try {
        const response = await fetch('/api/profile', { credentials: 'include', cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          if (alive) setProfile(data)
        }
      } catch { /* Original milestones still work if the profile endpoint is offline. */ }
      pending = false
    }
    const visible = () => { if (!document.hidden) load() }
    window.addEventListener('focus', load)
    document.addEventListener('visibilitychange', visible)
    load()
    return () => { alive = false; window.removeEventListener('focus', load); document.removeEventListener('visibilitychange', visible) }
  }, [])

  const counts = useMemo(() => deriveCounts(profile, original), [profile, original])
  const achievements = useMemo(() => DEFINITIONS.map(def => {
    const metric = counts[def.metric]
    const value = metric?.value ?? null
    const exact = metric?.exact ?? false
    const done = value !== null && value >= def.target && (exact || def.target === 1 || (def.metric === 'lessons' && def.target === 5 && original?.five))
    const progress = value === null ? 0 : Math.min(100, Math.round((value / def.target) * 100))
    return { ...def, value, exact, done, progress }
  }), [counts, original])
  const unlocked = achievements.filter(a => a.done).length
  const currentNext = [...achievements].filter(a => !a.done && a.value !== null)
    .sort((a,b) => b.progress - a.progress || a.target - b.target)[0] || null
  const filtered = achievements.filter(a => tab === 'All' || (tab === 'Unlocked' ? a.done : a.category === tab))
    .sort((a,b) => Number(b.done) - Number(a.done) || b.progress - a.progress)
  const shown = expanded ? filtered : filtered.slice(0, 8)

  return (
    <section className="fa2-shell" aria-label="FINLINGO achievements">
      <div className="fa2-original" aria-hidden="true" inert="" ref={originalRef}>{children}</div>
      <div className="fa2-heading">
        <div>
          <span className="fa2-kicker"><Sparkles size={13} /> YOUR JOURNEY</span>
          <h2><span className="fa2-title-icon"><Trophy size={24}/></span> Achievements <Star size={16} className="fa2-title-star" fill="currentColor" /></h2>
          <p>Collect badges as your financial knowledge and research skills grow.</p>
        </div>
        <div className="fa2-header-count" aria-label={`${unlocked} unlocked out of ${DEFINITIONS.length} badges`}>
          <strong>{unlocked}</strong><div><span>Unlocked</span><small>of {DEFINITIONS.length} badges</small></div>
        </div>
      </div>
      <div className="fa2-summary-line" aria-label={`${unlocked} of ${DEFINITIONS.length} achievement badges unlocked`}>
        <div className="fa2-summary-track"><span style={{width:`${Math.round(unlocked / DEFINITIONS.length * 100)}%`}} /></div>
        <span>{Math.round(unlocked / DEFINITIONS.length * 100)}% discovered</span>
      </div>
      <div className="fa2-feature">
        <div className="fa2-feature-icon"><Target size={22} /></div>
        <div className="fa2-feature-content">
          <span className="fa2-feature-label">UP NEXT <span aria-hidden="true">✦</span></span>
          <h3>{currentNext?.title || 'Every milestone starts with one step'}</h3>
          <p>{currentNext ? currentNext.detail : 'Keep exploring FINLINGO to reveal your next achievement.'}</p>
        </div>
        {currentNext && <div className="fa2-feature-progress"><strong>{currentNext.value}{currentNext.exact ? '' : '+'}<small> / {currentNext.target}</small></strong><div><span style={{width:`${currentNext.progress}%`}}/></div></div>}
      </div>
      <div className="fa2-library-header">
        <div><h3>Badge collection</h3><p>{DEFINITIONS.length} milestones across learning, practice, research and consistency</p></div>
      </div>
      <div className="fa2-tabs" role="group" aria-label="Filter achievements">
        {TABS.map(name => <button className={tab===name ? 'fa2-tab active':'fa2-tab'} type="button" key={name} aria-pressed={tab===name} onClick={() => {setTab(name);setExpanded(false)}}>{name}{name==='Unlocked' && unlocked>0 ? <span>{unlocked}</span>:null}</button>)}
      </div>
      <div className="fa2-grid">
        {shown.map(({id,title,detail,category,target,Icon,hue,value,exact,done,progress})=> (
          <article key={id} className={`fa2-badge ${done ? 'earned' : 'locked'}`}>
            <div className={`fa2-medal fa2-${hue}`}><span className="fa2-ribbon"/><div className="fa2-medal-face"><Icon size={21} strokeWidth={1.9}/></div>{done && <span className="fa2-check"><Check size={11} strokeWidth={3}/></span>}</div>
            <div className="fa2-badge-body">
              <div className="fa2-badge-top"><span>{category}</span>{done && <strong>UNLOCKED</strong>}</div>
              <h4>{title}</h4><p>{detail}</p>
              <div className="fa2-progress-row"><div className="fa2-bar" role="progressbar" aria-label={`${title} progress`} aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(value ?? 0, target)}><span style={{width:`${progress}%`}}/></div><small>{value===null ? '—' : done ? <Check size={12} /> : `${value}${exact ? '' : '+'}/${target}`}</small></div>
              {value===null && <span className="fa2-untracked">Awaiting activity data</span>}
            </div>
          </article>
        ))}
        {!shown.length && <div className="fa2-empty">No badges in this category yet. Your next milestone is around the corner.</div>}
      </div>
      {filtered.length>8 && <button type="button" className="fa2-expand" onClick={() => setExpanded(x=>!x)}>{expanded ? <>Show fewer <ChevronUp size={16}/></> : <>View all {filtered.length} badges <ChevronDown size={16}/></>}</button>}
      <div className="fa2-note"><Leaf size={14}/><span>Badges unlock from saved activity. If a metric isn't provided by your current backend, it stays untracked rather than showing invented progress.</span></div>
    </section>
  )
}
