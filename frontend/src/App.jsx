import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from './context/AuthContext.jsx'
import { api } from './services/api.js'

import Home from './components/pages/Home.jsx'
import Dashboard from './components/pages/Dashboard.jsx'
import BattleMode from './components/pages/BattleMode.jsx'
import LearnHub from './components/pages/LearnHub.jsx'
import Watchlist from './components/pages/Watchlist.jsx'
import Privacy from './components/pages/Privacy.jsx'
import Terms from './components/pages/Terms.jsx'
import Markets from './components/pages/Markets.jsx'
import Profile from './components/pages/Profile.jsx'
import AccountSettings from './components/pages/AccountSettings.jsx'
import LearningProgressPage from './components/pages/LearningProgressPage.jsx'
import { accountSettingsService } from './services/accountSettingsService.js'

import SignInModal from './components/auth/SignInModal.jsx'
import SignUpModal from './components/auth/SignUpModal.jsx'

import CaseStudyDetailPage from './components/learn/CaseStudyDetail.jsx'
import FloatingAIAssistant from './components/ai/FloatingAIAssistant.jsx'

function AppRoutes() {
  const navigate = useNavigate()

  const {
    user,
    loading: authLoading,
    isAuthenticated,
    logout,
  } = useAuth()

  const [showSignIn, setShowSignIn] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // =========================================================
  // THEME
  // =========================================================

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const activeTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', activeTheme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme, activeTheme])

  // Sync a signed-in user's theme across devices; keep the local choice for guests.
  useEffect(() => {
    if (!isAuthenticated) return undefined
    let mounted = true
    accountSettingsService.get().then((data) => {
      if (mounted && ['light', 'dark', 'system'].includes(data?.themePreference)) setTheme(data.themePreference)
    }).catch(() => {}) // Other pages remain functional if account services are offline.
    return () => { mounted = false }
  }, [isAuthenticated, user?.email])

  // =========================================================
  // MARKETS DATA FROM BACKEND
  // =========================================================

  const [stocks, setStocks] = useState([])
  const [marketsLoading, setMarketsLoading] = useState(true)
  const [marketsError, setMarketsError] = useState(null)

  useEffect(() => {
    async function loadCompanies() {
      try {
        setMarketsLoading(true)

        const companies = await api.companies.getAll()

        const mapped = await Promise.all(
          companies.map(async (company) => {
            const research =
              await api.companies.getByTicker(
                company.ticker
              )

            const marketCap =
            research.marketCapitalization != null
              ? `${(
                  research.marketCapitalization /
                  1000
                ).toFixed(2)}T`
              : '—'

            const revenueGrowth =
              research.revenueGrowth != null
                ? `${research.revenueGrowth}%`
                : '—'

            const pe =
              research.pe != null
                ? research.pe.toFixed(2)
                : '—'

            const chartPoints =
              (research.chartData ?? []).map(
                (point) => ({
                  price: Number(point.value),
                  timestamp: new Date(
                    point.date
                  ).getTime(),
                })
              )

            return {
              ticker: research.ticker,
              name: research.name,
              shortName: research.name,

              sector:
                research.sector || 'Unknown',

              exchange:
                research.exchange || 'NASDAQ',

              market:
                research.country === 'IN'
                  ? 'Indian Market'
                  : 'US Market',

              price: Number(research.price) || 0,

              change:
                Number(research.change) || 0,

              positive:
                Boolean(research.positive),

              marketCap,

              revenueGrowth,

              revenueGrowthRaw:
                Number(research.revenueGrowth) || 0,

              pe,

              peRaw:
                Number(research.pe) || Infinity,

              open: research.open,
              high: research.high,
              low: research.low,
              volume: research.volume,

              chartData: {
                '1D': chartPoints,
                '1W': chartPoints,
                '1M': chartPoints,
                '3M': chartPoints,
                '6M': chartPoints,
                '1Y': chartPoints,
                '5Y': chartPoints,
              },

              description:
                research.description,

              marketCapitalization:
                research.marketCapitalization,

              status: {
                label: 'Market closed',
                updated: 'Recently',
                timezone: 'Local time',
              },
            }
          })
        )

        setStocks(mapped)

        setMarketsError(null)
      } catch (error) {
        console.error('Failed to load companies:', error)
        setMarketsError(error.message || 'Failed to load market data')
      } finally {
        setMarketsLoading(false)
      }
    }

    loadCompanies()
  }, [])

  // =========================================================
  // AUTH HANDLERS
  // =========================================================

  const handleSignInSuccess = () => {
    setShowSignIn(false)
  }

  const handleSignUpSuccess = () => {
    setShowSignUp(false)
  }

  const handleSignOut = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // =========================================================
  // ACCOUNT NAVIGATION
  // =========================================================

  const handleAccountNavigate = (id) => {
    const routes = {
      profile: '/profile',
      watchlist: '/watchlist',
      progress: '/progress',
      settings: '/settings',
    }

    const path = routes[id]

    if (path) navigate(path)
  }

  // =========================================================
  // SHARED PROPS
  // =========================================================

  const authProps = {
    isAuthenticated,
    user,
    theme: activeTheme,
    themePreference: theme,
    onThemeChange: setTheme,

    onThemeToggle: () => {
      const previous = theme
      const next = activeTheme === 'dark' ? 'light' : 'dark'
      setTheme(next)
      if (isAuthenticated) accountSettingsService.updateAppearance(next).catch((error) => {
        console.error('Could not sync appearance preference:', error)
        setTheme(previous)
      })
    },

    onSignInClick: () => setShowSignIn(true),
    onSignUpClick: () => setShowSignUp(true),
    onSignOut: handleSignOut,
  }

  const sidebarProps = {
    user,
    isAuthenticated,
    onSignInClick: () => setShowSignIn(true),
    onSignOut: handleSignOut,
    onAccountNavigate: handleAccountNavigate,
    mobileOpen: mobileNavOpen,
    onMobileClose: () => setMobileNavOpen(false),
  }

  const navbarProps = {
    ...authProps,
    onSidebarToggle: () => setMobileNavOpen((prev) => !prev),
  }

  if (authLoading) return null

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <Home
              {...authProps}
              onSidebarToggle={() =>
                setMobileNavOpen((prev) => !prev)
              }
            />
          }
        />

        <Route path="/privacy" element={<Privacy {...authProps} />} />
        <Route path="/terms" element={<Terms {...authProps} />} />

        <Route
          path="/markets"
          element={
            <Markets
              {...authProps}
              navbarProps={navbarProps}
              sidebarProps={sidebarProps}
              stocks={stocks}
              loading={marketsLoading}
              error={marketsError}
            />
          }
        />

        <Route
          path="/learn/case-studies/:caseStudyId"
          element={<CaseStudyDetailPage {...authProps} />}
        />

        <Route
          path="/dashboard"
          element={
            <Dashboard
              {...authProps}
              navbarProps={navbarProps}
              sidebarProps={sidebarProps}
            />
          }
        />

        <Route
          path="/battle"
          element={
            <BattleMode
              {...authProps}
              navbarProps={navbarProps}
              sidebarProps={sidebarProps}
            />
          }
        />

        <Route
          path="/learn"
          element={
            <LearnHub
              {...authProps}
              sidebarProps={sidebarProps}
              onSidebarToggle={() =>
                setMobileNavOpen((prev) => !prev)
              }
            />
          }
        />

        <Route
          path="/progress"
          element={isAuthenticated ? <LearningProgressPage {...authProps} /> : <Navigate to="/" replace />}
        />

        <Route
          path="/watchlist"
          element={
            <Watchlist
              {...authProps}
              navbarProps={navbarProps}
              sidebarProps={sidebarProps}
            />
          }
        />

        <Route
          path="/settings"
          element={
            isAuthenticated ? (
              <AccountSettings {...authProps} navbarProps={navbarProps} sidebarProps={sidebarProps} />
            ) : <Navigate to="/" replace />
          }
        />

        <Route
          path="/profile"
          element={
            <Profile
              {...authProps}
              navbarProps={navbarProps}
              sidebarProps={sidebarProps}
            />
          }
        />
      </Routes>

      <FloatingAIAssistant />

      {showSignIn && (
        <SignInModal
          onClose={() => setShowSignIn(false)}
          onSuccess={handleSignInSuccess}
          onSwitchToSignUp={() => {
            setShowSignIn(false)
            setShowSignUp(true)
          }}
        />
      )}

      {showSignUp && (
        <SignUpModal
          onClose={() => setShowSignUp(false)}
          onSuccess={handleSignUpSuccess}
          onSwitchToSignIn={() => {
            setShowSignUp(false)
            setShowSignIn(true)
          }}
        />
      )}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}