
// src/components/pages/Markets.jsx
import { api } from '../../services/api.js'
import { useMemo, useState, useEffect } from 'react'

import Sidebar from '../layout/Sidebar.jsx'
import Navbar from '../layout/Navbar.jsx'

import MarketOverviewStrip from '../markets/MarketOverviewStrip'
import SearchFilterToolbar from '../markets/SearchFilterToolbar'
import StockDiscoveryList from '../markets/StockDiscoveryList'
import CompanyResearchPanel from '../markets/CompanyResearchPanel'
import MarketMoversSection from '../markets/MarketMoversSection'

import '../markets/markets.css'

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// Helpers
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function normalize(value = '') {
  return value.trim().toLowerCase()
}

function getSearchScore(stock, query) {
  const ticker = normalize(stock.ticker)
  const name = normalize(stock.name)
  const shortName = normalize(stock.shortName)

  if (ticker === query) return 0
  if (name === query || shortName === query) return 1
  if (ticker.startsWith(query)) return 2
  if (name.startsWith(query) || shortName.startsWith(query)) return 3

  const words = `${name} ${shortName}`.split(/\s+/)

  if (words.some((word) => word.startsWith(query))) {
    return 4
  }

  if (
    ticker.includes(query) ||
    name.includes(query) ||
    shortName.includes(query)
  ) {
    return 5
  }

  return Number.POSITIVE_INFINITY
}

function parseMarketCap(value = '') {
  const number = Number.parseFloat(String(value ?? '').replace(/[^0-9.\-]/g, ''))

  if (Number.isNaN(number)) return 0

  const upper = String(value).toUpperCase()

  if (upper.includes('T')) return number * 1_000_000
  if (upper.includes('B')) return number * 1_000
  if (upper.includes('M')) return number

  return number
}

function getVisibleStocks({
  stocks,
  search,
  activeFilter,
  sortBy,
}) {
  const query = normalize(search)

  let result = stocks.filter((stock) => {
    const matchesFilter =
      activeFilter === 'all' ||
      stock.market === activeFilter ||
      normalize(stock.sector) === normalize(activeFilter.replaceAll('-', ' '))

    if (!matchesFilter) return false
    if (!query) return true

    return Number.isFinite(
      getSearchScore(stock, query)
    )
  })

  if (query) {
    return [...result].sort(
      (a, b) =>
        getSearchScore(a, query) -
        getSearchScore(b, query)
    )
  }

  switch (sortBy) {
    case 'change':
      return [...result].sort(
        (a, b) => b.change - a.change
      )

    case 'marketCap':
      return [...result].sort(
        (a, b) =>
          parseMarketCap(b.marketCap) -
          parseMarketCap(a.marketCap)
      )

    case 'revenueGrowth':
      return [...result].sort(
        (a, b) =>
          (b.revenueGrowthRaw ?? 0) -
          (a.revenueGrowthRaw ?? 0)
      )

    case 'pe':
      return [...result].sort(
        (a, b) =>
          (a.peRaw ?? Infinity) -
          (b.peRaw ?? Infinity)
      )

    case 'alphabetical':
      return [...result].sort((a, b) =>
        a.name.localeCompare(b.name)
      )

    default:
      return result
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// Component
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export default function Markets({
  isAuthenticated,
  user,
  theme,
  onThemeToggle,
  onSignInClick,
  onSignUpClick,
  onSignOut,
  navbarProps,
  sidebarProps,

  // Backend/API data
  stocks: suppliedStocks = [],
  companyResearch = {},
  loading: suppliedLoading = false,
  error: suppliedError = null,
}) {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] =
    useState('all')

  const [sortBy, setSortBy] =
    useState('default')

  const [selectedTicker, setSelectedTicker] =
    useState(null)

  const [watchedTickers, setWatchedTickers] =
    useState(() => new Set())
  const [loginRequired, setLoginRequired] = useState(false)

  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false)
  const [marketOverview, setMarketOverview] = useState(null)
  const [marketOverviewLoading, setMarketOverviewLoading] = useState(true)
  const [catalogueStocks, setCatalogueStocks] = useState([])
  const [catalogueLoading, setCatalogueLoading] = useState(true)
  const [catalogueError, setCatalogueError] = useState(null)

  // Load the tracked company universe from PostgreSQL, then enrich each
  // company with its locally stored quote/research DTO. No Finnhub calls here.
  useEffect(() => {
    let active = true
    async function loadCatalogue() {
      setCatalogueLoading(true)
      setCatalogueError(null)
      try {
        const companies = await api.companies.getAll()
        const rows = await Promise.all(companies.map(async (company) => {
          try {
            const research = await api.companies.getResearchByTicker(company.ticker)
            const exchange = research.exchange ?? company.exchange ?? ''
            const market = /NSE|BSE/i.test(exchange) || /india/i.test(research.country ?? company.country ?? '') ? 'india' : 'us'
            const price = Number(research.price ?? 0)
            const change = Number(research.change ?? 0)
            const marketCap = research.marketCapitalization ?? company.marketCapitalization ?? null
            const revenueGrowth = research.revenueGrowth ?? company.revenueGrowth ?? null
            const pe = research.pe ?? company.peRatio ?? null
            return {
              ...company, ...research,
              ticker: company.ticker,
              name: research.name ?? company.name,
              shortName: research.name ?? company.name,
              exchange, market, price, change,
              marketCap,
              marketCapRaw: marketCap == null ? 0 : Number(marketCap),
              revenueGrowthRaw: revenueGrowth == null ? null : Number(revenueGrowth),
              peRaw: pe == null ? null : Number(pe),
              logoUrl: null,
              chartData: Array.isArray(research.chartData) ? research.chartData : [],
            }
          } catch (err) {
            console.warn(`Research data unavailable for ${company.ticker}`, err)
            return { ...company, ticker: company.ticker, name: company.name,
              shortName: company.name, exchange: company.exchange ?? '',
              market: /NSE|BSE/i.test(company.exchange ?? '') ? 'india' : 'us',
              price: 0, change: 0, marketCap: company.marketCapitalization ?? null,
              marketCapRaw: Number(company.marketCapitalization ?? 0),
              revenueGrowthRaw: company.revenueGrowth == null ? null : Number(company.revenueGrowth),
              peRaw: company.peRatio == null ? null : Number(company.peRatio),
              chartData: [] }
          }
        }))
        if (active) setCatalogueStocks(rows)
      } catch (err) {
        if (active) setCatalogueError(err.message || 'Unable to load company catalogue')
      } finally {
        if (active) setCatalogueLoading(false)
      }
    }
    loadCatalogue()
    return () => { active = false }
  }, [])

  const stocks = suppliedStocks.length ? suppliedStocks : catalogueStocks
  const loading = suppliedLoading || (!suppliedStocks.length && catalogueLoading)
  const error = suppliedError || (!suppliedStocks.length ? catalogueError : null)

  useEffect(() => {
    let active = true
    let requestInFlight = false

    const refreshOverview = async () => {
      if (requestInFlight) return
      requestInFlight = true
      try {
        const data = await api.market.getOverview()
        if (active) setMarketOverview(data)
      } catch (err) {
        console.error('Failed to refresh market overview:', err)
      } finally {
        requestInFlight = false
        if (active) setMarketOverviewLoading(false)
      }
    }

    refreshOverview()
    const intervalId = window.setInterval(refreshOverview, 60000)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [])
    // Load saved watchlist on component mount
  useEffect(() => {
    async function loadWatchlist() {
      try {
        const data = await api.watchlist.getAll()
        const tickers = Array.isArray(data)
          ? data.map((item) => (typeof item === 'string' ? item : item.ticker))
          : []
        setWatchedTickers(new Set(tickers))
      } catch (err) {
        console.error('Failed to fetch initial watchlist:', err)
      }
    }

    if (isAuthenticated) {
      loadWatchlist()
    }
  }, [isAuthenticated])


  const visibleStocks = useMemo(
    () =>
      getVisibleStocks({
        stocks,
        search,
        activeFilter,
        sortBy,
      }),
    [stocks, search, activeFilter, sortBy]
  )

  /*
   * If nothing has been selected yet, use the first
   * backend-provided stock.
   */
  const selectedStock = useMemo(() => {
    const stock =
      stocks.find(
        (item) => item.ticker === selectedTicker
      ) ?? visibleStocks[0] ?? stocks[0]

    if (!stock) return null

    /*
     * The backend can provide the enriched research
     * information separately. We merge it here so the
     * existing CompanyResearchPanel can keep receiving
     * one stock object.
     */
    return {
      ...stock,
      ...(companyResearch[stock.ticker] ?? {}),
    }
  }, [
    stocks,
    visibleStocks,
    selectedTicker,
    companyResearch,
  ])

  function handleSearchChange(value) {
    setSearch(value)

    const nextFilter = value.trim()
      ? 'all'
      : activeFilter

    if (
      value.trim() &&
      activeFilter !== 'all'
    ) {
      setActiveFilter('all')
    }

    const matches = getVisibleStocks({
      stocks,
      search: value,
      activeFilter: nextFilter,
      sortBy,
    })

    if (matches.length > 0) {
      setSelectedTicker(matches[0].ticker)
    }
  }

  function handleSearchSubmit() {
    if (visibleStocks.length > 0) {
      setSelectedTicker(
        visibleStocks[0].ticker
      )
    }
  }

  function handleFilterChange(filter) {
    setActiveFilter(filter)

    const matches = getVisibleStocks({
      stocks,
      search,
      activeFilter: filter,
      sortBy,
    })

    if (
      matches.length > 0 &&
      !matches.some(
        (stock) =>
          stock.ticker === selectedTicker
      )
    ) {
      setSelectedTicker(matches[0].ticker)
    }
  }

  async function toggleWatch(ticker) {
    if (!isAuthenticated) {
      setLoginRequired(true)
      return
    }

    try {
      if (watchedTickers.has(ticker)) {
        await api.watchlist.remove(ticker)
        setWatchedTickers((current) => {
          const next = new Set(current)
          next.delete(ticker)
          return next
        })
      } else {
        await api.watchlist.add(ticker)
        setWatchedTickers((current) => new Set(current).add(ticker))
      }
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        setLoginRequired(true)
        return
      }
      console.error('FAILED WATCHLIST:', error)
      alert(error.message || 'Unable to update your watchlist.')
    }
  }

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >

      {/* NAVBAR */}

      <Navbar
        {...(navbarProps ?? {
          isAuthenticated,
          user,
          theme,
          onThemeToggle,
          onSignInClick,
          onSignUpClick,
          onSignOut,
          onSidebarToggle: () =>
            setMobileSidebarOpen(true),
        })}
      />

      {/* SIDEBAR + CONTENT */}

      <div className="flex w-full">

        <Sidebar
          {...(sidebarProps ?? {
            user,
            isAuthenticated,
            onSignInClick,
            onSignOut,
            mobileOpen: mobileSidebarOpen,
            onMobileClose: () =>
              setMobileSidebarOpen(false),
          })}
        />

        {/* MAIN CONTENT */}

        <main
          className="
            flex-1
            min-w-0
            min-h-screen
            pt-20
            sm:pt-24
            px-4
            sm:px-6
            lg:px-8
            pb-16
          "
        >
          <div className="w-full max-w-[1400px] mx-auto space-y-6">

            <MarketOverviewStrip overview={marketOverview} loading={marketOverviewLoading} />

            <SearchFilterToolbar
              search={search}
              onSearchChange={handleSearchChange}
              onSearchSubmit={handleSearchSubmit}
              activeFilter={activeFilter}
              onFilterChange={handleFilterChange}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />

            {/* Backend loading state */}

            {loading && (
              <div className="markets-page-container">
                <div className="markets-workspace">
                  <div className="markets-left">
                    <div className="p-6 text-center text-text-muted">
                      Loading market data...
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Backend error state */}

            {!loading && error && (
              <div className="markets-page-container">
                <div className="markets-workspace">
                  <div className="p-6 text-center text-error">
                    {typeof error === 'string'
                      ? error
                      : 'Unable to load market data.'}
                  </div>
                </div>
              </div>
            )}

            {/* Market data */}

            {!loading && !error && (
              <div className="markets-page-container">
                <div className="markets-workspace">

                  <aside className="markets-left">
                    <StockDiscoveryList
                      stocks={visibleStocks}
                      selectedTicker={
                        selectedStock?.ticker ??
                        selectedTicker
                      }
                      onSelect={setSelectedTicker}
                      activeFilter={activeFilter}
                    />
                  </aside>

                  <section className="markets-right">
                    {selectedStock ? (
                      <CompanyResearchPanel
                        stock={selectedStock}
                        isWatching={watchedTickers.has(
                          selectedStock.ticker
                        )}
                        onToggleWatch={() =>
                          toggleWatch(
                            selectedStock.ticker
                          )
                        }
                      />
                    ) : (
                      <div className="p-8 text-center text-text-muted">
                        No company selected.
                      </div>
                    )}
                  </section>

                </div>
              </div>
            )}

            <MarketMoversSection gainers={marketOverview?.gainers ?? []} losers={marketOverview?.losers ?? []} loading={marketOverviewLoading} />

            {loginRequired && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="markets-watchlist-auth-title"
                  className="w-full max-w-md rounded-2xl border border-border p-6 shadow-2xl"
                  style={{ background: 'var(--surface)', color: 'var(--text-primary)' }}
                >
                  <h3 id="markets-watchlist-auth-title" className="text-xl font-bold">
                    Sign in to save companies
                  </h3>
                  <p className="mt-2 text-sm text-text-muted">
                    Create an account or sign in to add companies to your watchlist.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setLoginRequired(false); onSignInClick?.() }}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
                      Sign In
                    </button>
                    <button type="button" onClick={() => { setLoginRequired(false); onSignUpClick?.() }}
                      className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
                      Create Account
                    </button>
                    <button type="button" onClick={() => setLoginRequired(false)}
                      className="rounded-xl px-4 py-2 text-sm text-text-muted">
                      Not Now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}



