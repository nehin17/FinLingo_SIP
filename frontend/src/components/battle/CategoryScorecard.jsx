import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Trophy } from 'lucide-react'

const CATEGORIES = {
  growth: { name: 'Growth', description: 'Annual revenue expansion.', metrics: ['Revenue Growth'] },
  profitability: { name: 'Profitability', description: 'Reported margin efficiency and return on equity.', metrics: ['Gross Margin', 'Operating Margin', 'Net Margin', 'ROE'] },
  cash: { name: 'Cash Flow', description: 'Cash generated relative to sales.', metrics: ['Operating Cash Flow Margin', 'Free Cash Flow Margin'] },
  valuation: { name: 'Valuation', description: 'Stored market multiples; not scored without a verified date.', metrics: ['P/E Ratio'] },
  health: { name: 'Financial Health', description: 'Capitalization and liabilities relative to equity.', metrics: ['Equity / Assets', 'Liabilities / Equity'] },
}

export default function CategoryScorecard({
  leftCompany,
  rightCompany,
}) {
  const [expanded, setExpanded] = useState(null)

  // ------------------------------------------------------------
  // Safe score calculation
  // Handles missing metrics from future API responses
  // ------------------------------------------------------------
  const getCategoryScore = (company, categoryKey) => {
    const category = CATEGORIES[categoryKey]

    if (!company?.metrics || !category) return null

    const scores = category.metrics
      .map((metric) => company.metrics?.[metric]?.score)
      .filter((score) => typeof score === 'number')

    if (!scores.length) return null

    return Math.round(
      scores.reduce((total, score) => total + score, 0) /
        scores.length
    )
  }

  const getCategoryWinner = (categoryKey) => {
    const leftScore = getCategoryScore(leftCompany, categoryKey)
    const rightScore = getCategoryScore(rightCompany, categoryKey)

    if (leftScore === null || rightScore === null) return null
    if (leftScore > rightScore) return 'left'
    if (rightScore > leftScore) return 'right'

    return null
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3
            className="text-2xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Category Performance
          </h3>

          <p
            className="text-sm mt-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Scored fundamental rounds by category.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(CATEGORIES).map(
          ([key, category]) => {
            const leftScore = getCategoryScore(
              leftCompany,
              key
            )

            const rightScore = getCategoryScore(
              rightCompany,
              key
            )

            const winner = getCategoryWinner(key)

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                whileHover={{ y: -4 }} whileTap={{ scale: 0.99 }}
                className="rounded-xl border p-5 cursor-pointer transition-all duration-200 hover:shadow-sm"
                style={{
                  background: 'var(--surface-elevated)',
                  borderColor: winner === 'left' ? `${leftCompany?.color}70` : winner === 'right' ? `${rightCompany?.color}70` : 'var(--border)',
                  boxShadow: winner ? `inset 0 0 0 1px ${(winner === 'left' ? leftCompany?.color : rightCompany?.color)}18` : undefined,
                }}
                role="button"
                tabIndex={0}
                aria-expanded={expanded === key}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setExpanded(expanded === key ? null : key)
                  }
                }}
                onClick={() => setExpanded(expanded === key ? null : key)}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h4
                      className="font-semibold text-lg"
                      style={{
                        color: 'var(--text-primary)',
                      }}
                    >
                      {category.name}
                    </h4>

                    <p
                      className="text-sm mt-1 leading-relaxed"
                      style={{
                        color: 'var(--text-muted)',
                      }}
                    >
                      {category.description}
                    </p>
                  </div>

                  <motion.div
                    animate={{
                      rotate:
                        expanded === key ? 180 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 mt-1"
                  >
                    <ChevronDown
                      size={18}
                      style={{
                        color: 'var(--text-muted)',
                      }}
                    />
                  </motion.div>
                </div>

                {/* Scores */}
                <div className="space-y-4">
                  {/* Left company */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-sm font-medium"
                        style={{
                          color: 'var(--text-primary)',
                        }}
                      >
                        {leftCompany?.ticker}
                      </span>

                      <span
                        className="text-sm font-semibold"
                        style={{
                          color: 'var(--text-primary)',
                        }}
                      >
                        {leftScore ?? '—'}
                      </span>
                    </div>

                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{
                        background:
                          'var(--surface-elevated)',
                      }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${leftScore ?? 0}%`,
                        }}
                        transition={{
                          duration: 0.8,
                          ease: 'easeOut',
                        }}
                        className="h-full rounded-full"
                        style={{
                          background:
                            leftCompany?.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Right company */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-sm font-medium"
                        style={{
                          color: 'var(--text-primary)',
                        }}
                      >
                        {rightCompany?.ticker}
                      </span>

                      <span
                        className="text-sm font-semibold"
                        style={{
                          color: 'var(--text-primary)',
                        }}
                      >
                        {rightScore ?? '—'}
                      </span>
                    </div>

                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{
                        background:
                          'var(--surface-elevated)',
                      }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${rightScore ?? 0}%`,
                        }}
                        transition={{
                          duration: 0.8,
                          ease: 'easeOut',
                        }}
                        className="h-full rounded-full"
                        style={{
                          background:
                            rightCompany?.color,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Winner */}
                <div
                  className="mt-4 pt-4 border-t flex items-center justify-between"
                  style={{
                    borderColor: 'var(--border)',
                  }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: 'var(--text-muted)',
                    }}
                  >
                    {winner
                      ? `${winner === 'left'
                          ? leftCompany?.ticker
                          : rightCompany?.ticker} leads`
                      : leftScore === null || rightScore === null ? 'Not scored' : 'Tied'}
                  </span>

                  {winner && (
                    <motion.div key={`${winner}-${leftCompany?.ticker}-${rightCompany?.ticker}`} initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold"
                      style={{ background: `${winner === 'left' ? leftCompany?.color : rightCompany?.color}20`, color: winner === 'left' ? leftCompany?.color : rightCompany?.color }}>
                      <Trophy size={13} /> Round lead
                    </motion.div>
                  )}
                </div>

                {/* Expanded details */}
                <AnimatePresence initial={false}>
                  {expanded === key && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        height: 0,
                      }}
                      animate={{
                        opacity: 1,
                        height: 'auto',
                      }}
                      exit={{
                        opacity: 0,
                        height: 0,
                      }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="mt-4 pt-4 border-t space-y-3"
                        style={{
                          borderColor: 'var(--border)',
                        }}
                      >
                        {category.metrics.map(
                          (metric) => (
                            <div
                              key={metric}
                              className="grid grid-cols-[1fr_auto_auto] gap-4 items-center text-sm"
                            >
                              <span
                                style={{
                                  color: 'var(--text-muted)',
                                }}
                              >
                                {metric}
                              </span>

                              <span
                                className="font-medium text-right"
                                style={{
                                  color:
                                    leftCompany?.color,
                                }}
                              >
                                {leftCompany?.metrics?.[
                                  metric
                                ]?.value ?? 'N/A'}
                              </span>

                              <span
                                className="font-medium text-right"
                                style={{
                                  color:
                                    rightCompany?.color,
                                }}
                              >
                                {rightCompany?.metrics?.[
                                  metric
                                ]?.value ?? 'N/A'}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          }
        )}
      </div>
    </div>
  )
}