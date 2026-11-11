import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight, BookOpen, Brain, Camera, Check, CircleAlert,
  ClipboardList, Flame, Focus, GraduationCap, Loader2, LockKeyhole,
  LogOut, RefreshCw, ScanSearch, Settings2, ShieldCheck,
  Sparkles, Star,
} from 'lucide-react'
import Navbar from '../layout/Navbar.jsx'
import Sidebar from '../layout/Sidebar.jsx'
import GrowthTree from '../profile/GrowthTree.jsx'
import ProfileInsights from '../profile/ProfileInsights.jsx'
import { accountSettingsService } from '../../services/accountSettingsService.js'
import { uploadAccountAvatar } from '../../services/accountAvatarService.js'
import { profileWorkspaceService } from '../../services/profileWorkspaceService.js'
import { learningService } from '../../services/learningService.js'
import { api } from '../../services/api.js'
import './ProfileWorkspace.css'
import './ProfileDashboard.css'

const FOCUS_MODES = [
  { id: 'research', title: 'Deep Research', sub: 'Analysing company fundamentals', color: '#2563eb' },
  { id: 'scanning', title: 'Market Scan', sub: 'Following market developments', color: '#0f8fb5' },
  { id: 'learning', title: 'Learning', sub: 'Studying finance concepts', color: '#7c5fe2' },
  { id: 'focus', title: 'Focus Session', sub: 'Uninterrupted research time', color: '#0b996a' },
  { id: 'offline', title: 'Sleep', sub: 'Stepping away and recharging', color: '#74839a' },
]

const initialFor = (value) => String(value || 'F').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}
const readableError = (error, fallback) => error?.message || fallback

function FocusGlyph({ modeId, size = 18, strokeWidth = 2.1 }) {
  if (modeId === 'research') return <Brain size={size} strokeWidth={strokeWidth}/>
  if (modeId === 'scanning') return <ScanSearch size={size} strokeWidth={strokeWidth}/>
  if (modeId === 'learning') return <GraduationCap size={size} strokeWidth={strokeWidth}/>
  if (modeId === 'focus') return <Focus size={size} strokeWidth={strokeWidth}/>
  if (modeId === 'offline') return <span className="pg-sleep-glyph" aria-hidden="true">Zz</span>
  return <Brain size={size} strokeWidth={strokeWidth}/>
}

function FocusOrb({ modeId, busy }) {
  return <span className={`pg-brain-visual pg-brain-visual-${modeId}`} aria-hidden="true">
    <span className="pg-brain-halo pg-brain-halo-a"/>
    <span className="pg-brain-halo pg-brain-halo-b"/>
    <span className="pg-brain-shell"/>
    <span className="pg-brain-core">{busy ? <Loader2 size={20} className="pg-spin"/> : <FocusGlyph modeId={modeId} size={modeId === 'offline' ? 16 : 20} strokeWidth={2.25}/>}</span>
    <span className="pg-brain-pulse pg-brain-pulse-a"/>
    <span className="pg-brain-pulse pg-brain-pulse-b"/>
    {modeId === 'research' && <><span className="pg-brain-dash pg-brain-dash-a"/><span className="pg-brain-dash pg-brain-dash-b"/></>}
    {modeId === 'scanning' && <><span className="pg-brain-ring pg-brain-ring-a"/><span className="pg-brain-ring pg-brain-ring-b"/><span className="pg-brain-twinkle pg-brain-twinkle-a"/><span className="pg-brain-twinkle pg-brain-twinkle-b"/><span className="pg-brain-scan-sweep"/></>}
    {modeId === 'learning' && <><span className="pg-brain-spark pg-brain-spark-a"/><span className="pg-brain-spark pg-brain-spark-b"/><span className="pg-brain-learn-arc"/></>}
    {modeId === 'focus' && <><span className="pg-brain-focus-corner pg-brain-focus-corner-tl"/><span className="pg-brain-focus-corner pg-brain-focus-corner-tr"/><span className="pg-brain-focus-corner pg-brain-focus-corner-bl"/><span className="pg-brain-focus-corner pg-brain-focus-corner-br"/><span className="pg-brain-focus-beam"/><span className="pg-brain-focus-coredot"/></>}
    {modeId === 'offline' && <span className="pg-brain-floating-zzz">Zz</span>}
  </span>
}

function BrainFocusPicker({ value, loaded, busy, notice, onChange, reducedMotion }) {
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const selected = FOCUS_MODES.find((mode) => mode.id === value) || FOCUS_MODES[0]

  useEffect(() => {
    if (!open) return undefined
    const dismiss = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const keydown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', keydown)
    }
  }, [open])

  const select = async (id) => {
    if (busy) return
    if (id === value && loaded) { setOpen(false); return }
    const ok = await onChange(id)
    if (ok) setOpen(false)
  }

  const animation = busy || reducedMotion ? undefined
    : value === 'research' ? { rotate: [-4, 4, -4], y: [0, -1.5, 0] }
      : value === 'scanning' ? { scale: [1, 1.04, 1], rotate: [0, 5, 0] }
        : value === 'learning' ? { y: [0, -3, 0], scale: [1, 1.03, 1] }
          : value === 'focus' ? { scale: [1, 1.06, 1] }
            : { opacity: [1, 0.84, 1], y: [0, -1, 0] }

  return <div className="pg-brain-anchor" ref={rootRef}>
    <motion.button ref={triggerRef} type="button" className={`pg-brain-trigger pg-brain-trigger-${selected.id}`}
      style={{ '--pg-mode-color': selected.color }}
      whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.96 }}
      onClick={() => setOpen((previous) => !previous)}
      aria-label="Set workspace mode" aria-expanded={open} aria-haspopup="menu"
      title="Set workspace mode">
      <motion.span className="pg-brain-symbol" animate={animation} transition={{ duration: 2.15, ease: 'easeInOut', repeat: Infinity }}>
        <FocusOrb modeId={selected.id} busy={busy}/>
      </motion.span>
    </motion.button>
    <span className="pg-brain-tooltip" aria-hidden="true">Set workspace mode</span>
    <AnimatePresence>
      {open && <motion.div className="pg-brain-menu" role="menu" aria-label="Workspace mode"
        initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }} transition={{ duration: 0.18 }}>
        <div className="pg-brain-heading"><strong>Workspace mode</strong><span>Choose how you want FINLINGO to feel right now.</span></div>
        <div className="pg-brain-options">
          {FOCUS_MODES.map((mode) => <button type="button" key={mode.id} role="menuitemradio"
            aria-checked={loaded && value === mode.id} disabled={busy}
            className={`pg-brain-option ${loaded && value === mode.id ? 'pg-brain-selected' : ''}`}
            style={{ '--pg-option-color': mode.color }}
            onClick={() => select(mode.id)}>
            <span className="pg-brain-choice-icon" style={{ color: mode.color }}><FocusGlyph modeId={mode.id} size={mode.id === 'offline' ? 14 : 16}/></span>
            <span className="pg-brain-choice-copy"><strong>{mode.title}</strong><small>{mode.sub}</small></span>
            {loaded && value === mode.id && <Check size={16} className="pg-brain-choice-check"/>}
          </button>)}
        </div>
        {!loaded && !notice && <div className="pg-brain-message">Choose a mode to sync your preference.</div>}
        {notice && <p className={`pg-brain-message ${loaded && notice.startsWith('Your focus') ? 'pg-brain-success' : 'pg-brain-error'}`} role="status">{notice}</p>}
      </motion.div>}
    </AnimatePresence>
  </div>
}

function ProfileTile({ icon: Icon, value, label, sub, onClick }) {
  return <button type="button" onClick={onClick} className="pg-stat-card">
    <div className="pg-stat-topline"><div className="pg-stat-icon"><Icon size={18}/></div><ArrowRight className="pg-stat-arrow" size={15} aria-hidden="true" /></div>
    <div className="pg-stat-number">{value == null ? '—' : value}</div>
    <div className="pg-stat-label">{label}</div>
    <p>{sub}</p>
  </button>
}

function WorkspaceShortcut({ icon: Icon, title, copy, action, onClick }) {
  return <button type="button" onClick={onClick} className="pg-workspace-card">
    <span className="pg-workspace-icon"><Icon size={18}/></span>
    <span className="pg-workspace-body"><strong>{title}</strong><small>{copy}</small></span>
    <span className="pg-workspace-cta">{action}<ArrowRight size={16}/></span>
  </button>
}

export default function Profile({
  user, isAuthenticated = false, theme, onThemeToggle, onSignInClick,
  onSignUpClick, onSignOut, navbarProps, sidebarProps,
}) {
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [account, setAccount] = useState(null)
  const [focusMode, setFocusMode] = useState('research')
  const [focusLoaded, setFocusLoaded] = useState(false)
  const [focusBusy, setFocusBusy] = useState(false)
  const [focusNotice, setFocusNotice] = useState('')
  const [learning, setLearning] = useState(null)
  const [streak, setStreak] = useState(null)
  const [watchlist, setWatchlist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fatalError, setFatalError] = useState('')
  const [dataNotice, setDataNotice] = useState('')
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const fileRef = useRef(null)

  const reload = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    setLoading(true)
    setFatalError('')
    setDataNotice('')
    setFocusNotice('')
    const [accountResult, focusResult, learningResult, streakResult, watchResult] = await Promise.allSettled([
      accountSettingsService.get(), profileWorkspaceService.getStatus(),
      learningService.progress(), profileWorkspaceService.getLearningStreak(), api.watchlist.getAll(),
    ])
    if (accountResult.status === 'fulfilled') setAccount(accountResult.value)
    else setFatalError(readableError(accountResult.reason, 'Could not load account details.'))

    if (focusResult.status === 'fulfilled') {
      setFocusMode(focusResult.value?.status || 'research')
      setFocusLoaded(true)
    } else {
      setFocusLoaded(false)
      setFocusNotice(readableError(focusResult.reason, 'Could not load your focus preference.'))
    }
    if (learningResult.status === 'fulfilled') setLearning(learningResult.value)
    else setLearning(null)

    if (streakResult.status === 'fulfilled') setStreak(streakResult.value?.currentStreak ?? streakResult.value?.streakDays ?? null)
    else if (learningResult.status === 'fulfilled') setStreak(learningResult.value?.streakDays ?? null)
    else setStreak(null)

    if (watchResult.status === 'fulfilled') {
      const records = watchResult.value
      setWatchlist(Array.isArray(records) ? records : Array.isArray(records?.items) ? records.items : null)
    } else setWatchlist(null)
    if (learningResult.status === 'rejected' || watchResult.status === 'rejected') {
      setDataNotice('Some saved activity could not be loaded. Any unavailable values are shown as a dash.')
    }
    setLoading(false)
  }, [isAuthenticated])

  useEffect(() => { reload() }, [reload])

  const setFocus = async (nextMode) => {
    if (focusBusy) return false
    if (nextMode === focusMode && focusLoaded) return true
    setFocusBusy(true)
    setFocusNotice('')
    try {
      const saved = await profileWorkspaceService.setStatus(nextMode)
      setFocusMode(saved.status)
      setFocusLoaded(true)
      setFocusNotice('Your focus preference has been saved.')
      return true
    } catch (error) {
      setFocusNotice(readableError(error, 'Could not save your focus.'))
      return false
    } finally { setFocusBusy(false) }
  }

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setAvatarBusy(true)
    setAvatarError('')
    try {
      const result = await uploadAccountAvatar(file)
      const image = result?.avatarUrl
      if (!image) throw new Error('Could not confirm the updated photo.')
      setAccount((previous) => ({ ...previous, profilePicture: image }))
      window.dispatchEvent(new Event('finlingo:avatar-updated'))
    } catch (error) { setAvatarError(readableError(error, 'Photo upload failed.')) }
    finally { setAvatarBusy(false) }
  }

  const name = account?.displayName || user?.displayName || user?.name || 'Your profile'
  const email = account?.email || user?.email || ''
  const avatar = account?.profilePicture || user?.profilePicture || user?.avatarUrl || ''
  const completed = Array.isArray(learning?.completedLessonIds) ? learning.completedLessonIds.length : null
  const attempts = Number.isFinite(learning?.challengeAttempts) ? learning.challengeAttempts : null
  const focus = FOCUS_MODES.find((mode) => mode.id === focusMode) || FOCUS_MODES[0]

  const resolvedNavbarProps = navbarProps || { isAuthenticated, user, theme, onThemeToggle, onSignInClick, onSignUpClick, onSignOut }
  const resolvedSidebarProps = sidebarProps || { isAuthenticated, user, mobileOpen: mobileSidebarOpen, onMobileClose: () => setMobileSidebarOpen(false), onSignInClick, onSignOut }

  return <div className="pg-root" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
    <Navbar {...resolvedNavbarProps} onSidebarToggle={() => setMobileSidebarOpen(true)}/>
    <div className="pg-shell">
      <Sidebar {...resolvedSidebarProps}/>
      <main className="pg-main">
        {!isAuthenticated ? <section className="pg-guest pg-panel">
          <div className="pg-guest-icon"><LockKeyhole size={25}/></div>
          <h1>Your private research profile</h1>
          <p>Sign in to manage your photo, workspace mode, and saved learning milestones.</p>
          <div className="pg-guest-buttons"><button type="button" className="pg-button-primary" onClick={onSignInClick}>Sign in</button><button type="button" className="pg-button-secondary" onClick={onSignUpClick}>Create account</button></div>
        </section> : <div className="pg-container">
          <header className="pg-page-header">
            <div><div className="pg-overline">FINLINGO ACCOUNT</div><h1>Your profile</h1><p>A clean view of your learning progress, saved research, and account workspace.</p></div>
            <button type="button" className="pg-button-secondary" onClick={() => navigate('/settings')}><Settings2 size={16}/> Account settings</button>
          </header>
          {loading ? <div className="pg-load pg-panel"><Loader2 className="pg-spin" size={20}/> Loading your profile…</div> : fatalError ?
            <div className="pg-load pg-panel" role="alert"><CircleAlert size={19}/><span>{fatalError}</span><button type="button" onClick={reload} className="pg-button-secondary"><RefreshCw size={15}/> Retry</button></div>
            : <div className="pg-columns">
              <div className="pg-left-col">
                <motion.section className="pg-identity-card pg-panel" initial={reducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="pg-avatar-wrap">
                    <div className="pg-avatar-stack">
                      <div className="pg-avatar">{avatar ? <img src={avatar} alt="Your profile"/> : <span>{initialFor(name)}</span>}</div>
                      <BrainFocusPicker value={focusMode} loaded={focusLoaded} busy={focusBusy} notice={focusNotice} onChange={setFocus} reducedMotion={reducedMotion}/>
                    </div>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={uploadPhoto}/>
                    <button type="button" className="pg-photo-link" onClick={() => fileRef.current?.click()} disabled={avatarBusy}>
                      {avatarBusy ? <Loader2 className="pg-spin" size={15}/> : <Camera size={15}/>} {avatarBusy ? 'Updating…' : 'Change photo'}
                    </button>
                  </div>
                  {avatarError && <p className="pg-field-error" role="alert">{avatarError}</p>}
                  <h2>{name}</h2><p className="pg-identity-email">{email}</p>
                  <div className="pg-cognitive-badge" style={{ '--pg-focus-accent': focus.color }}>
                    <span className="pg-cognitive-glyph"><FocusGlyph modeId={focus.id} size={focus.id === 'offline' ? 13 : 15}/></span>
                    {focusLoaded ? focus.title : 'Focus unavailable'}
                  </div>
                  {account?.createdAt && <p className="pg-member-since">Member since {formatDate(account.createdAt)}</p>}
                  <div className="pg-identity-actions"><button type="button" className="pg-button-primary" onClick={() => navigate('/settings?section=personal')}>Edit profile <ArrowRight size={16}/></button></div>
                </motion.section>
                <GrowthTree completed={completed} total={31} streak={streak}/>
              </div>

              <div className="pg-right-col">
                <section className="pg-panel pg-overview-card">
                  <div className="pg-card-heading"><div><div className="pg-overline">ACCOUNT ACTIVITY</div><h2>Your overview</h2><p>Your recorded learning and research, at a glance.</p></div><div className="pg-heading-actions"><span className={`pg-sync-pill ${learning && watchlist && streak != null ? '' : 'pg2-sync-partial'}`}>{learning && watchlist && streak != null ? 'Synced' : 'Partial data'}</span><button type="button" className="pg-icon-button" onClick={reload} aria-label="Refresh profile data" title="Refresh data"><RefreshCw size={17}/></button></div></div>
                  <div className="pg-stat-grid">
                    <ProfileTile icon={BookOpen} value={completed} label="Lessons completed" sub="Out of 31 lessons" onClick={() => navigate('/progress')}/>
                    <ProfileTile icon={ClipboardList} value={attempts} label="Practice attempts" sub="Answered and submitted" onClick={() => navigate('/learn')}/>
                    <ProfileTile icon={Star} value={watchlist?.length ?? null} label="Saved companies" sub="Companies in watchlist" onClick={() => navigate('/watchlist')}/>
                    <ProfileTile icon={Flame} value={streak == null ? null : `${streak}d`} label="Learning streak" sub="Consecutive active days" onClick={() => navigate('/progress')}/>
                  </div>
                  {dataNotice && <div className="pg-inline-notice" role="status"><CircleAlert size={15}/>{dataNotice}</div>}
                </section>

                <ProfileInsights
                  completedLessonIds={Array.isArray(learning?.completedLessonIds) ? learning.completedLessonIds : null}
                  challengeAttempts={Number.isFinite(learning?.challengeAttempts) ? learning.challengeAttempts : null}
                  savedCompanies={Array.isArray(watchlist) ? watchlist.length : null}
                  onOpenLesson={(lesson) => navigate(`/learn?path=${encodeURIComponent(lesson.pathId)}&lesson=${encodeURIComponent(lesson.id)}`)}
                  onOpenProgress={() => navigate('/progress')}
                />

                <section className="pg-panel pg-next-panel">
                  <div className="pg-card-heading"><div><div className="pg-overline">QUICK ACCESS</div><h2>Your workspace</h2><p>Everything you need to continue your analysis.</p></div><Sparkles size={20} className="pg-heading-icon"/></div>
                  <div className="pg-workspace-grid">
                    <WorkspaceShortcut icon={GraduationCap} title="Learning progress" copy="Resume lessons, revise your completed concepts, and stay on track." action="Open" onClick={() => navigate('/progress')}/>
                    <WorkspaceShortcut icon={Star} title="Research watchlist" copy="Review companies, thesis notes, and upcoming names to revisit." action="Review" onClick={() => navigate('/watchlist')}/>
                    <WorkspaceShortcut icon={ShieldCheck} title="Account & security" copy="Manage personal information, password settings, and preferences." action="Manage" onClick={() => navigate('/settings')}/>
                  </div>
                </section>

                <section className="pg-panel pg2-session-panel" aria-label="Account session">
                  <div className="pg2-session-intro"><div className="pg2-session-icon"><ShieldCheck size={19}/></div>
                    <div><h2>Account session</h2><p>You're signed in. Your saved work stays in your account when you leave.</p></div>
                  </div>
                  <button type="button" className="pg-signout-button" onClick={onSignOut}><LogOut size={16}/> Sign out</button>
                </section>
              </div>
            </div>}
        </div>}
      </main>
    </div>
  </div>
}
