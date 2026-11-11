import ResearchIntelligenceDashboard from './ResearchIntelligenceDashboard.jsx'

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../services/api.js'
import {
  searchCompanies,
  fetchCompanyResearch,
  openPrintableResearchReport,
} from '../../services/researchService.js'

import Navbar from '../layout/Navbar.jsx'
import Sidebar from '../layout/Sidebar.jsx'

import ResearchHeader from './ResearchHeader.jsx'
import SearchCommandBar from './SearchCommandBar.jsx'
import CompanyHeroPanel from './CompanyHeroPanel.jsx'
import PriceChart from './PriceChart.jsx'
import InvestmentSnapshotGrid from './InvestmentSnapshotGrid.jsx'
import BusinessOverviewSection from './BusinessOverviewSection.jsx'
import FinancialPerformanceSection from './FinancialPerformanceSection.jsx'

import RecentCatalystsSection from './RecentCatalystsSection.jsx'
import NewsAndFilingsSection from './NewsAndFilingsSection.jsx'

import AnalystChecklistSection, { readAnalystReview, analystFramework } from './AnalystChecklistSection.jsx'
import ResearchActionsFooter from './ResearchActionsFooter.jsx'

export default function ResearchWorkspace({
  initialTicker = 'AAPL',

  // Shared app/auth props
  isAuthenticated,
  user,
  theme,
  onThemeToggle,
  onSignInClick,
  onSignUpClick,
  onSignOut,

  // Shared Navbar/Sidebar props
  navbarProps,
  sidebarProps,
}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryTicker = searchParams.get('ticker')?.trim().toUpperCase()
  const validQueryTicker = queryTicker && /^[A-Z.]{1,10}$/.test(queryTicker) ? queryTicker : null
  const [ticker, setTicker] = useState(validQueryTicker || initialTicker)
  const [actionMessage, setActionMessage] = useState('')
  const owner = isAuthenticated && user ? String(user.id || user.email || 'signed-in') : 'guest'

  useEffect(() => {
    if (validQueryTicker && validQueryTicker !== ticker) setTicker(validQueryTicker)
  }, [validQueryTicker])

  useEffect(() => {
    if (!actionMessage) return undefined
    const id = window.setTimeout(() => setActionMessage(''), 6000)
    return () => window.clearTimeout(id)
  }, [actionMessage])
  const [research, setResearch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [suggestions, setSuggestions] = useState([])
  const [catalog, setCatalog] = useState([])
  const [searchLoading, setSearchLoading] = useState(true)

  const [watched, setWatched] = useState(new Set())
  const [watchBusy, setWatchBusy] = useState(false)
  const [watchError, setWatchError] = useState('')
  const [loginRequired, setLoginRequired] = useState(false)

  useEffect(() => {
    let active = true
    setWatched(new Set())
    if (!isAuthenticated) return () => { active = false }
    api.watchlist.getAll()
      .then((items) => {
        if (active) setWatched(new Set((items || []).map((item) => item.ticker)))
      })
      .catch((error) => {
        if (active) setWatchError(`Unable to load saved stocks: ${error.message}`)
      })
    return () => { active = false }
  }, [isAuthenticated])

  // =========================================================
  // LOAD COMPANY DATA
  // =========================================================

  useEffect(() => {
    let alive = true

    setLoading(true)
    setError(null)
    setResearch(null)

    fetchCompanyResearch(ticker)
      .then((data) => {
        if (alive) {
          setResearch(data)
        }
      })
      .catch((e) => {
        if (alive) {
          setError(
            e?.message || 'Failed to load research'
          )
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false)
        }
      })

    return () => {
      alive = false
    }
  }, [ticker])

  // Load the curated company universe once. Clicking the search shows every
  // supported company; typing filters locally by name, ticker, or sector.
  useEffect(() => {
    let active = true
    searchCompanies('')
      .then((items) => {
        if (!active) return
        const list = Array.isArray(items) ? items : []
        setCatalog(list)
        setSuggestions(list)
      })
      .catch((error) => {
        if (active) console.warn('Company catalog unavailable:', error)
      })
      .finally(() => { if (active) setSearchLoading(false) })
    return () => { active = false }
  }, [])

  const handleQuery = useCallback((q) => {
    const term = q.trim().toLowerCase()
    setSuggestions(term ? catalog.filter((company) =>
      [company.name, company.ticker, company.sector]
        .some((value) => String(value || '').toLowerCase().includes(term))
    ) : catalog)
  }, [catalog])

  // =========================================================
  // COMPANY SELECTION
  // =========================================================

  const handleSelect = (nextTicker) => {
    setTicker(nextTicker)
    setSearchParams({ ticker: nextTicker })
    setActionMessage('')
  }

  // =========================================================
  // WATCHLIST
  // =========================================================

  const isWatched = watched.has(
    research?.company?.ticker
  )

  const toggleWatch = async () => {
    const currentTicker = research?.company?.ticker
    if (!currentTicker || watchBusy || loading || currentTicker !== ticker) return
    if (!isAuthenticated) {
      setLoginRequired(true)
      return
    }
    setWatchBusy(true)
    setWatchError('')
    try {
      if (watched.has(currentTicker)) {
        await api.watchlist.remove(currentTicker)
        setWatched((prev) => {
          const next = new Set(prev)
          next.delete(currentTicker)
          return next
        })
      } else {
        await api.watchlist.add(currentTicker)
        setWatched((prev) => new Set(prev).add(currentTicker))
      }
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        setLoginRequired(true)
      } else {
        setWatchError(error.message || 'Unable to update your watchlist.')
      }
    } finally {
      setWatchBusy(false)
    }
  }

  // =========================================================
  // EXPORT AND SHARE
  // =========================================================

  const exportReport = () => {
    if (!research?.company?.ticker || loading) return
    try {
      const review = readAnalystReview(research.company.ticker, owner)
      openPrintableResearchReport(research, review, analystFramework())
      setActionMessage('Report ready. Select Save as PDF in the print dialog.')
    } catch (err) {
      setActionMessage(err.message || 'Unable to open printable report.')
    }
  }

  const shareResearch = async () => {
    if (!research?.company?.ticker || loading) return
    const url = new URL('/dashboard', window.location.origin)
    url.searchParams.set('ticker', research.company.ticker)
    // Deliberately do not include private review notes or any session tokens.
    try {
      if (navigator.share) {
        await navigator.share({ title: `${research.company.name} · FINLINGO Research`, url: url.toString() })
        setActionMessage('Research link shared.')
        return
      }
      await navigator.clipboard.writeText(url.toString())
      setActionMessage('Research link copied.')
    } catch (err) {
      if (err?.name === 'AbortError') return
      try {
        await navigator.clipboard.writeText(url.toString())
        setActionMessage('Research link copied.')
      } catch {
        window.prompt('Copy your research link:', url.toString())
        setActionMessage('Copy the research link.')
      }
    }
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'var(--bg)',
        color: 'var(--text-primary)',
      }}
    >
      {/* =====================================================
          SHARED NAVBAR
          ===================================================== */}

      <Navbar
        {...(navbarProps ?? {
          isAuthenticated,
          user,
          theme,
          onThemeToggle,
          onSignInClick,
          onSignUpClick,
          onSignOut,
        })}
      />

      <div className="flex min-h-screen">

        {/* ===================================================
            SHARED SIDEBAR
            =================================================== */}

        <Sidebar
          {...(sidebarProps ?? {
            user,
            isAuthenticated,
            onSignInClick,
            onSignOut,
          })}
        />

        {/* ===================================================
            RESEARCH CONTENT
            =================================================== */}

        <main className="flex-1 min-w-0 pt-20 sm:pt-24">
          <div className="px-4 sm:px-6 lg:px-8 pb-10">
            <div className="max-w-[1360px] mx-auto space-y-5">

              {/* Research Header */}

              <ResearchHeader />

              {/* Search */}

              <SearchCommandBar
                suggestions={suggestions}
                loading={searchLoading}
                onQuery={handleQuery}
                onSelect={handleSelect}
              />

              {/* Error */}

              {error && (
                <div
                  className="rounded-2xl border border-red-500/40
                             bg-red-500/10 text-red-500
                             p-4 text-sm"
                >
                  {error}
                </div>
              )}

              {watchError && (
                <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">{watchError}</p>
              )}

              {/* Company Hero */}

              <CompanyHeroPanel
                company={research?.company}
                loading={loading}
                isWatched={isWatched}
                onWatch={toggleWatch}
                watchBusy={watchBusy}
              />

              {/* Price Chart + Investment Snapshot */}

              <div id="finlingo-price" style={{ scrollMarginTop: 110 }} className="grid lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2">
                  <PriceChart
                    chart={research?.chart}
                    loading={loading}
                  />
                </div>

                <div>
                  <InvestmentSnapshotGrid
                    snapshot={research?.snapshot}
                    loading={loading}
                  />
                </div>
              </div>

              {/* Business Overview */}

              <div id="finlingo-business" style={{ scrollMarginTop: 110 }}><BusinessOverviewSection
                business={research?.business}
                company={research?.company}
                loading={loading}
              /></div>

              {/* Financial Performance */}

              <div id="finlingo-financial" style={{ scrollMarginTop: 110 }}>
                <FinancialPerformanceSection
                  financials={research?.financials}
                  revenueMix={research?.business}
                  ticker={research?.company?.ticker}
                  loading={loading}
                />
              </div>

              {/* FINLINGO_RESEARCH_INTELLIGENCE_V2 */}
              <ResearchIntelligenceDashboard ticker={ticker} />

              {/* Catalysts + News */}

              <div id="finlingo-news" style={{ scrollMarginTop: 110 }} className="grid lg:grid-cols-2 gap-5">
                <RecentCatalystsSection
                  catalysts={research?.catalysts}
                  loading={loading}
                />

                <NewsAndFilingsSection
                  ticker={research?.company?.ticker}
                  news={research?.news}
                  filings={research?.filings}
                  loading={loading}
                />
              </div>


              {/* Analyst Checklist */}

              {research?.company?.ticker && (
                <AnalystChecklistSection key={`${ticker}-${owner}`} ticker={ticker} owner={owner} research={research} />
              )}

              {/* Footer Actions */}

              <ResearchActionsFooter
                isWatched={isWatched}
                onWatch={toggleWatch}
                watchBusy={watchBusy}
                disabled={loading || !research?.company || research.company.ticker !== ticker}
                onMarkets={() => navigate('/markets')}
                onExport={exportReport}
                onShare={shareResearch}
                onBattle={() => navigate('/battle')}
              />

              {actionMessage && (
                <p role="status" className="rounded-xl border border-border px-4 py-3 text-xs text-text-secondary" style={{ background: 'var(--surface-elevated)' }}>{actionMessage}</p>
              )}

              {loginRequired && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"
                     onMouseDown={(event) => { if (event.target === event.currentTarget) setLoginRequired(false) }}>
                  <div role="dialog" aria-modal="true" aria-labelledby="research-auth-title"
                       className="w-full max-w-md rounded-2xl border border-border p-6 shadow-2xl"
                       style={{ background: 'var(--surface)', color: 'var(--text-primary)' }}>
                    <h3 id="research-auth-title" className="text-xl font-bold">Sign in to save companies</h3>
                    <p className="mt-2 text-sm text-text-muted leading-relaxed">
                      Sign in to add this company to your watchlist.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      <button type="button" onClick={() => { setLoginRequired(false); onSignInClick?.() }}
                              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">Sign In</button>
                      <button type="button" onClick={() => { setLoginRequired(false); onSignUpClick?.() }}
                              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Create Account</button>
                      <button type="button" onClick={() => setLoginRequired(false)}
                              className="rounded-xl px-4 py-2 text-sm text-text-muted">Not Now</button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

