
import { motion } from 'framer-motion'

export default function DetailedComparison({
  leftCompany,
  rightCompany,
}) {
  // Create a union of metric keys from both companies
  const metrics = Array.from(
    new Set([
      ...Object.keys(leftCompany?.metrics || {}),
      ...Object.keys(rightCompany?.metrics || {}),
    ])
  )

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3
            className="text-2xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Head-to-Head Metrics
          </h3>

          <p
            className="text-sm mt-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Financial figures, fiscal periods, and SEC source links.
          </p>
        </div>
      </div>

      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Header */}
        <div
          className="grid grid-cols-3 px-6 py-4 border-b text-sm font-semibold"
          style={{
            background: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
          }}
        >
          <div style={{ color: 'var(--text-primary)' }}>
            {leftCompany?.ticker}
          </div>

          <div
            className="text-center uppercase tracking-wide"
            style={{ color: 'var(--text-muted)' }}
          >
            Metric
          </div>

          <div
            className="text-right"
            style={{ color: 'var(--text-primary)' }}
          >
            {rightCompany?.ticker}
          </div>
        </div>

        {/* Rows */}
        {metrics.map((metric, index) => {
          const leftMetric = leftCompany?.metrics?.[metric]
          const rightMetric = rightCompany?.metrics?.[metric]

          const leftScore =
            typeof leftMetric?.score === 'number'
              ? leftMetric.score
              : null

          const rightScore =
            typeof rightMetric?.score === 'number'
              ? rightMetric.score
              : null

          const leftWins =
            leftScore !== null &&
            rightScore !== null &&
            leftScore > rightScore

          const rightWins =
            leftScore !== null &&
            rightScore !== null &&
            rightScore > leftScore

          return (
            <motion.div
              key={metric}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.2,
                delay: index * 0.03,
              }}
              className="grid grid-cols-3 items-center px-6 py-5 border-b last:border-b-0 transition-colors hover:bg-[var(--surface-elevated)]"
              style={{ borderColor: 'var(--border)' }}
            >
              {/* Left */}
              <div>
                <p
                  className="font-bold text-xl sm:text-2xl"
                  style={{
                    color: 'var(--text-primary)',
                  }}
                >
                  {leftMetric?.value ?? '—'}
                </p>

                {leftWins && (
                  <span
                    className="text-xs font-semibold mt-1 inline-block"
                    style={{ color: 'var(--success)' }}
                  >
                    ✓ Winner
                  </span>
                )}
              </div>

              {/* Center */}
              <div className="text-center px-3">
                <p
                  className="text-sm font-medium leading-snug"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {metric}
                </p>
                {leftMetric?.period && rightMetric?.period && (
                  <p className="mt-1 text-[11px] leading-tight text-[color:var(--text-muted)]">FY {leftMetric.period.slice(0, 4)} / {rightMetric.period.slice(0, 4)}</p>
                )}
                {(leftMetric?.unscored || rightMetric?.unscored) && (
                  <p className="mt-1 text-[11px] leading-tight text-[color:var(--text-muted)]">Reference only</p>
                )}
                {(leftMetric?.sourceUrl || rightMetric?.sourceUrl) && (
                  <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px]">
                    {leftMetric?.sourceUrl && <a href={leftMetric.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--primary)' }}>{leftCompany?.ticker} source</a>}
                    {rightMetric?.sourceUrl && <a href={rightMetric.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--primary)' }}>{rightCompany?.ticker} source</a>}
                  </div>
                )}
              </div>

              {/* Right */}
              <div className="text-right">
                <p
                  className="font-bold text-xl sm:text-2xl"
                  style={{
                    color: 'var(--text-primary)',
                  }}
                >
                  {rightMetric?.value ?? '—'}
                </p>

                {rightWins && (
                  <span
                    className="text-xs font-semibold mt-1 inline-block"
                    style={{ color: 'var(--success)' }}
                  >
                    ✓ Winner
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-[color:var(--text-muted)]">Scored using aligned annual periods · Undated P/E is reference-only.</p>
    </div>
  )
}

