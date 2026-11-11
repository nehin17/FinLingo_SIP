import { useState } from 'react'
import { motion } from 'framer-motion'

export default function PECalculator() {
  const [sharePrice, setSharePrice] = useState(100)
  const [eps, setEps] = useState(5)

  const peRatio = eps > 0 ? (sharePrice / eps).toFixed(2) : 0

  const getInterpretation = () =>
    'P/E is the price paid per unit of reported earnings. Compare with relevant peers, growth, earnings quality and reporting dates before drawing a valuation conclusion.'

  return (
    <div className="rounded-xl p-6 border border-border" style={{ background: 'var(--surface)' }}>
      <h3 className="text-lg font-bold text-text-primary mb-6">P/E Ratio Calculator</h3>

      <div className="space-y-6">
        {/* Share Price Input */}
        <div>
          <label className="text-sm font-semibold text-text-primary block mb-3">Share Price (₹)</label>
          <input
            type="range"
            min="10"
            max="500"
            value={sharePrice}
            onChange={(e) => setSharePrice(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-text-muted">₹10</span>
            <span className="text-2xl font-bold text-text-primary">₹{sharePrice}</span>
            <span className="text-sm text-text-muted">₹500</span>
          </div>
        </div>

        {/* EPS Input */}
        <div>
          <label className="text-sm font-semibold text-text-primary block mb-3">Earnings Per Share (₹)</label>
          <input
            type="range"
            min="0.5"
            max="50"
            step="0.5"
            value={eps}
            onChange={(e) => setEps(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-text-muted">₹0.50</span>
            <span className="text-2xl font-bold text-text-primary">₹{eps}</span>
            <span className="text-sm text-text-muted">₹50</span>
          </div>
        </div>

        {/* Result */}
        <motion.div
          key={peRatio}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-lg border border-primary/30"
          style={{ background: 'var(--surface-elevated)' }}
        >
          <p className="text-sm text-text-muted mb-2 font-semibold">Calculated P/E Ratio</p>
          <p className="text-4xl font-bold text-primary mb-4">{peRatio}x</p>
          <p className="text-sm text-text-secondary leading-relaxed">
            {getInterpretation()}
          </p>
        </motion.div>
      </div>
    </div>
  )
}