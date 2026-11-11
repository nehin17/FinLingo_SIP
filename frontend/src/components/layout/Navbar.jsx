
// src/components/layout/Navbar.jsx

import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart2,
  Search,
  Menu,
  ChevronDown,
  Flame,
  User,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'

import SearchBar from '../shared/SearchBar.jsx'
import { learningService } from '../../services/learningService.js'

const navLinks = [
  { label: 'Markets', href: '/markets' },
  { label: 'Research', href: '/dashboard' },
  { label: 'Battle Mode', href: '/battle' },
  { label: 'Learn', href: '/learn' },
]

// ============================================================
// USER INITIALS
// ============================================================

function getInitials(name) {
  if (!name) return 'U'

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

// A calendar day counts only when a signed-in learner completes a lesson
// or submits a practice question. Numbers always come from /api/learn/streak.
const EMPTY_STREAK = { currentStreak: 0, bestStreak: 0, lastActiveDate: null, todayCompleted: false }

function readableActivityDate(isoDate) {
  if (!isoDate) return 'No activity yet'
  const local = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(local.valueOf())) return '—'
  const today = new Date()
  const dayKey = (date) => [date.getFullYear(), date.getMonth(), date.getDate()].join('-')
  if (dayKey(today) === dayKey(local)) return 'Today'
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 12)
  if (dayKey(yesterday) === dayKey(local)) return 'Yesterday'
  return local.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ============================================================
// STREAK BUTTON
// ============================================================

function StreakButton({
  isAuthenticated,
  streak,
  streakStatus,
  onSignInClick,
  onSignUpClick,
  onRetryStreak,
  compact = false,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return

    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)

    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const hasData = isAuthenticated && streakStatus === 'ready'
  const encouragement = !hasData
    ? 'Learning activity is not available yet'
    : streak.currentStreak >= 30
      ? 'Elite consistency'
      : streak.currentStreak >= 10
        ? "You're on fire"
        : streak.currentStreak >= 5
          ? "You're on a great run"
          : streak.currentStreak > 0 ? 'Keep it going' : 'Begin with one lesson or practice question'

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={
          isAuthenticated
            ? hasData ? `${streak.currentStreak} day streak — view details` : 'Learning streak unavailable — view details'
            : 'Streak — sign in to start tracking'
        }
        className={`flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 ${
          compact ? 'w-10 h-10' : isAuthenticated ? 'px-2 h-10' : 'w-10 h-10'
        }`}
        style={{
          background: 'transparent',
          border: 'none',
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
          style={{
            background: 'rgba(249, 115, 22, 0.10)',
            border: '1.5px solid rgba(249, 115, 22, 0.28)',
            boxShadow: open
              ? '0 0 0 4px rgba(249, 115, 22, 0.10), 0 6px 16px rgba(249, 115, 22, 0.18)'
              : '0 4px 12px rgba(249, 115, 22, 0.12)',
          }}
        >
          <Flame size={20} style={{ color: '#FB923C' }} />
        </div>

        {!compact && hasData && (
          <span
            className="text-sm font-bold whitespace-nowrap"
            style={{ color: '#FB923C' }}
          >
            {streak.currentStreak}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`absolute right-0 top-full mt-3 rounded-2xl border p-5 z-[60] ${
              isAuthenticated ? 'w-72' : 'w-80'
            }`}
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
            }}
          >
            {isAuthenticated ? !hasData ? (
              <div className="space-y-3">
                <p className="text-base font-bold" style={{ color: 'var(--text)' }}>
                  {streakStatus === 'loading' ? 'Loading your activity…' : 'Streak unavailable'}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {streakStatus === 'loading'
                    ? 'Checking your completed lessons and practice history.'
                    : 'FINLINGO could not confirm your learning activity. No streak is shown until the service responds.'}
                </p>
                {streakStatus === 'error' && <button type="button" onClick={() => { setOpen(false); onRetryStreak?.() }}
                  className="rounded-lg border px-4 py-2 text-sm font-semibold"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Retry</button>}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3.5 mb-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(249, 115, 22, 0.12)' }}
                  >
                    <Flame size={20} style={{ color: '#FB923C' }} />
                  </div>

                  <div>
                    <p
                      className="text-base font-bold leading-snug"
                      style={{ color: 'var(--text)' }}
                    >
                      {streak.currentStreak === 0 ? 'No active streak yet' : streak.currentStreak === 1 ? '1-day streak' : `${streak.currentStreak}-day streak`}
                    </p>

                    <p
                      className="text-sm"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {encouragement}
                    </p>
                  </div>
                </div>

                <div
                  className="space-y-2.5 pt-4"
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--text-muted)' }}>
                      Today's learning
                    </span>

                    <span
                      className="font-semibold"
                      style={{
                        color: streak.todayCompleted
                          ? '#16A34A'
                          : 'var(--text-muted)',
                      }}
                    >
                      {streak.todayCompleted ? '✓ Done' : 'Not yet'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--text-muted)' }}>
                      Last active
                    </span>

                    <span
                      className="font-semibold"
                      style={{ color: 'var(--text)' }}
                    >
                      {readableActivityDate(streak.lastActiveDate)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--text-muted)' }}>
                      Best streak
                    </span>

                    <span
                      className="font-semibold"
                      style={{ color: 'var(--text)' }}
                    >
                      {streak.bestStreak} days
                    </span>
                  </div>
                  <p className="mt-4 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Complete a lesson or submit a practice answer to count today. Opening pages alone does not count.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(249, 115, 22, 0.12)' }}
                  >
                    <Flame size={20} style={{ color: '#FB923C' }} />
                  </div>

                  <div>
                    <p
                      className="text-base font-bold mb-1 leading-snug"
                      style={{ color: 'var(--text)' }}
                    >
                      Keep your learning streak alive
                    </p>

                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Complete lessons or answer practice questions to build a genuine daily learning streak.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5 mt-5">
                  <button
                    onClick={() => {
                      setOpen(false)
                      onSignInClick?.()
                    }}
                    className="flex-1 h-11 rounded-xl border text-sm font-semibold transition-colors"
                    style={{
                      borderColor: 'var(--border)',
                      color: 'var(--text-muted)',
                      background: 'transparent',
                    }}
                  >
                    Sign in
                  </button>

                  <button
                    onClick={() => {
                      setOpen(false)
                      onSignUpClick?.()
                    }}
                    className="flex-1 h-11 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{
                      background:
                        'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
                    }}
                  >
                    Create account
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// NAVBAR
// ============================================================

export default function Navbar({
  isAuthenticated,
  user,
  onSignInClick,
  onSignUpClick,
  onSignOut,
  theme = 'light',
  onThemeToggle,
  onSidebarToggle,
}) {
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [streakState, setStreakState] = useState({ status: 'loading', data: null })
  const [streakReload, setStreakReload] = useState(0)

  // The navbar appears on every page, so it loads the real account streak itself.
  // Every successful completion / practice submission triggers an immediate refresh.
  useEffect(() => {
    if (!isAuthenticated) {
      setStreakState({ status: 'guest', data: null })
      return undefined
    }
    let cancelled = false
    const reload = async () => {
      try {
        const data = await learningService.streak()
        if (!cancelled) setStreakState({ status: 'ready', data })
      } catch {
        if (!cancelled) setStreakState({ status: 'error', data: null })
      }
    }
    setStreakState({ status: 'loading', data: null })
    reload()
    const refreshIfVisible = () => { if (document.visibilityState === 'visible') reload() }
    window.addEventListener('finlingo:learning-activity', reload)
    window.addEventListener('focus', reload)
    document.addEventListener('visibilitychange', refreshIfVisible)
    return () => {
      cancelled = true
      window.removeEventListener('finlingo:learning-activity', reload)
      window.removeEventListener('focus', reload)
      document.removeEventListener('visibilitychange', refreshIfVisible)
    }
  }, [isAuthenticated, user?.email, streakReload])

  const streak = streakState.data || EMPTY_STREAK
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const headerBg =
    theme === 'dark'
      ? scrolled
        ? 'rgba(11, 18, 32, 0.92)'
        : 'rgba(11, 18, 32, 0.78)'
      : scrolled
        ? 'rgba(255, 255, 255, 0.92)'
        : 'rgba(255, 255, 255, 0.78)'

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-20 sm:h-24"
      style={{
        background: headerBg,
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        boxShadow: scrolled
          ? '0 4px 24px rgba(15, 23, 42, 0.08)'
          : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full gap-4">
          {/* Logo */}

          <Link to="/" className="flex items-center gap-3.5 shrink-0">
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-md shrink-0"
              style={{
                background:
                  'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
              }}
            >
              <BarChart2 size={24} className="text-white" />
            </div>

            <span
              className="text-xl sm:text-2xl font-bold tracking-tight"
              style={{ color: 'var(--text)' }}
            >
              FinLingo
            </span>
          </Link>

          {/* Desktop Nav */}

          <nav className="hidden lg:flex items-center gap-2 flex-1 justify-center">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href

              return (
                <Link
                  key={link.label}
                  to={link.href}
                  className="px-5 py-3 rounded-xl text-lg font-semibold transition-all duration-200 whitespace-nowrap"
                  style={{
                    color: isActive
                      ? 'var(--primary)'
                      : 'var(--text-muted)',
                    background: isActive
                      ? 'rgba(37, 99, 235, 0.10)'
                      : 'transparent',
                  }}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Desktop Right Side */}

          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {/* Search */}

            <div className="relative">
              <button
                onClick={() => setSearchOpen((prev) => !prev)}
                className="w-12 h-12 rounded-xl border flex items-center justify-center transition-all duration-200"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-muted)',
                }}
                aria-label="Search"
              >
                <Search size={22} />
              </button>

              <AnimatePresence>
                {searchOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-3 w-96 z-[60]"
                  >
                    <SearchBar className="w-full" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}

            <button
              onClick={onThemeToggle}
              className="w-12 h-12 rounded-xl border flex items-center justify-center transition-all duration-200"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
            </button>

            {/* Streak */}

            <StreakButton
              isAuthenticated={isAuthenticated}
              streak={streak}
              streakStatus={streakState.status}
              onRetryStreak={() => setStreakReload((value) => value + 1)}
              onSignInClick={onSignInClick}
              onSignUpClick={onSignUpClick}
            />

            {/* User Menu */}

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-3 px-4 h-12 rounded-xl border transition-colors"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(37, 99, 235, 0.12)' }}
                  >
                    {user?.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.displayName || user.name || 'Profile'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span
                        className="text-sm font-bold leading-none select-none"
                        style={{ color: 'var(--primary)' }}
                      >
                        {getInitials(user?.displayName || user?.name)}
                      </span>
                    )}
                  </div>

                  <span
                    className="text-base font-semibold truncate max-w-[140px]"
                    style={{ color: 'var(--text)' }}
                  >
                    {user?.displayName || user?.name || 'Account'}
                  </span>

                  <ChevronDown
                    size={18}
                    style={{ color: 'var(--text-muted)' }}
                  />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-3 w-64 rounded-2xl border overflow-hidden z-[60]"
                      style={{
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
                        boxShadow: 'var(--shadow-md)',
                      }}
                    >
                      <div
                        className="p-4 border-b"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: 'var(--text)' }}
                        >
                          {user?.displayName || user?.name || 'Account'}
                        </p>

                        {user?.email && (
                          <p
                            className="text-xs truncate mt-1"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {user.email}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          onSignOut()
                          setUserMenuOpen(false)
                        }}
                        className="flex items-center gap-3 w-full px-5 py-3.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                        style={{ color: 'var(--error)' }}
                      >
                        <LogOut size={18} />
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <button
                  onClick={onSignInClick}
                  className="text-base font-semibold transition-colors px-5 h-12 rounded-xl whitespace-nowrap"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Sign In
                </button>

                <button
                  onClick={onSignUpClick}
                  className="px-6 h-12 rounded-xl text-base font-semibold text-white whitespace-nowrap transition-all"
                  style={{
                    background:
                      'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
                  }}
                >
                  Create Account
                </button>
              </>
            )}
          </div>

          {/* Mobile Right Side */}

          <div className="flex lg:hidden items-center gap-2 shrink-0">
            <StreakButton
              compact
              isAuthenticated={isAuthenticated}
              streak={streak}
              streakStatus={streakState.status}
              onRetryStreak={() => setStreakReload((value) => value + 1)}
              onSignInClick={onSignInClick}
              onSignUpClick={onSignUpClick}
            />

            <button
              className="w-12 h-12 rounded-xl border flex items-center justify-center transition-colors"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
              }}
              onClick={onSidebarToggle}
              aria-label="Toggle menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

