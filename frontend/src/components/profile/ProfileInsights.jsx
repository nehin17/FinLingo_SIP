import AchievementMilestones from './AchievementMilestones'
import { useMemo } from 'react'
import { ArrowRight, Award, BookOpenCheck, Check, CircleCheck, LockKeyhole } from 'lucide-react'
import { LEARNING_PATHS, LESSONS } from '../../data/learningCurriculum.js'

// Curriculum coverage, not an assessment of competence. All 31 lessons belong to exactly one group.
const TOPIC_GROUPS = [
  { key: 'reporting', label: 'Reporting', short: 'Reports', color: '#3680df', test: (lesson) => lesson.pathId === 'financial-statements' && lesson.number <= 4 },
  { key: 'balance', label: 'Balance sheet', short: 'Balance', color: '#16a8a4', test: (lesson) => lesson.pathId === 'financial-statements' && lesson.number >= 5 && lesson.number <= 9 },
  { key: 'interpretation', label: 'Interpretation', short: 'Analysis', color: '#7d7de2', test: (lesson) => lesson.pathId === 'financial-statements' && lesson.number >= 10 },
  { key: 'cash', label: 'Cash flow', short: 'Cash flow', color: '#9969d8', test: (lesson) => lesson.pathId === 'cash-flow-mastery' },
  { key: 'moats', label: 'Business quality', short: 'Moats', color: '#df8da8', test: (lesson) => lesson.pathId === 'moats-competitive-advantage' },
  { key: 'valuation', label: 'Valuation', short: 'Valuation', color: '#d89a4f', test: (lesson) => lesson.pathId === 'valuation-fundamentals' },
]

const CHART_CENTER = 176
const CHART_RADIUS = 118
const angleFor = (i, count) => -Math.PI / 2 + i * (Math.PI * 2 / count)
const coordinate = (angle, radius) => [CHART_CENTER + Math.cos(angle) * radius, CHART_CENTER + Math.sin(angle) * radius]
const polygon = (values, radius) => values.map((value, i) => coordinate(angleFor(i, values.length), radius * value).join(',')).join(' ')

const MILESTONES = [
  { id: 'first-lesson', name: 'First lesson', details: 'Complete your first lesson', check: ({ lessons }) => lessons >= 1 },
  { id: 'practice', name: 'Practice started', details: 'Submit a practice answer', check: ({ attempts }) => attempts >= 1 },
  { id: 'foundation', name: 'Building foundations', details: 'Complete five lessons', check: ({ lessons }) => lessons >= 5 },
  { id: 'research', name: 'Research started', details: 'Save a company to your watchlist', check: ({ watchlist }) => watchlist >= 1 },
]

function CoverageRadar({ groups }) {
  const values = groups.map((group) => group.total ? group.completed / group.total : 0)
  const covered = groups.reduce((sum, group) => sum + group.completed, 0)
  const outline = Array(groups.length).fill(1)
  const ringFractions = [0.25, 0.5, 0.75, 1]

  return <div className="pg2-radar-block">
    <svg className="pg2-radar" viewBox="0 0 352 352" role="img" aria-label={`Curriculum coverage across six areas. ${covered} lessons completed. ${groups.map((group) => `${group.label}: ${group.completed} of ${group.total}`).join('; ')}`}>
      <defs>
        <linearGradient id="pg2-radar-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#62a1ff" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#40bdac" stopOpacity="0.22"/>
        </linearGradient>
      </defs>
      {ringFractions.map((fraction) => <polygon key={fraction} points={polygon(outline, CHART_RADIUS * fraction)} fill={fraction % 1 === 0 ? 'rgba(83,142,219,.035)' : 'none'} stroke="var(--pg2-grid,#d9e3f0)" strokeWidth="1"/>)}
      {groups.map((group, i) => {
        const [x, y] = coordinate(angleFor(i, groups.length), CHART_RADIUS)
        return <line key={group.key} x1={CHART_CENTER} y1={CHART_CENTER} x2={x} y2={y} stroke="var(--pg2-grid,#d9e3f0)" strokeWidth="1"/>
      })}
      <polygon points={polygon(values, CHART_RADIUS)} fill="url(#pg2-radar-fill)" stroke="#4387d8" strokeLinejoin="round" strokeWidth="2.6"/>
      {groups.map((group, i) => {
        const [x, y] = coordinate(angleFor(i, groups.length), CHART_RADIUS * values[i])
        const [lx, ly] = coordinate(angleFor(i, groups.length), CHART_RADIUS + 20)
        const textAnchor = lx > CHART_CENTER + 8 ? 'start' : lx < CHART_CENTER - 8 ? 'end' : 'middle'
        return <g key={group.key}>
          <circle cx={x} cy={y} r="4.5" fill="#fff" stroke={group.color} strokeWidth="2.5"/>
          <text x={lx} y={ly + 4} fill="var(--text-muted)" fontSize="11" fontWeight="680" textAnchor={textAnchor}>{group.short}</text>
        </g>
      })}
      <circle cx={CHART_CENTER} cy={CHART_CENTER} r="2.2" fill="#4387d8"/>
    </svg>
    <div className="pg2-radar-caption"><span><span className="pg2-radar-legend pg2-radar-legend-completed"/> Lessons completed</span><span><span className="pg2-radar-legend pg2-radar-legend-outline"/> Full curriculum</span></div>
  </div>
}

function TrackBars({ paths, onOpenProgress }) {
  return <div className="pg2-paths">
    <div className="pg2-paths-label">LEARNING PATHS <span>COMPLETED / TOTAL</span></div>
    {paths.map((path) => {
      const percentage = Math.round(path.completed / path.total * 100)
      return <div className="pg2-path" key={path.id}>
        <div className="pg2-path-top"><span>{path.name}</span><strong>{path.completed}<span>/{path.total}</span></strong></div>
        <div className="pg2-path-track" role="progressbar" aria-label={`${path.name} completed lessons`} aria-valuenow={path.completed} aria-valuemax={path.total} aria-valuemin={0}>
          <div style={{ width: `${percentage}%`, backgroundColor: path.color }}/>
        </div>
      </div>
    })}
    <button type="button" className="pg2-text-action" onClick={onOpenProgress}>View detailed learning progress <ArrowRight size={15}/></button>
  </div>
}

export default function ProfileInsights({ completedLessonIds, challengeAttempts, savedCompanies, onOpenLesson, onOpenProgress }) {
  const available = Array.isArray(completedLessonIds)
  const { groups, paths, completedSet, nextLesson } = useMemo(() => {
    const validIds = new Set(LESSONS.map((lesson) => lesson.id))
    const verified = new Set((completedLessonIds || []).filter((id) => validIds.has(id)))
    return {
      completedSet: verified,
      groups: TOPIC_GROUPS.map((group) => {
        const matches = LESSONS.filter(group.test)
        return { ...group, total: matches.length, completed: matches.filter((lesson) => verified.has(lesson.id)).length }
      }),
      paths: LEARNING_PATHS.map((path) => ({
        ...path,
        total: path.topics.length,
        completed: LESSONS.filter((lesson) => lesson.pathId === path.id && verified.has(lesson.id)).length,
      })),
      nextLesson: LESSONS.find((lesson) => !verified.has(lesson.id)) || null,
    }
  }, [completedLessonIds])

  const total = LESSONS.length
  const complete = completedSet.size
  const percent = Math.round(complete / total * 100)
  const milestoneData = { lessons: complete, attempts: challengeAttempts, watchlist: savedCompanies }
  const confirmedMilestones = available ? MILESTONES.filter((item) => {
    if (item.id === 'practice' && challengeAttempts == null) return false
    if (item.id === 'research' && savedCompanies == null) return false
    return item.check(milestoneData)
  }).length : null

  return <>
    <section className="pg-panel pg2-learning-card" aria-label="Learning coverage and progress">
      <div className="pg2-header">
        <div><div className="pg-overline">LEARNING OVERVIEW</div><h2>Curriculum coverage</h2><p>See which areas you've studied and what comes next.</p></div>
        {available && <div className="pg2-total"><strong>{percent}%</strong><span>completed</span></div>}
      </div>
      {available ? <>
        <div className="pg2-learning-main">
          <CoverageRadar groups={groups}/>
          <TrackBars paths={paths} onOpenProgress={onOpenProgress}/>
        </div>
        <div className="pg2-study-next">
          <div className="pg2-next-icon"><BookOpenCheck size={21}/></div>
          <div className="pg2-next-copy"><span>{nextLesson ? 'YOUR NEXT LESSON' : 'CURRICULUM COMPLETED'}</span><strong>{nextLesson?.title || 'All 31 lessons completed'}</strong><small>{nextLesson?.pathName || 'Your entire learning roadmap is complete'}</small></div>
          <button type="button" onClick={() => nextLesson ? onOpenLesson(nextLesson) : onOpenProgress()}>{nextLesson ? 'Study lesson' : 'Review'} <ArrowRight size={15}/></button>
        </div>
        <p className="pg2-caveat">Coverage measures saved lesson completion, not investment expertise or proficiency.</p>
      </> : <div className="pg2-unavailable"><LockKeyhole size={19}/><span>Learning data isn't available. Reconnect your account to see verified curriculum coverage.</span></div>}
    </section>

    <AchievementMilestones>
<section className="pg-panel pg2-milestones-card" aria-label="Learning milestones">
      <div className="pg2-header pg2-milestone-header"><div><div className="pg-overline">PROGRESS MILESTONES</div><h2>Along the way</h2><p>Small markers from learning and research you have actually saved.</p></div>
        <span className="pg2-milestones-count">{confirmedMilestones == null ? '—' : confirmedMilestones} confirmed</span>
      </div>
      <div className="pg2-milestone-grid">
        {MILESTONES.map((item) => {
          const hasData = available && (item.id !== 'practice' || challengeAttempts != null) && (item.id !== 'research' || savedCompanies != null)
          const achieved = hasData && item.check(milestoneData)
          return <div className={`pg2-milestone ${achieved ? 'pg2-milestone-done' : ''}`} key={item.id}>
            <div className="pg2-milestone-icon">{achieved ? <CircleCheck size={18}/> : <Award size={18}/>}</div>
            <div><strong>{item.name}</strong><small>{item.details}</small></div>
            {achieved ? <Check size={15} className="pg2-milestone-check" aria-label="Achieved"/> : <span className="pg2-milestone-locked">{hasData ? 'Next' : '—'}</span>}
          </div>
        })}
      </div>
    </section>
</AchievementMilestones>
  </>
}
