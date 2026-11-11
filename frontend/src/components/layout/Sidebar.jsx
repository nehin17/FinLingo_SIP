
// src/components/layout/Sidebar.jsx

import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Search,
  BookOpen,
  ChevronRight,
  Swords,
  TrendingUp,
  User,
  Settings,
  LogOut,
  X,
  Star,
} from 'lucide-react'

const accountMenu = [
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'progress', icon: TrendingUp, label: 'My Progress' },
  { id: 'watchlist', icon: Star, label: 'Watchlist' },
  { id: 'settings', icon: Settings, label: 'Settings' },
]

function getInitials(name) {
  if (!name) return 'U'

  return name
    .trim()
    .split(/\\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

function Avatar({ user, size = 32 }) {
  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: 'rgba(37, 99, 235, 0.12)',
      }}
    >
      {user?.profilePicture ? (
        <img
          src={user.profilePicture}
          alt={user.displayName || user.name || 'Profile'}
          className="w-full h-full object-cover"
        />
      ) : (
        <span
          className="font-semibold leading-none select-none"
          style={{
            color: 'var(--primary)',
            fontSize: size * 0.38,
          }}
        >
          {getInitials(user?.displayName || user?.name)}
        </span>
      )}
    </div>
  )
}

function AccountDropdown({
  user,
  onSignOut,
  onMenuItemClick,
  onClose,
  className,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.15 }}
      className={`rounded-xl border overflow-hidden z-30 ${className}`}
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-md)',
      }}
      role="menu"
    >
      <div
        className="p-3 border-b"
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
            className="text-xs truncate mt-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            {user.email}
          </p>
        )}
      </div>

      <div className="p-1">
        {accountMenu.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            role="menuitem"
            onClick={() => {
              onMenuItemClick?.(id)
              onClose?.()
            }}
            className="
              w-full flex items-center gap-3 px-3 py-2 rounded-lg
              text-sm transition-colors duration-150
              hover:bg-black/5 dark:hover:bg-white/10
            "
            style={{ color: 'var(--text)' }}
          >
            <Icon size={16} className="flex-shrink-0" />
            {label}
          </button>
        ))}

        <div
          className="my-1 border-t"
          style={{ borderColor: 'var(--border)' }}
        />

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onSignOut?.()
            onClose?.()
          }}
          className="
            w-full flex items-center gap-3 px-3 py-2 rounded-lg
            text-sm transition-colors duration-150
            hover:bg-black/5 dark:hover:bg-white/10
          "
          style={{ color: 'var(--error)' }}
        >
          <LogOut size={16} className="flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </motion.div>
  )
}

function AccountFooter({
  user,
  isAuthenticated,
  showLabel,
  profileOpen,
  onToggle,
  onSignInClick,
}) {
  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={onSignInClick}
        className="
          w-full rounded-xl p-3 border transition-all duration-200
          hover:border-primary/30 hover:bg-black/5 dark:hover:bg-white/10
        "
        style={{
          background: 'var(--surface-elevated)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(37, 99, 235, 0.12)' }}
          >
            <User size={16} style={{ color: 'var(--primary)' }} />
          </div>

          {showLabel && (
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--text)' }}
            >
              Sign in
            </span>
          )}
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={profileOpen}
      className="
        w-full rounded-xl p-3 border transition-all duration-200
        hover:border-primary/30 hover:bg-black/5 dark:hover:bg-white/10
      "
      style={{
        background: 'var(--surface-elevated)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center gap-3">
        <Avatar user={user} />

        {showLabel && (
          <>
            <span
              className="text-sm font-semibold flex-1 text-left"
              style={{ color: 'var(--text)' }}
            >
              Account
            </span>

            <ChevronRight
              size={14}
              className={`transition-transform duration-200 ${
                profileOpen ? 'rotate-90' : ''
              }`}
              style={{ color: 'var(--text-muted)' }}
            />
          </>
        )}
      </div>
    </button>
  )
}

export default function Sidebar({
  user,
  isAuthenticated = false,
  onSignInClick,
  onSignOut,
  mobileOpen = false,
  onMobileClose,
}) {
  const [expanded, setExpanded] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()

  // Sidebar navigation (Watchlist only when authenticated)
  const navItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: TrendingUp, label: 'Markets', href: '/markets' },
    { icon: Search, label: 'Research', href: '/dashboard' },
    { icon: Swords, label: 'Battle Mode', href: '/battle' },
    { icon: BookOpen, label: 'Learn', href: '/learn' },

    ...(isAuthenticated
      ? [{ icon: Star, label: 'Watchlist', href: '/watchlist' }]
      : []),
  ]

  useEffect(() => {
    setProfileOpen(false)
    setMobileProfileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previous
    }
  }, [mobileOpen])

  function handleAccountNavigation(id) {
    switch (id) {
      case 'profile':
        navigate('/profile')
        break

      case 'progress':
        navigate('/progress')
        break

      case 'watchlist':
        navigate('/watchlist')
        break

      case 'settings':
        navigate('/settings')
        break

      default:
        break
    }

    setProfileOpen(false)
    setMobileProfileOpen(false)
    onMobileClose?.()
  }

  const NavList = ({ showLabels, onNavigate }) => (
    <div className="space-y-1">
      {navItems.map(({ icon: Icon, label, href }) => {
        const isActive = location.pathname === href

        return (
          <Link
            key={href}
            to={href}
            onClick={onNavigate}
            className="
              relative flex items-center gap-3 px-3 py-3 rounded-xl
              transition-all duration-200 group
              hover:bg-black/5 dark:hover:bg-white/10
            "
            style={{
              color: isActive ? 'var(--primary)' : 'var(--text-muted)',
              background: isActive
                ? 'rgba(37, 99, 235, 0.08)'
                : 'transparent',
            }}
          >
            {isActive && (
              <motion.div
                layoutId="activeIndicator"
                className="
                  absolute left-0 top-1/2 -translate-y-1/2
                  w-0.5 h-6 rounded-r-full
                "
                style={{ background: 'var(--primary)' }}
              />
            )}

            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Icon size={18} />
            </div>

            {showLabels && (
              <span className="text-sm font-medium flex-1">{label}</span>
            )}

            {showLabels && (
              <ChevronRight
                size={14}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-muted)' }}
              />
            )}
          </Link>
        )
      })}
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <motion.aside
        animate={{ width: expanded ? 240 : 80 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => {
          setExpanded(false)
          setProfileOpen(false)
        }}
        className="
          hidden lg:flex lg:sticky lg:top-24 self-start flex-col
          py-6 px-2 h-[calc(100vh-6rem)]
          border-r overflow-x-hidden overflow-y-auto
        "
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <NavList showLabels={expanded} />

        <div className="mt-auto relative pt-6">
          <AccountFooter
            user={user}
            isAuthenticated={isAuthenticated}
            showLabel={expanded}
            profileOpen={profileOpen}
            onToggle={() => setProfileOpen((p) => !p)}
            onSignInClick={onSignInClick}
          />

          <AnimatePresence>
            {profileOpen && expanded && isAuthenticated && (
              <AccountDropdown
                user={user}
                onSignOut={onSignOut}
                onMenuItemClick={handleAccountNavigation}
                onClose={() => setProfileOpen(false)}
                className="absolute bottom-full left-0 right-0 mb-3"
              />
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* Mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 z-[55] lg:hidden bg-black/50"
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="
                fixed inset-y-0 left-0 z-[60] w-72 max-w-[85vw]
                flex flex-col py-6 px-3 border-r overflow-y-auto lg:hidden
              "
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-center justify-between mb-6 px-1">
                <span
                  className="text-lg font-bold"
                  style={{ color: 'var(--text)' }}
                >
                  Menu
                </span>

                <button
                  type="button"
                  onClick={onMobileClose}
                  className="
                    w-9 h-9 rounded-lg border flex items-center justify-center
                  "
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <NavList
                showLabels
                onNavigate={onMobileClose}
              />

              <div className="mt-auto relative pt-6">
                <AccountFooter
                  user={user}
                  isAuthenticated={isAuthenticated}
                  showLabel
                  profileOpen={mobileProfileOpen}
                  onToggle={() => setMobileProfileOpen((p) => !p)}
                  onSignInClick={() => {
                    onMobileClose?.()
                    onSignInClick?.()
                  }}
                />

                <AnimatePresence>
                  {mobileProfileOpen && isAuthenticated && (
                    <AccountDropdown
                      user={user}
                      onSignOut={() => {
                        onMobileClose?.()
                        onSignOut?.()
                      }}
                      onMenuItemClick={handleAccountNavigation}
                      onClose={() => setMobileProfileOpen(false)}
                      className="absolute bottom-full left-0 right-0 mb-3"
                    />
                  )}
                </AnimatePresence>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

