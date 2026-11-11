import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, ChevronDown, Copy, RefreshCw, Search, Shuffle, Sparkles, Swords, Wifi, X, Zap } from 'lucide-react'

import Sidebar from '../layout/Sidebar.jsx'
import Navbar from '../layout/Navbar.jsx'
import BattleScore from '../battle/BattleScore.jsx'
import Methodology from '../battle/Methodology.jsx'
import CategoryScorecard from '../battle/CategoryScorecard.jsx'
import DetailedComparison from '../battle/DetailedComparison.jsx'
import AnalystSummary from '../battle/AnalystSummary.jsx'
import CompanyStrengths from '../battle/CompanyStrengths.jsx'
import TradeoffSection from '../battle/TradeOff.jsx'
import RiskComparison from '../battle/RiskComparison.jsx'
import FinalVerdict from '../battle/FinalVerdict.jsx'
import { fetchCompanyResearch, searchCompanies } from '../../services/researchService.js'

// Scores are head-to-head round points, never claimed absolute investment ratings.
// Only common, verifiable, period-comparable SEC metrics are scored.
const BATTLE_METRICS = [
  { name: 'Revenue Growth', direction: 'higher' },
  { name: 'Gross Margin', direction: 'higher' },
  { name: 'Operating Margin', direction: 'higher' },
  { name: 'Net Margin', direction: 'higher' },
  { name: 'ROE', direction: 'higher' },
  { name: 'Operating Cash Flow Margin', direction: 'higher' },
  { name: 'Free Cash Flow Margin', direction: 'higher' },
  { name: 'Equity / Assets', direction: 'higher' },
  { name: 'Liabilities / Equity', direction: 'lower' },
]
// Battle accents are scoped to the two contenders; the FINLINGO site theme is unchanged.
const TICKER_ACCENTS = {
  AAPL: '#60A5FA', ADBE: '#A78BFA', AMD: '#FB923C', AMZN: '#FBBF24',
  BA: '#93C5FD', COST: '#F59E0B', CRM: '#38BDF8', CSCO: '#22D3EE',
  CVX: '#FB7185', DIS: '#F9A8D4', GOOGL: '#A3E635', HD: '#F97316',
  INTC: '#67E8F9', JNJ: '#F472B6', JPM: '#C4B5FD', KO: '#FB7185',
  MA: '#2DD4BF', MCD: '#FACC15', META: '#2DD4BF', MSFT: '#38BDF8',
  NFLX: '#F87171', NKE: '#FDBA74', NVDA: '#84CC16', ORCL: '#67E8F9',
  PG: '#A78BFA', TSLA: '#FB7185', UNH: '#0EA5E9', V: '#60A5FA',
  WMT: '#FBBF24', XOM: '#FB923C',
}
const FALLBACK_ACCENTS = ['#A3E635', '#FBBF24', '#A78BFA', '#2DD4BF', '#FB923C', '#60A5FA', '#F472B6', '#22D3EE']
const tickerAccent = (ticker) => {
  if (TICKER_ACCENTS[ticker]) return TICKER_ACCENTS[ticker]
  const hash = [...(ticker || '')].reduce((total, letter) => total * 31 + letter.charCodeAt(0), 7)
  return FALLBACK_ACCENTS[Math.abs(hash) % FALLBACK_ACCENTS.length]
}
const battleAccents = (left, right) => {
  const a = tickerAccent(left)
  let b = tickerAccent(right)
  // Never let two different selected tickers render as identical opponents.
  if (a === b) b = FALLBACK_ACCENTS.find((accent) => accent !== a && accent !== '#60A5FA') || '#FBBF24'
  return { left: a, right: b }
}
const translucent = (hex, suffix = '18') => `${hex}${suffix}`
const hexToRgb = (hex) => {
  const value = (hex || '#94A3B8').replace('#', '')
  const normalized = value.length === 3 ? value.split('').map((part) => part + part).join('') : value
  const int = Number.parseInt(normalized, 16)
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 }
}
const rgba = (hex, alpha = 1) => {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
const mixHex = (base, target = '#FFFFFF', weight = 0.5) => {
  const a = hexToRgb(base)
  const b = hexToRgb(target)
  const blend = (x, y) => Math.round(x * (1 - weight) + y * weight).toString(16).padStart(2, '0')
  return `#${blend(a.r, b.r)}${blend(a.g, b.g)}${blend(a.b, b.b)}`
}

// Look for the most recent pair of reported annual periods close enough to compare.
// Example: AMD FY2025 vs Apple FY2025, not AMD FY2025 vs Apple FY2026.
function selectFiscalPeriods(leftResearch, rightResearch) {
  const a = leftResearch?.financials?.annual?.periods || []
  const b = rightResearch?.financials?.annual?.periods || []
  const candidates = a.flatMap((leftPeriod) => b.map((rightPeriod) => ({
    leftPeriod, rightPeriod, days: dateGap(leftPeriod, rightPeriod),
    comparableThrough: Math.min(Date.parse(leftPeriod), Date.parse(rightPeriod)),
  }))).filter((pair) => Number.isFinite(pair.days) && pair.days <= 185 && Number.isFinite(pair.comparableThrough))
  candidates.sort((x, y) => y.comparableThrough - x.comparableThrough || x.days - y.days)
  return candidates[0] || { leftPeriod: a[0] || null, rightPeriod: b[0] || null, days: null }
}

const numeric = (value) => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)
const money = (millions) => {
  if (millions == null) return '—'
  const a = Math.abs(millions)
  return `${millions < 0 ? '−' : ''}$${a >= 1e6 ? `${(a / 1e6).toFixed(2)}T` : a >= 1000 ? `${(a / 1000).toFixed(2)}B` : `${a.toFixed(1)}M`}`
}
const percentage = (value) => value == null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
const fmt = (value, unit) => unit === 'money' ? money(value) : unit === 'ratio' ? (value == null ? '—' : `${value.toFixed(2)}x`) : percentage(value)
const dateGap = (a, b) => Math.abs(Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86400000
const safeTicker = (value) => /^[A-Z.]{1,10}$/.test(value || '') ? value : null

function buildCompany(research, targetPeriod, accent) {
  if (!research?.company) return null
  const { company, snapshot = [] } = research
  const annual = research.financials?.annual
  const periods = annual?.periods || []
  const anchorIndex = Math.max(0, periods.indexOf(targetPeriod))
  const rows = [...(annual?.income || []), ...(annual?.balance || []), ...(annual?.cashFlow || [])]
  const find = (label, year = 0) => {
    const period = periods[anchorIndex + year]
    if (!period) return null
    const row = rows.find((entry) => entry.label === label)
    const point = row?.values?.find((item) => item.period === period)
    const value = numeric(point?.value)
    return value == null ? null : { raw: value, period, sourceUrl: point?.sourceUrl || null }
  }
  const rev = find('Revenue')
  const prevRev = find('Revenue', 1)
  const gross = find('Gross Profit')
  const operating = find('Operating Income')
  const net = find('Net Income')
  const ocf = find('Operating Cash Flow')
  const capex = find('Capital Expenditures')
  const assets = find('Total Assets')
  const liabilities = find('Total Liabilities')
  const equity = find('Shareholders Equity')
  const priorEquity = find('Shareholders Equity', 1)
  const same = (x, y) => x && y && x.period === y.period
  const margin = (x) => same(x, rev) && rev.raw > 0 ? (x.raw / rev.raw) * 100 : null
  const item = (value, unit, base, options = {}) => numeric(value) == null ? null : ({
    raw: value, value: fmt(value, unit), period: base?.period || null,
    sourceUrl: base?.sourceUrl || null, unit, ...options,
  })
  const growth = rev && prevRev && prevRev.raw > 0 && dateGap(rev.period, prevRev.period) >= 330 && dateGap(rev.period, prevRev.period) <= 400
    ? (rev.raw / prevRev.raw - 1) * 100 : null
  const free = same(ocf, capex) ? ocf.raw - Math.abs(capex.raw) : null
  const averageEquity = equity && priorEquity && dateGap(equity.period, priorEquity.period) >= 330 && dateGap(equity.period, priorEquity.period) <= 400 && equity.raw > 0 && priorEquity.raw > 0
    ? (equity.raw + priorEquity.raw) / 2 : null
  const roe = same(net, equity) && averageEquity ? net.raw / averageEquity * 100 : null
  const storedPe = snapshot.find((entry) => entry.label === 'P/E Ratio')?.value
  const pe = storedPe && /\d/.test(storedPe) ? numeric(parseFloat(storedPe)) : null

  const metrics = {
    'Revenue Growth': item(growth, 'percent', rev),
    'Gross Margin': item(margin(gross), 'percent', gross),
    'Operating Margin': item(margin(operating), 'percent', operating),
    'Net Margin': item(margin(net), 'percent', net),
    'ROE': item(roe, 'percent', net, { note: 'Net income / average equity; may be distorted by buybacks' }),
    'Operating Cash Flow Margin': item(margin(ocf), 'percent', ocf),
    'Free Cash Flow Margin': item(same(ocf, rev) && free != null ? free / rev.raw * 100 : null, 'percent', ocf),
    'Equity / Assets': item(same(equity, assets) && assets.raw > 0 ? equity.raw / assets.raw * 100 : null, 'percent', equity),
    'Liabilities / Equity': item(same(liabilities, equity) && equity.raw > 0 ? liabilities.raw / equity.raw : null, 'ratio', equity,
      { note: 'Total liabilities / equity, not interest-bearing debt / equity' }),
    'P/E Ratio': pe != null && pe > 0 ? item(pe, 'ratio', null, { unscored: true, note: 'Stored valuation multiple; observation date unverified' }) : null,
    'Annual Revenue': item(rev?.raw, 'money', rev, { unscored: true }),
    'Net Income': item(net?.raw, 'money', net, { unscored: true }),
    'Operating Cash Flow': item(ocf?.raw, 'money', ocf, { unscored: true }),
    'Free Cash Flow': item(free, 'money', ocf, { unscored: true }),
  }

  return {
    ticker: company.ticker,
    name: company.name || company.ticker,
    sector: company.sector || '',
    color: accent,
    period: periods[anchorIndex] || null,
    metrics,
    researchUrl: `/dashboard?ticker=${encodeURIComponent(company.ticker)}`,
  }
}

function scoreHeadToHead(left, right) {
  if (!left || !right) return { left, right, rounds: 0, details: [], coverage: 'No data' }
  const leftMetrics = { ...left.metrics }
  const rightMetrics = { ...right.metrics }
  const details = []
  for (const { name, direction } of BATTLE_METRICS) {
    const a = leftMetrics[name]
    const b = rightMetrics[name]
    const bothPresent = a != null && b != null
    const comparable = bothPresent && a.period && b.period && Number.isFinite(dateGap(a.period, b.period)) && dateGap(a.period, b.period) <= 185
    if (!comparable) {
      details.push({ name, scored: false, reason: !bothPresent ? 'Metric unavailable for one or both' : 'Fiscal periods not aligned' })
      continue
    }
    const delta = (a.raw - b.raw) * (direction === 'lower' ? -1 : 1)
    const tie = Math.abs(delta) < 1e-8
    const winner = tie ? 'tie' : delta > 0 ? 'left' : 'right'
    leftMetrics[name] = { ...a, score: tie ? 50 : delta > 0 ? 100 : 0, compared: true }
    rightMetrics[name] = { ...b, score: tie ? 50 : delta < 0 ? 100 : 0, compared: true }
    details.push({ name, scored: true, winner, left: a.value, right: b.value, leftPeriod: a.period, rightPeriod: b.period })
  }
  const rounds = details.filter((round) => round.scored).length
  const coverage = rounds >= 7 ? 'Strong coverage' : rounds >= 4 ? 'Moderate coverage' : rounds ? 'Limited coverage' : 'No scored rounds'
  return { left: { ...left, metrics: leftMetrics }, right: { ...right, metrics: rightMetrics }, rounds, details, coverage }
}

// Brand-icon domains for FINLINGO's supported company catalogue.
// The favicon service has no registration requirement. A readable ticker
// monogram is always available if a logo can't be loaded.
const COMPANY_LOGO_DOMAINS = {
  AAPL: 'apple.com', ADBE: 'adobe.com', AMD: 'amd.com', AMZN: 'amazon.com',
  BA: 'boeing.com', COST: 'costco.com', CRM: 'salesforce.com', CSCO: 'cisco.com',
  CVX: 'chevron.com', DIS: 'disney.com', GOOGL: 'google.com', HD: 'homedepot.com',
  INTC: 'intel.com', JNJ: 'jnj.com', JPM: 'jpmorganchase.com', KO: 'coca-colacompany.com',
  MA: 'mastercard.com', MCD: 'mcdonalds.com', META: 'meta.com', MSFT: 'microsoft.com',
  NFLX: 'netflix.com', NKE: 'nike.com', NVDA: 'nvidia.com', ORCL: 'oracle.com',
  PG: 'pg.com', TSLA: 'tesla.com', UNH: 'unitedhealthgroup.com', V: 'visa.com',
  WMT: 'walmart.com', XOM: 'exxonmobil.com',
}
const companyLogoSources = (ticker) => {
  const domain = COMPANY_LOGO_DOMAINS[ticker]
  if (!domain) return []
  // SVG when the brand exists in the public logo catalog; PNG favicon fallback.
  return [
    `https://logoapi.sh/favicon/${domain}`,
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
  ]
}

// Preserve the familiar fighter body and glove animation. Only the face is
// replaced with a circular branded robot head; the sweatshirt stays blank.
function DuelFighter({ side, ticker, color, attack, defend, roundId, reducedMotion }) {
  const isRight = side === 'right'
  const logoSources = useMemo(() => companyLogoSources(ticker), [ticker])
  const [logoSourceIndex, setLogoSourceIndex] = useState(0)
  const [logoLoaded, setLogoLoaded] = useState(false)
  useEffect(() => { setLogoSourceIndex(0); setLogoLoaded(false) }, [ticker])
  const logoSrc = logoSources[logoSourceIndex] || null
  const fallbackText = (ticker || '?').slice(0, 5)
  const move = attack
    ? { x: [0, 12, 28, 7, 0], y: [0, -3, -7, 0, 0], rotate: [0, -3, -7, 2, 0] }
    : defend
      ? { x: [0, -6, -13, -3, 0], y: [0, 0, -3, 0, 0], rotate: [0, 3, 6, -1, 0] }
      : { x: 0, y: [0, -3, 0], rotate: 0 }
  const movement = isRight
    ? { ...move, x: Array.isArray(move.x) ? move.x.map((n) => -n) : move.x,
      rotate: Array.isArray(move.rotate) ? move.rotate.map((n) => -n) : move.rotate }
    : move
  const timing = attack || defend
    ? { duration: 0.62, ease: 'easeInOut' }
    : { duration: 1.9, ease: 'easeInOut', repeat: Infinity }
  const rightArmMovement = attack
    ? { x: [0, 12, 30, 6, 0], rotate: [0, -9, -13, -2, 0] }
    : defend
      ? { x: [0, -5, -5, 0], y: [0, -14, -15, 0], rotate: [0, -18, -20, 0] }
      : { x: 0, y: 0, rotate: 0 }
  const headMovement = attack
    ? { rotate: [0, -5, 2, 0], x: [0, 4, 0] }
    : defend
      ? { rotate: [0, 6, -1, 0], x: [0, -3, 0] }
      : { rotate: [-1.5, 1.5, -1.5], x: 0 }
  const headTiming = attack || defend
    ? { duration: 0.62, ease: 'easeInOut' }
    : { duration: 2.2, ease: 'easeInOut', repeat: Infinity }

  return (
    <motion.div key={`${side}-${ticker}`} aria-hidden="true"
      className="relative flex h-full min-w-0 items-end justify-center"
      initial={reducedMotion ? false : { opacity: 0, x: isRight ? 20 : -20, scale: 0.94 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.35, ease: 'easeOut' }}>
      <motion.div key={`move-${roundId}`} className="relative w-full max-w-[250px] origin-bottom"
        initial={false} animate={reducedMotion ? undefined : movement}
        transition={reducedMotion ? { duration: 0 } : timing}>
        <svg viewBox="0 0 260 265" className="h-auto w-full overflow-visible" role="presentation" focusable="false">
          <defs>
            <linearGradient id={`duel-shirt-${side}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={color} />
              <stop offset="1" stopColor={color} stopOpacity="0.76" />
            </linearGradient>
            <linearGradient id={`duel-visor-${side}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#EAF0F8" />
            </linearGradient>
            <clipPath id={`duel-logo-clip-${side}`}>
              <circle cx="130" cy="80" r="33" />
            </clipPath>
          </defs>
          <ellipse cx="129" cy="255" rx="78" ry="7" fill={color} opacity="0.13" />
          <g transform={isRight ? 'translate(260 0) scale(-1 1)' : undefined}
            strokeLinecap="round" strokeLinejoin="round">
            {/* The existing sneaker, glove and clothing silhouette stays intact. */}
            <path d="M111 195 Q101 220 86 237" fill="none" stroke="#25354D" strokeWidth="23" />
            <path d="M149 195 Q163 219 178 237" fill="none" stroke="#25354D" strokeWidth="23" />
            <path d="M86 233 Q74 238 57 240 Q45 241 45 251 L97 252 Q104 249 99 243 L93 237 Z"
              fill="#F8FAFC" stroke="#26344A" strokeWidth="3.2" />
            <path d="M172 236 L188 236 Q201 237 209 246 L207 252 L164 252 Q158 249 163 243 Z"
              fill="#F8FAFC" stroke="#26344A" strokeWidth="3.2" />
            <path d="M48 249 L99 249 M164 249 L207 249" stroke={color} strokeWidth="4" />
            <path d="M68 242 L84 241 M180 241 L193 245" stroke="#95A4B8" strokeWidth="2.5" />
            <path d="M99 148 Q82 153 72 174" fill="none" stroke="#26344A" strokeWidth="20" />
            <path d="M99 149 Q83 154 76 168" fill="none" stroke="#55657D" strokeWidth="13" />
            <path d="M58 166 Q61 155 74 156 Q86 157 89 169 L84 189 Q70 198 59 186 Q54 176 58 166Z"
              fill={color} stroke="#26344A" strokeWidth="3.5" />
            <path d="M62 170 Q65 164 75 164" fill="none" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="3" />
            <path d="M99 133 Q109 127 128 127 Q148 127 158 134 Q169 149 170 189 Q168 208 154 209 L106 209 Q89 203 89 185 Q91 148 99 133Z"
              fill={`url(#duel-shirt-${side})`} stroke="#26344A" strokeWidth="4" />
            <path d="M102 147 Q97 168 98 181" fill="none" stroke="#FFFFFF" strokeOpacity="0.23" strokeWidth="7" />
            <path d="M108 202 Q130 207 152 202" fill="none" stroke="#26344A" strokeOpacity="0.35" strokeWidth="4" />
            <path d="M112 131 Q129 140 146 132" fill="none" stroke="#26344A" strokeOpacity="0.34" strokeWidth="4" />
            {/* Short neutral neck connects the branded head to the original body. */}
            <rect x="118" y="117" width="24" height="26" rx="10" fill="#26344A" stroke="#26344A" strokeWidth="3" />
            <motion.g key={`punch-${roundId}`} style={{ transformOrigin: '158px 149px' }}
              initial={false} animate={reducedMotion ? undefined : rightArmMovement}
              transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeInOut' }}>
              <path d="M157 148 Q177 151 192 139" fill="none" stroke="#26344A" strokeWidth="22" />
              <path d="M160 147 Q180 147 189 140" fill="none" stroke="#55657D" strokeWidth="15" />
              <path d="M185 123 Q196 115 209 122 Q221 133 214 148 Q208 163 192 159 L181 149 Q177 134 185 123Z"
                fill={color} stroke="#26344A" strokeWidth="3.5" />
              <path d="M190 129 Q201 121 210 132" fill="none" stroke="#FFFFFF" strokeOpacity="0.54" strokeWidth="3" />
              <path d="M185 151 Q193 153 202 153" fill="none" stroke="#26344A" strokeOpacity="0.3" strokeWidth="2" />
            </motion.g>
            {attack && !reducedMotion && <motion.g key={`hit-${roundId}`}
              initial={{ opacity: 0, scale: 0.5, x: -8 }}
              animate={{ opacity: [0, 0.95, 0], scale: [0.6, 1.2, 1.5], x: [0, 12, 22] }}
              transition={{ duration: 0.56, times: [0, 0.48, 1] }}>
              <path d="M234 111 L239 100 M240 127 L253 125 M228 99 L227 90"
                stroke={color} strokeWidth="4" fill="none" />
            </motion.g>}
          </g>
          {/* Head is outside the mirrored body so no company logo is reversed. */}
          <motion.g key={`head-${roundId}`} style={{ transformOrigin: '130px 80px' }}
            initial={false} animate={reducedMotion ? undefined : headMovement}
            transition={reducedMotion ? { duration: 0 } : headTiming}>
            <circle cx="130" cy="80" r="51" fill={color} fillOpacity="0.11" />
            <circle cx="130" cy="80" r="47" fill="#26344A" stroke="#26344A" strokeWidth="3" />
            <circle cx="130" cy="80" r="41.5" fill={`url(#duel-visor-${side})`} stroke={color} strokeWidth="5" />
            <circle cx="130" cy="80" r="34" fill="#FFFFFF" stroke="#DDE6F0" strokeWidth="1.5" />
            {!logoLoaded && <text x="130" y="88" textAnchor="middle" fontSize={fallbackText.length > 4 ? 14 : fallbackText.length > 3 ? 16 : 21}
              fontWeight="800" fill="#26344A" letterSpacing="0.4">{fallbackText}</text>}
            {logoSrc && <image key={`${ticker}-${logoSourceIndex}`} href={logoSrc} x="96" y="46" width="68" height="68"
              clipPath={`url(#duel-logo-clip-${side})`} preserveAspectRatio="xMidYMid meet"
              opacity={logoLoaded ? 1 : 0}
              onLoad={() => setLogoLoaded(true)}
              onError={() => { setLogoLoaded(false); setLogoSourceIndex((index) => index + 1) }} />}
            <path d="M104 52 Q117 41 131 41" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth="3" fill="none" strokeLinecap="round" />
          </motion.g>
        </svg>
      </motion.div>
    </motion.div>
  )
}

function LaurelScore({ leftScore, rightScore, leftColor, rightColor, reducedMotion, roundId }) {
  const leaves = [
    'M83 128 Q63 136 57 120 Q72 114 83 128Z',
    'M70 116 Q73 100 88 97 Q89 111 70 116Z',
    'M59 103 Q39 109 34 93 Q49 87 59 103Z',
    'M49 86 Q50 71 66 66 Q67 80 49 86Z',
    'M46 70 Q29 71 29 55 Q43 51 46 70Z',
    'M50 54 Q53 39 69 37 Q67 49 50 54Z',
    'M57 40 Q50 27 62 21 Q70 31 57 40Z',
  ]
  const renderBranch = (color, side) => (
    <g transform={side === 'right' ? 'translate(260 0) scale(-1 1)' : undefined}>
      <path d="M91 132 C59 121 41 98 45 68 C46 51 52 38 63 26"
        fill="none" stroke={color} strokeOpacity="0.31" strokeWidth="2" strokeLinecap="round" />
      {leaves.map((shape, index) => (
        <path key={`${side}-leaf-${index}`} d={shape}
          fill={mixHex(color, '#FFFFFF', 0.52)}
          stroke={color} strokeOpacity="0.29" strokeWidth="0.8" strokeLinejoin="round" />
      ))}
    </g>
  )
  return (
    <motion.div key={`${roundId}-laurels`} className="relative z-10 flex h-[93px] w-[132px] items-center justify-center sm:h-[148px] sm:w-[210px]"
      initial={reducedMotion ? false : { opacity: 0.65, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.35, ease: 'easeOut' }}>
      <svg aria-hidden="true" viewBox="0 0 260 160"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        {renderBranch(leftColor, 'left')}
        {renderBranch(rightColor, 'right')}
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center leading-none">
        <span className="text-[27px] font-extrabold tabular-nums tracking-tight sm:text-[43px]"
          style={{ color: 'var(--text-primary)' }} aria-label={`${leftScore} to ${rightScore} points`}>
          {leftScore.toLocaleString('en-US', { maximumFractionDigits: 1 })}
          <span className="mx-1.5" style={{ color: 'var(--text-muted)' }}>:</span>
          {rightScore.toLocaleString('en-US', { maximumFractionDigits: 1 })}
        </span>
        <span className="mt-2 whitespace-nowrap text-[9px] font-medium tracking-wide sm:text-[11px]"
          style={{ color: 'var(--text-secondary)' }}>Round points</span>
      </div>
    </motion.div>
  )
}

function InteractiveDuelArena({
  left, right, colors, details, loading, reducedMotion,
  companies, selectPair, shuffle, share, copied, coverage, refreshData, hasData,
}) {
  const rounds = useMemo(() => details.filter((entry) => entry.scored), [details])
  const [step, setStep] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [replay, setReplay] = useState(0)
  const scheduled = useRef([])

  useEffect(() => {
    scheduled.current.forEach(clearTimeout)
    scheduled.current = []
    if (loading || !rounds.length) {
      setStep(-1)
      setPlaying(false)
      return undefined
    }
    if (reducedMotion) {
      setStep(rounds.length)
      setPlaying(false)
      return undefined
    }
    setStep(-1)
    setPlaying(true)
    const add = (fn, delay) => scheduled.current.push(setTimeout(fn, delay))
    rounds.forEach((_, index) => add(() => setStep(index), 550 + index * 760))
    add(() => { setStep(rounds.length); setPlaying(false) }, 950 + rounds.length * 760)
    return () => { scheduled.current.forEach(clearTimeout); scheduled.current = [] }
  }, [left, right, rounds, replay, loading, reducedMotion])

  const current = step >= 0 && step < rounds.length ? rounds[step] : null
  const finished = rounds.length > 0 && step >= rounds.length
  const completed = finished ? rounds : rounds.slice(0, Math.max(0, step + 1))
  const points = (side) => completed.reduce((sum, round) => sum + (round.winner === side ? 1 : round.winner === 'tie' ? 0.5 : 0), 0)
  const fullPoints = (side) => rounds.reduce((sum, round) => sum + (round.winner === side ? 1 : round.winner === 'tie' ? 0.5 : 0), 0)
  const winner = fullPoints('left') === fullPoints('right') ? null : fullPoints('left') > fullPoints('right') ? 'left' : 'right'
  const attackSide = current?.winner
  const label = loading ? 'Loading financials…' : !rounds.length ? 'Choose two contenders' : finished
    ? winner ? `${winner === 'left' ? left : right} takes the matchup` : 'A balanced matchup'
    : current ? current.name : 'The matchup is starting'
  const detail = current ? current.winner === 'tie' ? 'Even round' : `${current.winner === 'left' ? left : right} wins this round`
    : finished ? `${rounds.length} comparable SEC metric${rounds.length === 1 ? '' : 's'}` : 'SEC financials determine every round'
  const skip = () => { scheduled.current.forEach(clearTimeout); scheduled.current = []; setStep(rounds.length); setPlaying(false) }
  const restart = () => setReplay((value) => value + 1)
  const roundId = `${left}-${right}-${replay}-${step}`

  return (
    <section aria-label="Company matchup arena" className="relative isolate mb-10 rounded-[28px] border p-4 shadow-sm sm:p-6 lg:p-8"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
        <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${rgba(mixHex(colors.left, '#FFFFFF', 0.86), 0.46)} 0%, rgba(255,255,255,0.94) 50%, ${rgba(mixHex(colors.right, '#FFFFFF', 0.86), 0.46)} 100%), radial-gradient(ellipse at 14% 72%, ${rgba(colors.left, 0.11)}, transparent 54%), radial-gradient(ellipse at 88% 72%, ${rgba(colors.right, 0.11)}, transparent 54%)` }} />
        <div className="absolute inset-x-6 bottom-20 h-32 opacity-20" style={{ backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '42px 42px', maskImage: 'linear-gradient(to bottom, transparent, black)' }} />
      </div>

      <div className="relative z-10 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Swords size={18} className="text-primary" aria-hidden="true" />
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-text-primary">The Arena</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]" role="status" style={{ borderColor: 'var(--border)', background: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
            {loading ? 'LOADING' : !rounds.length ? 'NO ROUNDS' : finished ? 'FINAL' : step < 0 ? 'READY' : `ROUND ${step + 1} / ${rounds.length}`}
          </span>
          <button type="button" onClick={restart} disabled={!rounds.length || loading}
            className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-40" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}>
            <RefreshCw size={13} /> Replay
          </button>
          {playing && <button type="button" onClick={skip} className="rounded-full px-2 py-1.5 text-xs font-semibold text-text-muted hover:text-text-primary">Skip</button>}
        </div>
      </div>

      <div className="relative z-50 grid grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_70px_minmax(0,1fr)] sm:gap-4">
        <motion.div key={`arena-left-${left}`} className="relative min-w-0"
          initial={reducedMotion ? false : { opacity: 0, x: -24, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.3 }}>
          <CompanySelector value={left} companies={companies} opposite={right} side="left" accent={colors.left} onChange={(ticker) => selectPair(ticker, right)} />
        </motion.div>
        <div className="relative flex min-w-0 flex-col items-center justify-center gap-2">
          <div aria-hidden="true" className="flex h-10 min-w-[46px] items-center justify-center rounded-full border text-[11px] font-black tracking-[0.24em] text-text-primary shadow-sm sm:h-12 sm:min-w-[54px]"
            style={{ borderColor: 'var(--border)', background: `linear-gradient(135deg, ${rgba(colors.left, 0.16)}, rgba(255,255,255,0.96) 45%, ${rgba(colors.right, 0.16)})` }}>VS</div>
          <motion.button type="button" onClick={() => selectPair(right, left)} title="Swap contenders" aria-label="Swap companies"
            whileHover={reducedMotion ? undefined : { rotate: 180 }} whileTap={reducedMotion ? undefined : { scale: 0.91 }}
            className="flex h-8 w-8 items-center justify-center rounded-full border text-text-primary transition-all hover:-translate-y-0.5 sm:h-9 sm:w-9" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.88)' }}>
            <ArrowLeftRight size={16} />
          </motion.button>
        </div>
        <motion.div key={`arena-right-${right}`} className="relative min-w-0"
          initial={reducedMotion ? false : { opacity: 0, x: 24, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.3 }}>
          <CompanySelector value={right} companies={companies} opposite={left} side="right" accent={colors.right} onChange={(ticker) => selectPair(left, ticker)} />
        </motion.div>
      </div>

      <div className="relative z-10 mx-auto mt-1 grid h-[205px] max-w-[900px] grid-cols-[minmax(0,1fr)_84px_minmax(0,1fr)] items-end sm:mt-3 sm:h-[268px] sm:grid-cols-[minmax(0,1fr)_155px_minmax(0,1fr)] md:h-[285px]">
        <DuelFighter side="left" ticker={left} color={colors.left} attack={attackSide === 'left' || attackSide === 'tie'} defend={attackSide === 'right'} roundId={roundId} reducedMotion={reducedMotion} />
        <div className="relative flex h-full flex-col items-center justify-center">
          <LaurelScore
            leftScore={points('left')}
            rightScore={points('right')}
            leftColor={colors.left}
            rightColor={colors.right}
            reducedMotion={reducedMotion}
            roundId={roundId}
          />
          {current && !reducedMotion && <motion.div key={`spark-${roundId}`} aria-hidden="true"
            className="pointer-events-none absolute z-0 h-16 w-28 rounded-full blur-xl sm:h-24 sm:w-40"
            style={{ background: `radial-gradient(circle, ${current.winner === 'left' ? rgba(colors.left, 0.18) : current.winner === 'right' ? rgba(colors.right, 0.18) : 'rgba(15,23,42,0.08)'}, transparent 70%)` }}
            initial={{ opacity: 0.7, scale: 0.8 }} animate={{ opacity: 0, scale: 1.35 }} transition={{ duration: 0.55 }} />}
        </div>
        <DuelFighter side="right" ticker={right} color={colors.right} attack={attackSide === 'right' || attackSide === 'tie'} defend={attackSide === 'left'} roundId={roundId} reducedMotion={reducedMotion} />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-1 left-6 right-6 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${colors.left}77, var(--border) 50%, ${colors.right}77, transparent)` }} />
      </div>

      <div className="relative z-10 mx-auto mt-1 min-h-[70px] max-w-xl text-center" aria-live="polite" aria-atomic="true">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`${roundId}-text`} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: reducedMotion ? 0 : 0.2 }}>
            <p className="text-base font-extrabold text-text-primary sm:text-xl">{label}</p>
            <p className="mt-1 text-xs text-text-muted sm:text-sm">{detail}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="relative z-10 mx-auto mt-1 flex max-w-[450px] gap-1.5" role="progressbar" aria-label="Financial rounds played" aria-valuemin={0} aria-valuemax={rounds.length} aria-valuenow={completed.length}>
        {rounds.map((round, index) => <span key={round.name} className="h-1.5 min-w-0 flex-1 rounded-full transition-colors duration-300"
          style={{ background: index > step && !finished ? 'var(--border)' : round.winner === 'left' ? colors.left : round.winner === 'right' ? colors.right : 'var(--text-muted)' }} />)}
      </div>

      <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-2.5 border-t border-border pt-5 sm:gap-3">
        <button type="button" onClick={shuffle} disabled={companies.length < 2}
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-40 sm:text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}><Shuffle size={15} /> Surprise matchup</button>
        <button type="button" onClick={share}
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all hover:-translate-y-0.5 sm:text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}><Copy size={15} /> {copied ? 'Link copied' : 'Share battle'}</button>
        {hasData && <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold" style={{ borderColor: 'var(--border)', background: 'var(--surface-elevated)', color: 'var(--text-primary)' }}><Zap size={14} /> {coverage} · {rounds.length}/9</span>}
        {hasData && <button type="button" onClick={refreshData} disabled={loading} title="Reload stored SEC data from FINLINGO"
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-2 text-xs font-semibold transition-colors hover:text-primary disabled:opacity-40" style={{ color: 'var(--text-primary)' }}><RefreshCw size={14} /> Refresh</button>}
      </div>
    </section>
  )
}

function CompanySelector({ value, companies, onChange, opposite, side, accent }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const root = useRef(null)
  const input = useRef(null)
  useEffect(() => {
    if (open) input.current?.focus()
    else { setQuery(''); setActiveIndex(0) }
  }, [open])
  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  const selected = companies.find((entry) => entry.ticker === value)
  const options = companies.filter((entry) => entry.ticker !== opposite &&
    `${entry.ticker} ${entry.name} ${entry.sector || ''}`.toLowerCase().includes(query.toLowerCase()))
  const choose = (ticker) => { onChange(ticker); setOpen(false) }
  return (
    <div ref={root} className="relative min-w-0 w-full">
      <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}
        aria-haspopup="listbox" aria-expanded={open} aria-label={`Choose ${side} company`}
        onClick={() => setOpen((previous) => !previous)}
        className="group relative flex h-[84px] w-full items-center gap-2 overflow-hidden rounded-2xl border px-2.5 text-left shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:h-[94px] sm:gap-3 sm:px-4"
        style={{ borderColor: open ? accent : translucent(accent, '52'), background: `linear-gradient(115deg, ${rgba(mixHex(accent, '#FFFFFF', 0.82), 0.56)}, rgba(255,255,255,0.92) 76%)` }}>
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-extrabold sm:h-12 sm:w-12 sm:text-sm"
          style={{ color: '#FFFFFF', borderColor: accent, background: `linear-gradient(135deg, ${accent}, ${mixHex(accent, '#FFFFFF', 0.22)})`, boxShadow: `0 10px 24px ${rgba(accent, 0.22)}` }}>{value.slice(0, 2)}</span>
        <span className="relative min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-widest sm:text-[11px]" style={{ color: mixHex(accent, '#475569', 0.54) }}>{side === 'left' ? 'Contender 01' : 'Contender 02'}</span>
          <span className="mt-0.5 block text-base font-extrabold leading-tight text-text-primary sm:text-xl">{value}</span>
          <span className="mt-0.5 block truncate text-[11px] font-medium text-text-muted sm:text-sm" title={selected?.name || 'Select a company'}>{selected?.name || 'Select company'}</span>
        </span>
        <ChevronDown size={17} className={`relative shrink-0 text-text-primary transition-transform ${open ? 'rotate-180' : ''}`} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.17 }}
            className={`absolute top-full z-[100] mt-2 w-[min(330px,83vw)] overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-card ${side === 'right' ? 'right-0' : 'left-0'}`}
            role="listbox" aria-label={`${side} companies`}>
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search size={16} className="shrink-0 text-text-muted" />
              <input ref={input} value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0) }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setOpen(false)
                  if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((i) => Math.min(i + 1, options.length - 1)) }
                  if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)) }
                  if (event.key === 'Enter' && options[activeIndex]) choose(options[activeIndex].ticker)
                }}
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-text-primary outline-none placeholder:text-text-muted"
                placeholder="Search 30 companies…" aria-label="Search companies" />
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
            </div>
            <div className="max-h-72 overflow-y-auto p-1">
              {options.length ? options.map((option, index) => (
                <button key={option.ticker} role="option" aria-selected={option.ticker === value} type="button"
                  onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(option.ticker)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${index === activeIndex ? 'bg-primary/15' : 'hover:bg-primary/10'}`}>
                  <span className="w-12 shrink-0 text-sm font-bold" style={{ color: tickerAccent(option.ticker) }}>{option.ticker}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold text-text-primary">{option.name}</span><span className="block truncate text-xs text-text-muted">{option.sector || 'Company'}</span></span>
                </button>
              )) : <p className="p-4 text-center text-sm text-text-muted">No matching companies</p>}
            </div>
            <p className="border-t border-border px-3 py-2 text-xs text-text-muted">{options.length} available · ↑ ↓ to navigate</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function BattleMode(props) {
  const [params, setParams] = useSearchParams()
  const [left, setLeft] = useState(safeTicker(params.get('left')?.toUpperCase()) || 'NVDA')
  const [right, setRight] = useState(safeTicker(params.get('right')?.toUpperCase()) || 'AAPL')
  const [companies, setCompanies] = useState([])
  const [loaded, setLoaded] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [activePrompt, setActivePrompt] = useState(null)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const cache = useRef({})
  const colors = useMemo(() => battleAccents(left, right), [left, right])
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    let cancelled = false
    searchCompanies('').then((results) => {
      if (!cancelled) setCompanies((results || []).filter((c) => safeTicker(c.ticker)).sort((a, b) => a.name.localeCompare(b.name)))
    }).catch(() => { if (!cancelled) setError('Company list could not be loaded. Check that the backend is running.') })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (left === right && companies.length > 1) setRight(companies.find((c) => c.ticker !== left)?.ticker || 'AAPL')
  }, [left, right, companies])

  useEffect(() => {
    if (companies.length && (!companies.some((c) => c.ticker === left) || !companies.some((c) => c.ticker === right))) {
      setLeft((prev) => companies.some((c) => c.ticker === prev) ? prev : (companies.find((c) => c.ticker === 'NVDA')?.ticker || companies[0].ticker))
      setRight((prev) => companies.some((c) => c.ticker === prev) ? prev : (companies.find((c) => c.ticker === 'AAPL')?.ticker || companies[1]?.ticker || companies[0].ticker))
    }
  }, [companies, left, right])

  useEffect(() => {
    if (!left || !right || left === right) return undefined
    let cancelled = false
    setLoading(true)
    setError('')
    Promise.all([left, right].map(async (ticker) => {
      if (cache.current[ticker]) return [ticker, cache.current[ticker]]
      const research = await fetchCompanyResearch(ticker)
      cache.current[ticker] = research
      return [ticker, research]
    })).then((pairs) => {
      if (!cancelled) setLoaded((old) => ({ ...old, ...Object.fromEntries(pairs) }))
    }).catch(() => {
      if (!cancelled) setError('Financial comparison could not be loaded. Check your backend and try again.')
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [left, right, refreshNonce])

  const selectPair = useCallback((a, b) => {
    if (!a || !b || a === b) return
    setLeft(a); setRight(b); setActivePrompt(null); setCopied(false)
    setParams({ left: a, right: b }, { replace: true })
  }, [setParams])
  const shuffle = () => {
    if (companies.length < 2) return
    const first = companies[Math.floor(Math.random() * companies.length)].ticker
    const others = companies.filter((c) => c.ticker !== first)
    const second = others[Math.floor(Math.random() * others.length)].ticker
    selectPair(first, second)
  }
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
    } catch { setError('Could not copy the link. Use your browser address bar to share it.') }
  }
  const pairing = useMemo(() => selectFiscalPeriods(loaded[left], loaded[right]), [loaded, left, right])
  const comparison = useMemo(() => scoreHeadToHead(
    buildCompany(loaded[left], pairing.leftPeriod, colors.left),
    buildCompany(loaded[right], pairing.rightPeriod, colors.right),
  ), [loaded, left, right, pairing, colors])
  const retry = () => {
    delete cache.current[left]
    delete cache.current[right]
    setRefreshNonce((value) => value + 1)
  }
  const leftData = comparison.left
  const rightData = comparison.right
  const prompts = [
    `How does ${left}'s latest annual revenue growth compare with ${right}'s?`,
    `Which business converts more revenue into operating cash flow?`,
    `What explains the difference in operating margins between ${left} and ${right}?`,
    `How do the two balance sheets differ, and what risks need further research?`,
  ]
  const handleNavbarSidebarToggle = () => props.onSidebarToggle ? props.onSidebarToggle() : setMobileSidebarOpen(true)

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar {...props} onSidebarToggle={handleNavbarSidebarToggle} />
      <div className="flex w-full">
        <Sidebar isAuthenticated={props.isAuthenticated} user={props.user} onSignInClick={props.onSignInClick} onSignOut={props.onSignOut}
          mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)}
          onAccountNavigate={() => setMobileSidebarOpen(false)} />
        <main className="min-h-screen min-w-0 flex-1 px-4 pb-12 pt-20 sm:px-6 sm:pt-24 lg:px-8">
          <div className="mx-auto w-full max-w-[1200px]">
            <div className="mb-12 text-center">
              <div className="mb-4 flex items-center justify-center gap-3"><Swords size={36} className="text-primary" aria-hidden="true" />
                <h1 className="text-4xl font-bold text-text-primary">Battle Mode</h1>
              </div>
              <p className="text-lg text-text-muted">Pick two companies. Watch the fundamentals go head to head.</p>
            </div>
            <InteractiveDuelArena left={left} right={right} colors={colors} details={comparison.details}
              loading={loading} reducedMotion={reducedMotion} companies={companies} selectPair={selectPair}
              shuffle={shuffle} share={share} copied={copied} coverage={comparison.coverage}
              refreshData={retry} hasData={Boolean(leftData && rightData)} />
            {error && <div role="alert" className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-text-primary">
              {error}<button type="button" onClick={retry} className="rounded-lg border border-border px-3 py-1.5 font-semibold hover:border-primary">Retry connection</button>
            </div>}
            {loading && <div role="status" className="mb-8 rounded-xl border border-border bg-surface p-4 text-center text-sm text-text-muted">Loading your matchup…</div>}
            {!leftData || !rightData ? (
              !loading && <div className="mb-12 rounded-2xl border border-border bg-surface p-10 text-center text-text-muted">Select two supported companies to begin.</div>
            ) : (
              <motion.div key={`${left}-${right}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                <div className="mb-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-text-muted">
                  <Wifi size={14} className="text-emerald-400" /> SEC financials · FINLINGO
                  {leftData.period && rightData.period && <span>· FY {leftData.period} vs {rightData.period}</span>}
                  {leftData.sector && rightData.sector && leftData.sector !== rightData.sector && <span title="Ratios may differ in meaning between industries">· Cross-sector matchup</span>}
                </div>
                <BattleScore leftCompany={leftData} rightCompany={rightData} roundDetails={comparison.details} />
                <Methodology rounds={comparison.rounds} />
                <CategoryScorecard leftCompany={leftData} rightCompany={rightData} />
                <DetailedComparison leftCompany={leftData} rightCompany={rightData} />
                <AnalystSummary leftCompany={leftData} rightCompany={rightData} />
                <CompanyStrengths leftCompany={leftData} rightCompany={rightData} />
                <TradeoffSection leftCompany={leftData} rightCompany={rightData} />
                <RiskComparison leftCompany={leftData} rightCompany={rightData} />
                <FinalVerdict leftCompany={leftData} rightCompany={rightData} />
              </motion.div>
            )}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 rounded-2xl border border-border p-6 sm:p-8" style={{ background: 'var(--surface)' }}>
              <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15"><Sparkles size={20} className="text-primary" /></div><h3 className="text-xl font-bold text-text-primary sm:text-2xl">Research Questions</h3></div>
              <p className="mb-6 text-sm text-text-muted">Dig deeper into this matchup.</p>
              <div className="flex flex-wrap gap-3">{prompts.map((prompt) => (
                <button key={prompt} onClick={() => setActivePrompt(activePrompt === prompt ? null : prompt)} type="button" aria-pressed={activePrompt === prompt}
                  className={`rounded-lg border px-4 py-3 text-left text-sm transition-all hover:-translate-y-0.5 sm:text-base ${activePrompt === prompt ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-muted hover:border-primary hover:text-primary'}`}>{prompt}</button>
              ))}</div>
              <AnimatePresence>{activePrompt && <motion.div key={activePrompt} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="mt-5 rounded-xl border border-border bg-surface-elevated/40 p-4"><p className="mb-2 font-semibold text-text-primary">Research focus</p><p className="text-sm text-text-muted">{activePrompt}</p><p className="mt-3 text-sm text-text-muted">Compare their SEC filings and reported periods.</p><div className="mt-3 flex gap-4 text-sm"><a className="font-semibold text-primary hover:underline" href={`/dashboard?ticker=${left}`}>{left} Research</a><a className="font-semibold text-primary hover:underline" href={`/dashboard?ticker=${right}`}>{right} Research</a></div></div></motion.div>}</AnimatePresence>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 rounded-2xl border border-border p-6 sm:p-8" style={{ background: 'var(--surface)' }}>
              <h3 className="mb-8 text-xl font-bold text-text-primary sm:text-2xl">Continue Your Research</h3>
              <div className="grid gap-8 md:grid-cols-2">{[left, right].map((ticker) => <div key={ticker}>
                <h4 className="mb-4 text-xl font-semibold text-text-primary">{ticker}</h4>
                <div className="space-y-3">
                  <a className="block text-base text-text-muted transition-colors hover:text-primary" href={`/dashboard?ticker=${ticker}#finlingo-financial`}>→ Financials</a>
                  <a className="block text-base text-text-muted transition-colors hover:text-primary" href={`https://www.sec.gov/edgar/search/#/q=${encodeURIComponent(ticker)}`} target="_blank" rel="noreferrer">→ SEC Filings</a>
                  <a className="block text-base text-text-muted transition-colors hover:text-primary" href={`/dashboard?ticker=${ticker}#finlingo-news`}>→ Recent News</a>
                  <a className="block text-base text-text-muted transition-colors hover:text-primary" href={`/dashboard?ticker=${ticker}#finlingo-business`}>→ Company Overview</a>
                </div></div>)}</div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  )
}
