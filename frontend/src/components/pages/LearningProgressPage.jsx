import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, CheckCircle2, CircleAlert, RefreshCw } from 'lucide-react'
import Navbar from '../layout/Navbar.jsx'
import Sidebar from '../layout/Sidebar.jsx'
import ProgressDashboard from '../learn/ProgressDashboard.jsx'
import { LEARNING_PATHS, buildLearningProgress } from '../../data/learningCurriculum.js'
import { learningService } from '../../services/learningService.js'

export default function LearningProgressPage({ isAuthenticated, user, theme, onThemeToggle, onSignOut, onSignInClick }) {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const retry = useCallback(() => setRetryCount((count) => count + 1), [])

  useEffect(() => {
    if (!isAuthenticated) return undefined
    let cancelled = false
    setLoading(true)
    setError(null)
    learningService.progress().then((response) => {
      if (!cancelled) setProgress(buildLearningProgress(response))
    }).catch((cause) => {
      if (!cancelled) setError(cause?.message || 'Your progress could not be loaded.')
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isAuthenticated, user?.email, retryCount])

  const openLesson = () => {
    const next = progress?.nextLesson
    navigate(next ? `/learn?path=${encodeURIComponent(next.pathId)}&lesson=${encodeURIComponent(next.lessonId)}` : '/learn')
  }
  return <div className="min-h-screen" style={{ color: 'var(--text)', background: 'var(--bg)' }}>
    <Navbar isAuthenticated={isAuthenticated} user={user} theme={theme} onThemeToggle={onThemeToggle}
      onSignOut={onSignOut} onSignInClick={onSignInClick} onSidebarToggle={() => setMobileOpen(true)}/>
    <div className="flex min-h-screen">
      <Sidebar isAuthenticated={isAuthenticated} user={user} onSignOut={onSignOut} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)}/>
      <main className="min-w-0 flex-1 px-4 pb-20 pt-32 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div><div className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>FINLINGO ACADEMY</div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">My learning progress</h1>
              <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>Your completed lessons, learning streak and next steps, updated from your account.</p>
            </div>
            <button type="button" onClick={() => navigate('/learn')} className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}><BookOpen size={17}/> Browse courses</button>
          </div>
          {loading ? <div className="rounded-xl p-6 text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} role="status">Loading your learning history…</div>
            : error ? <div className="rounded-xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} role="alert"><div className="flex items-center gap-2 font-semibold"><CircleAlert size={18}/> Progress unavailable</div><p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p><button type="button" onClick={retry} className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold" style={{ border: '1px solid var(--border)' }}><RefreshCw size={15}/> Retry</button></div>
            : progress && <>
                <ProgressDashboard progress={progress} loading={false} error={null} onContinue={openLesson}/>
                <section aria-label="Progress by learning path">
                  <h2 className="mb-5 text-xl font-bold">Course breakdown</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {LEARNING_PATHS.map((path) => <div key={path.id} className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <div className="mb-2 flex items-center justify-between gap-2"><span className="text-sm font-semibold">{path.name}</span><span className="text-sm font-bold">{progress.pathProgress?.[path.id] ?? 0}%</span></div>
                      <div role="progressbar" aria-label={`${path.name} complete`} aria-valuenow={progress.pathProgress?.[path.id] ?? 0} aria-valuemin={0} aria-valuemax={100} className="mb-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-elevated)' }}><div className="h-full rounded-full" style={{ width: `${progress.pathProgress?.[path.id] ?? 0}%`, background: path.color }}/></div>
                      <div className="mb-4 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}><CheckCircle2 size={14}/>{path.topics.length} lessons in this track</div>
                      <button type="button" className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--primary)' }} onClick={() => navigate(`/learn?path=${encodeURIComponent(path.id)}`)}>Open course <ArrowRight size={15}/></button>
                    </div>)}
                  </div>
                </section>
              </>}
        </div>
      </main>
    </div>
  </div>
}
