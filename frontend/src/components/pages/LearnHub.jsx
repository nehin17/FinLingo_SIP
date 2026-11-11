import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

import Sidebar from '../layout/Sidebar.jsx'
import Navbar from '../layout/Navbar.jsx'
import LearnHero from '../learn/LearnHero.jsx'
import ProgressDashboard from '../learn/ProgressDashboard.jsx'
import LearningPaths from '../learn/LearningPaths.jsx'
import LessonWorkspace from '../learn/LessonWorkspace.jsx'
import FeaturedCaseStudies from '../learn/FeaturedCaseStudies.jsx'
import MiniAnalystChallenge from '../learn/MiniAnalystChallenge.jsx'
import InteractiveTools from '../learn/InteractiveTools.jsx'
import ConceptLibrary from '../learn/ConceptLibrary.jsx'
import { learningService } from '../../services/learningService.js'
import { buildLearningProgress } from '../../data/learningCurriculum.js'

export default function LearnHub({ isAuthenticated = false, user, theme, onThemeToggle, onSignInClick, onSignUpClick, onSignOut }) {
  const { logout } = useAuth()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const pathId = searchParams.get('path')
  const lessonId = searchParams.get('lesson')
  const canSave = Boolean(isAuthenticated && progress && !loading && !error)

  const refreshProgress = useCallback(() => setReloadToken((value) => value + 1), [])
  const reconnect = async () => {
    // A JWT signed with a previous backend secret cannot be repaired client-side.
    await logout()
    setProgress(null)
    setError(null)
    onSignInClick?.()
  }
  useEffect(() => {
    if (!isAuthenticated) { setProgress(null); setError(null); setLoading(false); return undefined }
    let cancelled = false
    setLoading(true)
    setError(null)
    learningService.progress().then((data) => {
      if (!cancelled) setProgress(buildLearningProgress(data))
    }).catch(async (err) => {
      if (cancelled) return
      setProgress(null)
      if (err.status === 401 || err.status === 403) {
        const valid = await learningService.verifySession()
        if (cancelled) return
        setError(valid
          ? { kind: 'service', message: 'The learning API is not accepting this request. Restart the updated backend, then retry.' }
          : { kind: 'session', message: 'Your sign-in session has expired. Sign in again to sync your learning.' })
      } else {
        setError({ kind: 'service', message: err.message || 'Unable to reach the learning service.' })
      }
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isAuthenticated, user?.email, reloadToken])

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
  const openPath = (id) => { setSearchParams(id ? { path: id } : {}); scrollTop() }
  const openLesson = (id) => { setSaveError(''); setSearchParams(id ? { path: pathId, lesson: id } : { path: pathId }); scrollTop() }
  const continueLesson = () => {
    const lesson = progress?.nextLesson
    if (lesson) { setSearchParams({ path: lesson.pathId, lesson: lesson.lessonId }); scrollTop() }
    else document.getElementById('learning-paths')?.scrollIntoView({ behavior: 'smooth' })
  }
  const toggleLesson = async (id, completed) => {
    if (!canSave || saving) return
    setSaving(true)
    setSaveError('')
    try {
      const nextProgress = completed ? await learningService.complete(id) : await learningService.uncomplete(id)
      setProgress(buildLearningProgress(nextProgress))
    } catch (err) {
      setSaveError('This lesson was not saved. Check the account connection and try again.')
      refreshProgress()
    } finally { setSaving(false) }
  }

  return <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
    <Navbar isAuthenticated={isAuthenticated} user={user} theme={theme} onThemeToggle={onThemeToggle} onSignInClick={onSignInClick} onSignUpClick={onSignUpClick} onSignOut={onSignOut} onSidebarToggle={() => setMobileSidebarOpen(true)} />
    <div className="flex w-full">
      <Sidebar user={user} isAuthenticated={isAuthenticated} onSignInClick={onSignInClick} onSignOut={onSignOut}
        mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} onAccountNavigate={() => setMobileSidebarOpen(false)} />
      <main className="min-h-screen min-w-0 flex-1 pt-20 transition-all duration-300 sm:pt-24">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {pathId ? <LessonWorkspace pathId={pathId} lessonId={lessonId} isAuthenticated={isAuthenticated} canSave={canSave} progress={progress}
            onBack={() => openPath(null)} onOpenLesson={openLesson} onSignInClick={onSignInClick} onReconnect={reconnect}
            onToggle={toggleLesson} saving={saving} error={saveError} /> : <>
            <LearnHero isAuthenticated={isAuthenticated} progress={progress} onSignInClick={onSignInClick} onSignUpClick={onSignUpClick} onContinue={continueLesson} onExplore={() => document.getElementById('learning-paths')?.scrollIntoView({ behavior: 'smooth' })} />
            {isAuthenticated && <ProgressDashboard progress={progress} loading={loading} error={error} onRetry={refreshProgress} onReconnect={reconnect} onContinue={continueLesson} />}
            <LearningPaths progress={canSave ? progress : null} onOpenPath={openPath} />
            <FeaturedCaseStudies />
            <div className="mt-14"><MiniAnalystChallenge isAuthenticated={isAuthenticated} canSave={canSave} onSignInClick={onSignInClick} onAttemptSaved={refreshProgress}/></div>
            <div className="mt-14"><InteractiveTools /></div>
            <div className="mt-14"><ConceptLibrary /></div>
          </>}
        </div>
      </main>
    </div>
  </div>
}
