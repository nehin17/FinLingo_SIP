import { api } from './api.js'

const asNumber = (value) => value == null ? null : (Number.isFinite(Number(value)) ? Number(value) : null)

// Finnhub stores market capitalization in USD millions.
function formatMarketCap(millions) {
  const value = asNumber(millions)
  if (value == null) return '—'
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}T`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}B`
  return `$${value.toFixed(0)}M`
}

export async function searchCompanies(query = '') {
  // Searches our curated PostgreSQL catalog only (no Finnhub calls).
  const results = await api.companies.search(query)
  return Array.isArray(results) ? results : []
}

const RECENT_NEWS_DAYS = 7
// Final presentation guard for records saved before backend relevance filtering.
// Only show stories explicitly naming this company or a distinctive product.
const headlineAliases = {
  AAPL: /\b(?:apple|iphone|ipad|macbook|app store)\b/i,
  ADBE: /\badobe\b/i, AMD: /\b(?:amd|advanced micro devices)\b/i,
  AMZN: /\b(?:amazon|amazon web services|aws|prime video)\b/i,
  BA: /\bboeing\b/i, COST: /\bcostco\b/i, CRM: /\bsalesforce\b/i,
  CSCO: /\bcisco\b/i, CVX: /\bchevron\b/i, DIS: /\bdisney\b/i,
  GOOGL: /\b(?:alphabet|google|youtube)\b/i, HD: /\bhome depot\b/i,
  INTC: /\bintel\b/i, JNJ: /\b(?:johnson\s*(?:&|and)\s*johnson|j&j)\b/i,
  JPM: /\b(?:jpmorgan|j\.?p\.?\s*morgan)\b/i, KO: /\bcoca[ -]?cola\b/i,
  MA: /\bmastercard\b/i, MCD: /\bmcdonald['’]?s\b/i,
  META: /\b(?:meta|facebook|instagram|whatsapp)\b/i,
  MSFT: /\b(?:microsoft|azure|xbox)\b/i, NFLX: /\bnetflix\b/i,
  NKE: /\bnike\b/i, NVDA: /\bnvidia\b/i, ORCL: /\boracle\b/i,
  PG: /\b(?:procter\s*(?:&|and)\s*gamble|p&g)\b/i,
  TSLA: /\btesla\b/i, UNH: /\b(?:unitedhealth(?:care)?|optum)\b/i,
  V: /\bvisa\b/i, WMT: /\b(?:walmart|wal-mart)\b/i,
  XOM: /\b(?:exxonmobil|exxon|mobil oil)\b/i,
}

function isCompanyHeadline(ticker, headline) {
  const pattern = headlineAliases[ticker]
  if (!pattern || typeof headline !== 'string' || !pattern.test(headline)) return false
  if (ticker === 'V' && /\b(?:immigration|tourist|student|work|travel)\s+visa\b|\bvisa\s+(?:ban|application|rules|requirements)\b/i.test(headline)) return false
  return true
}

const eventTypes = [
  { type: 'Earnings & guidance', pattern: /\b(?:earnings|quarterly results?|financial results?|revenue (?:growth|beat|falls?|rises?)|profit (?:beat|falls?|rises?)|guidance|earnings outlook|forecasts?)\b/i,
    relevance: 'Could affect earnings expectations and the valuation outlook.' },
  { type: 'Analyst action', pattern: /\b(?:upgrad(?:e|es|ed)|downgrad(?:e|es|ed)|price targets?|rating (?:raised|cut)|initiates coverage)\b/i,
    relevance: 'A change in analyst expectations may influence market sentiment.' },
  { type: 'Pricing & revenue', pattern: /\b(?:pricing|price (?:hike|increase|cut|reduction)|subscription (?:price|fee)|monetiz(?:e|ation|ing)|revenue opportunit(?:y|ies))\b/i,
    relevance: 'Pricing changes could affect demand, revenue or margins.' },
  { type: 'Mergers & acquisitions', pattern: /\b(?:acquisition|acquires?|merger|takeover|buyout|divestiture|spinoff)\b/i,
    relevance: 'A transaction may change the company’s scale, strategy or financial position.' },
  { type: 'Regulatory & legal', pattern: /\b(?:antitrust|regulator|regulation|investigation|lawsuit|settlement|approval|tariffs?|court ruling|legal challenge)\b/i,
    relevance: 'Legal or regulatory developments may affect operations and risk.' },
  { type: 'Operations & products', pattern: /\b(?:launch(?:es|ed)?|unveil(?:s|ed)?|rollouts?|production|deliver(?:s|ed|ies)|orders?|contract|partnership|recall|layoffs?|supply deal)\b/i,
    relevance: 'This development may affect demand, costs or execution.' },
  { type: 'Capital allocation', pattern: /\b(?:dividend|buyback|repurchase|share offering|debt offering|bond issuance)\b/i,
    relevance: 'Financing or capital allocation decisions may affect shareholder returns.' },
]

function freshNews(items, ticker) {
  const now = Date.now()
  const cutoff = now - RECENT_NEWS_DAYS * 86400000
  const seenUrls = new Set()
  const seenHeadlines = new Set()
  return (Array.isArray(items) ? items : [])
    .filter((n) => n && n.url && n.headline && n.publishedAt && isCompanyHeadline(ticker, n.headline))
    .map((n) => ({ ...n, publishedMs: Date.parse(n.publishedAt) }))
    .filter((n) => Number.isFinite(n.publishedMs) && n.publishedMs >= cutoff && n.publishedMs <= now + 600000)
    .sort((a, b) => b.publishedMs - a.publishedMs)
    .filter((n) => {
      const url = n.url.trim()
      const headline = n.headline.trim().replace(/\s+/g, ' ').toLowerCase()
      if (!/^https:\/\//i.test(url) || seenUrls.has(url) || seenHeadlines.has(headline)) return false
      seenUrls.add(url)
      seenHeadlines.add(headline)
      return true
    })
    .slice(0, 12)
}

function possibleCatalysts(items, filings) {
  const events = items.flatMap((article) => {
    const matched = eventTypes.find(({ pattern }) => pattern.test(article.headline || ''))
    if (!matched) return []
    return [{ date: article.publishedAt, title: article.headline, type: matched.type,
      description: matched.relevance, source: article.source || '',
      url: article.url, impact: 'neutral' }]
  })
  // Company-specific filings already come from financial_fact WHERE ticker = ?.
  // A recent filing is a verifiable event, not evidence of a price reaction.
  const now = Date.now()
  const filingEvents = (Array.isArray(filings) ? filings : []).flatMap((filing) => {
    const date = filing.period?.match(/^Filed (\d{4}-\d{2}-\d{2})$/)?.[1]
    const timestamp = date ? Date.parse(`${date}T00:00:00Z`) : NaN
    if (!Number.isFinite(timestamp) || now - timestamp > 30 * 86400000 || timestamp > now) return []
    return [{ date, title: 'New SEC financial filing', type: 'SEC filing',
      description: 'Review the filed results, disclosures and risk factors.',
      source: 'SEC EDGAR', url: filing.url, impact: 'neutral' }]
  }).slice(0, 1)
  return [...events, ...filingEvents]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 5)
}

export async function fetchCompanyResearch(ticker) {
  const symbol = ticker.trim().toUpperCase()
  const [response, newsResult] = await Promise.all([
    api.companies.getByTicker(symbol),
    api.companies.getNews(symbol).catch((error) => {
      console.warn('Stored news unavailable:', error)
      return []
    }),
  ])

  const history = (response.chartData ?? [])
    .map((point) => ({
      timestamp: Date.parse(`${point.date}T12:00:00Z`),
      price: asNumber(point.value),
    }))
    .filter((point) => Number.isFinite(point.timestamp) && point.price != null)
    .sort((a, b) => a.timestamp - b.timestamp)

  const price = asNumber(response.price)
  const latest = response.latestPriceDate || null
  const previousClose = history.length >= 2 ? history[history.length - 2].price : null
  const changeAmount = price != null && previousClose != null ? price - previousClose : null
  const changePercent = changeAmount != null && previousClose > 0
    ? (changeAmount / previousClose) * 100 : null

  // SEC values are stored in raw USD. Tables use USD millions throughout.
  const metricLabels = {
    revenue: ['Revenue', 'income'],
    gross_profit: ['Gross Profit', 'income'],
    operating_income: ['Operating Income', 'income'],
    net_income: ['Net Income', 'income'],
    assets: ['Total Assets', 'balance'],
    liabilities: ['Total Liabilities', 'balance'],
    equity: ['Shareholders Equity', 'balance'],
    cash: ['Cash & Equivalents', 'balance'],
    operating_cash_flow: ['Operating Cash Flow', 'cashFlow'],
    capital_expenditures: ['Capital Expenditures', 'cashFlow'],
  }
  const actualFacts = Array.isArray(response.financialFacts) ? response.financialFacts : []

  function buildStatement(kind) {
    const available = actualFacts.filter((fact) => fact.periodKind === kind)
    const periods = [...new Set(available.map((fact) => fact.periodEnd).filter(Boolean))]
      .sort().reverse().slice(0, 4)
    const statement = { periods, income: [], balance: [], cashFlow: [] }
    Object.entries(metricLabels).forEach(([metric, [label, section]]) => {
      const values = periods.map((period) => {
        const fact = available.find((f) => f.metric === metric && f.periodEnd === period)
        if (!fact) return null
        const usd = asNumber(fact.valueUsd)
        return {
          period,
          value: usd == null ? null : usd / 1_000_000,
          sourceUrl: fact.sourceUrl || null,
          filedAt: fact.filedAt || null,
        }
      }).filter(Boolean)
      if (values.length) statement[section].push({ label, format: 'currency', values })
    })
    return statement
  }

  const annual = buildStatement('FY')
  const quarterly = buildStatement('Q')
  const hasStatements = annual.periods.length > 0 || quarterly.periods.length > 0
  const latestRevenue = annual.income.find((row) => row.label === 'Revenue')
    ?.values.find((value) => value.period === annual.periods[0]) || null

  // Company metrics use reported full-fiscal-year SEC facts where available.
  // All amounts in statement rows are USD millions, not raw USD.
  const fyMetric = (label, index = 0) => {
    const period = annual.periods[index]
    if (!period) return null
    const row = [...annual.income, ...annual.balance, ...annual.cashFlow]
      .find((item) => item.label === label)
    const fact = row?.values?.find((item) => item.period === period)
    return Number.isFinite(fact?.value) ? { value: fact.value, period } : null
  }
  const formatFiscalAmount = (millions) => {
    const magnitude = Math.abs(millions)
    const sign = millions < 0 ? '−' : ''
    if (magnitude >= 1_000_000) return `${sign}$${(magnitude / 1_000_000).toFixed(2)}T`
    if (magnitude >= 1_000) return `${sign}$${(magnitude / 1_000).toFixed(2)}B`
    return `${sign}$${magnitude.toFixed(1)}M`
  }
  const dateLabel = (period) => `FY${period.slice(0, 4)} · SEC`
  const samePeriod = (a, b) => a && b && a.period === b.period
  const revenue = fyMetric('Revenue')
  const earlierRevenue = fyMetric('Revenue', 1)
  const operatingIncome = fyMetric('Operating Income')
  const netIncome = fyMetric('Net Income')
  const operatingCash = fyMetric('Operating Cash Flow')
  const capex = fyMetric('Capital Expenditures')
  const totalAssets = fyMetric('Total Assets')
  const snapshot = []

  const marketCap = asNumber(response.marketCapitalization)
  if (marketCap != null && marketCap > 0) snapshot.push({
    label: 'Market Capitalization', value: formatMarketCap(marketCap),
    sub: 'Stored market metric · date not provided',
  })
  const pe = asNumber(response.pe)
  if (pe != null && pe > 0) snapshot.push({
    label: 'P/E Ratio', value: `${pe.toFixed(2)}x`,
    sub: 'Stored market metric · date not provided',
  })
  if (revenue) snapshot.push({
    label: 'Annual Revenue', value: formatFiscalAmount(revenue.value),
    sub: dateLabel(revenue.period),
  })
  // Never call a multi-year jump year-over-year growth.
  const gapDays = samePeriod(revenue, earlierRevenue)
    ? 0 : revenue && earlierRevenue
      ? Math.abs(Date.parse(revenue.period) - Date.parse(earlierRevenue.period)) / 86400000
      : NaN
  if (revenue && earlierRevenue && earlierRevenue.value > 0 && gapDays >= 330 && gapDays <= 400) {
    const growth = ((revenue.value / earlierRevenue.value) - 1) * 100
    snapshot.push({ label: 'Revenue Growth',
      value: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`,
      sub: `${dateLabel(revenue.period)} · vs prior FY`, tone: growth < 0 ? 'down' : growth > 0 ? 'up' : 'flat',
    })
  }
  if (samePeriod(netIncome, revenue) && revenue.value !== 0) snapshot.push({
    label: 'Net Profit Margin',
    value: `${(netIncome.value / revenue.value * 100).toFixed(1)}%`,
    sub: dateLabel(revenue.period),
  })
  if (samePeriod(operatingIncome, revenue) && revenue.value !== 0) snapshot.push({
    label: 'Operating Margin',
    value: `${(operatingIncome.value / revenue.value * 100).toFixed(1)}%`,
    sub: dateLabel(revenue.period),
  })
  if (operatingCash) snapshot.push({
    label: 'Operating Cash Flow', value: formatFiscalAmount(operatingCash.value),
    sub: dateLabel(operatingCash.period),
  })
  if (samePeriod(operatingCash, capex)) snapshot.push({
    label: 'Free Cash Flow',
    value: formatFiscalAmount(operatingCash.value - Math.abs(capex.value)),
    sub: `${dateLabel(operatingCash.period)} · OCF − capex`,
  })
  if (totalAssets) snapshot.push({
    label: 'Total Assets', value: formatFiscalAmount(totalAssets.value),
    sub: dateLabel(totalAssets.period),
  })
  if (!snapshot.length && netIncome) snapshot.push({
    label: 'Net Income', value: formatFiscalAmount(netIncome.value),
    sub: dateLabel(netIncome.period),
  })

  const revenueSegments = (response.revenueSegments || []).map((segment) => ({
    label: segment.label,
    share: asNumber(segment.share),
    valueUsd: asNumber(segment.valueUsd),
  }))

  const filings = [...new Map(actualFacts
    .filter((fact) => typeof fact.sourceUrl === 'string' && /^https:\/\/www\.sec\.gov\//i.test(fact.sourceUrl))
    .sort((a, b) => String(b.filedAt || '').localeCompare(String(a.filedAt || '')))
    .map((fact) => [fact.sourceUrl, {
      label: 'SEC filing source',
      period: fact.filedAt ? `Filed ${fact.filedAt}` : '',
      url: fact.sourceUrl,
      id: fact.sourceUrl,
    }]))
    .values()].slice(0, 3)

  const recentNews = freshNews(newsResult, symbol)
  const catalysts = possibleCatalysts(recentNews, filings)

  return {
    company: {
      ticker: response.ticker,
      name: response.name,
      sector: response.sector,
      exchange: response.exchange,
      country: response.country === 'US' ? 'United States' : response.country,
      price,
      change: changePercent,
      changeAmount,
      status: { label: 'Historical data', updated: latest },
    },
    snapshot,
    business: {
      summary: response.description || '',
      founded: response.foundedYear ?? null,
      headquarters: response.headquarters || null,
      industry: response.sector || null,
      // Not inferred. This becomes available only after SEC financial-data integration.
      reporting: annual.periods.length ? `Annual SEC data · through ${annual.periods[0]}` : null,
      segments: revenueSegments,
      segmentPeriod: response.segmentPeriod,
      segmentBasis: response.segmentBasis,
      totalReportedRevenue: latestRevenue?.value == null ? null : latestRevenue.value * 1_000_000,
      revenuePeriod: latestRevenue?.period || null,
      revenueSourceUrl: latestRevenue?.sourceUrl || null,
      segmentSourceUrl: response.segmentSourceUrl,
      sourceUrl: response.descriptionSourceUrl,
      sourceName: response.descriptionSourceName,
      updatedAt: response.descriptionUpdatedAt,
    },
    chart: history,
    // These data sets are not yet available in the backend; NEVER substitute Apple mock metrics.
    financials: hasStatements ? { annual, quarterly } : null,
    valuation: [],
    profitability: [],
    balanceSheet: [],
    growth: [],
    competitivePosition: null,
    catalysts,
    news: recentNews.map((n) => ({
      id: n.id,
      source: n.source,
      headline: n.headline,
      date: n.publishedAt,
      url: n.url,
    })),
    filings,
    peers: [],
  }
}

// Printable, self-contained research report. The browser's native print dialog
// allows "Save as PDF" without another dependency or a paid PDF service.
function reportEscape(value) {
  return String(value ?? '—').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

function reportLink(url, label) {
  if (typeof url !== 'string' || !/^https:\/\//i.test(url)) return ''
  return `<a href="${reportEscape(url)}">${reportEscape(label)}</a>`
}

function reportDate(value) {
  if (!value) return 'Not recorded'
  const d = new Date(`${String(value).slice(0, 10)}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function reportMillions(value) {
  return Number.isFinite(value) ? (value < 0 ? `(${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 1 })})` : value.toLocaleString('en-US', { maximumFractionDigits: 1 })) : '—'
}

function reportStatement(title, statement, key) {
  const rows = statement?.[key] || []
  const periods = statement?.periods || []
  if (!rows.length || !periods.length) return ''
  return `<section><h2>${reportEscape(title)}</h2><table><thead><tr><th>Metric (USD millions)</th>${periods.map((p) => `<th>${reportEscape(p)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr><td>${reportEscape(r.label)}</td>${periods.map((p) => `<td class="num">${reportMillions(r.values?.find((v) => v.period === p)?.value)}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`
}

export function openPrintableResearchReport(research, review, framework = []) {
  if (!research?.company?.ticker) throw new Error('Choose a company before exporting.')
  const company = research.company
  const annual = research.financials?.annual
  const business = research.business || {}
  const items = framework.map((item) => {
    const a = review?.answers?.[item.id] || {}
    return `<tr><td>${reportEscape(item.group)}</td><td>${reportEscape(a.status ? ({ reviewed: 'Reviewed', supported: 'Reviewed', na: 'Reviewed', concern: 'Needs follow-up', followup: 'Needs follow-up' }[a.status] || 'Not reviewed') : 'Not reviewed')}</td><td class="note">${reportEscape(a.note || '—')}</td></tr>`
  }).join('')
  const segments = (business.segments || []).filter((s) => Number.isFinite(s.valueUsd))
  const totalSegments = segments.reduce((sum, s) => sum + s.valueUsd, 0)
  const hasMix = segments.length > 0 && totalSegments > 0
  const latestPrice = Number.isFinite(company.price) ? `$${company.price.toFixed(2)}` : 'Not available'
  const date = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>${reportEscape(company.ticker)} · FINLINGO Research Report</title><style>
    @page{size:A4;margin:17mm 15mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#172638;margin:0;font-size:10.5px;line-height:1.5}header{border-bottom:3px solid #2b65a5;padding-bottom:13px;margin-bottom:20px}.brand{font-weight:800;font-size:12px;letter-spacing:2.1px;color:#2b65a5}h1{margin:5px 0 2px;font-size:26px;line-height:1.1}h2{font-size:15px;margin:19px 0 8px;color:#152f50;border-bottom:1px solid #cdd7e1;padding-bottom:5px}p{margin:6px 0;white-space:pre-wrap}.sub{color:#63758b;font-size:10px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.metric{padding:11px;border:1px solid #dce3eb;border-radius:6px}.metric b{display:block;font-size:15px;margin-top:4px}.label{font-size:9px;text-transform:uppercase;color:#63758b;letter-spacing:.5px}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{padding:7px 8px;text-align:left;border-bottom:1px solid #e4e9ee;vertical-align:top;overflow-wrap:anywhere}th{background:#f0f4f8;color:#334d69;font-size:9px}td.num,th:not(:first-child){text-align:right;font-variant-numeric:tabular-nums}td.note{white-space:pre-wrap}a{color:#235b92;text-decoration:underline;overflow-wrap:anywhere}section{break-inside:avoid;margin-bottom:13px}table{break-inside:auto}tr{break-inside:avoid}.disclaimer{margin-top:21px;padding-top:9px;border-top:1px solid #dce3eb;color:#64748b;font-size:9px}button{border:0} @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  </style></head><body>
    <header><div class="brand">FINLINGO / EQUITY RESEARCH</div><h1>${reportEscape(company.name || company.ticker)} <span class="sub">(${reportEscape(company.ticker)})</span></h1><div class="sub">${reportEscape(company.sector || 'Industry not recorded')} · ${reportEscape(company.exchange || '')} · Report generated ${reportEscape(date)}</div></header>
    <div class="grid"><div class="metric"><span class="label">Last stored share price</span><b>${reportEscape(latestPrice)}</b><div class="sub">Recorded ${reportEscape(reportDate(company.status?.updated))}</div></div><div class="metric"><span class="label">Annual SEC reporting</span><b>${reportEscape(annual?.periods?.[0] || 'Not available')}</b><div class="sub">Fiscal period end</div></div><div class="metric"><span class="label">Revenue composition</span><b>${hasMix ? `${segments.length} categories` : 'Unavailable'}</b><div class="sub">${reportEscape(business.segmentPeriod || 'No verified breakdown imported')}</div></div></div>
    <section><h2>Company profile</h2><p>${reportEscape(business.summary || 'A verified company description has not been imported.')}</p><p class="sub">${reportLink(business.sourceUrl, business.sourceName || 'Business profile source')}</p></section>
    ${reportStatement('Income statement · annual', annual, 'income')}
    ${reportStatement('Balance sheet · annual', annual, 'balance')}
    ${reportStatement('Cash flow · annual', annual, 'cashFlow')}
    <section><h2>Revenue mix ${business.segmentPeriod ? `· ${reportEscape(business.segmentPeriod)}` : ''}</h2>
      ${hasMix ? `<table><thead><tr><th>Reported category (${reportEscape(business.segmentBasis || 'reported basis')})</th><th>Revenue (USD M)</th><th>Share of imported categories</th></tr></thead><tbody>${segments.map((s) => `<tr><td>${reportEscape(s.label)}</td><td class="num">${reportMillions(s.valueUsd / 1e6)}</td><td class="num">${(s.valueUsd / totalSegments * 100).toFixed(1)}%</td></tr>`).join('')}</tbody></table><p class="sub">Mix percentages are relative to the sum of imported categories; this may differ from consolidated revenue. ${reportLink(business.segmentSourceUrl, 'SEC segment source')}</p>` : '<p>Category-level revenue breakdown has not been verified and imported for this company.</p>'}
    </section>
    <section><h2>Analyst assessment · Personal research notes</h2><p class="sub">Statements below are the author’s review notes, not SEC-reported facts or FINLINGO recommendations.</p><table><thead><tr><th>Review area</th><th>Status</th><th>Notes</th></tr></thead><tbody>${items}</tbody></table><h3>Investment thesis</h3><p>${reportEscape(review?.thesis || 'No thesis recorded.')}</p></section>
    <section><h2>SEC source filings</h2>${(research.filings || []).slice(0, 6).map((f) => `<p>${reportLink(f.url, `${f.label || 'SEC filing'} · ${f.period || ''}`)}</p>`).join('') || '<p>No filing URLs attached to this report.</p>'}</section>
    <p class="disclaimer">Educational research worksheet only; not investment advice. Market prices may be stale. Financial facts represent available stored SEC records and may be incomplete for some companies. Personal notes are stored on the user's browser, not synchronized to an account.</p>
  </body></html>`
  // Opening from a direct click keeps pop-up blockers from blocking the print view.
  const printableWindow = window.open('', '_blank')
  if (!printableWindow) throw new Error('Your browser blocked the report window. Please allow pop-ups for FINLINGO and retry.')
  printableWindow.document.open()
  printableWindow.document.write(html)
  printableWindow.document.close()
  printableWindow.focus()
  // Give the newly written page an opportunity to layout before printing.
  printableWindow.setTimeout(() => printableWindow.print(), 450)
  return true
}
