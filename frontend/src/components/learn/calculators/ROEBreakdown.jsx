import { useState } from 'react'
import { motion } from 'framer-motion'

export default function ROEBreakdown() {
  const [netIncome, setNetIncome] = useState(500)
  const [equity, setEquity] = useState(5000)
  const [debt, setDebt] = useState(2000)

  const roe = equity > 0 ? ((netIncome / equity) * 100).toFixed(2) : 0
  const simplifiedCapital = parseFloat(equity) + parseFloat(debt)
  const debtToEquity = equity > 0 ? (debt / equity).toFixed(2) : 0

  return (
    <div className="rounded-xl p-6 border border-border" style={{ background: 'var(--surface)' }}>
      <h3 className="text-lg font-bold text-text-primary mb-6">ROE Breakdown Tool</h3>

      <div className="space-y-6">
        {/* Net Income */}
        <div>
          <label className="text-sm font-semibold text-text-primary block mb-3">
            Net Income (₹ Cr)
          </label>
          <input
            type="range"
            min="50"
            max="2000"
            step="50"
            value={netIncome}
            onChange={(e) => setNetIncome(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-center mt-2">
            <span className="text-2xl font-bold text-text-primary">₹{netIncome} Cr</span>
          </div>
        </div>

        {/* Equity */}
        <div>
          <label className="text-sm font-semibold text-text-primary block mb-3">
            Shareholder Equity (₹ Cr)
          </label>
          <input
            type="range"
            min="1000"
            max="20000"
            step="500"
            value={equity}
            onChange={(e) => setEquity(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-center mt-2">
            <span className="text-2xl font-bold text-text-primary">₹{equity} Cr</span>
          </div>
        </div>

        {/* Debt */}
        <div>
          <label className="text-sm font-semibold text-text-primary block mb-3">
            Total Debt (₹ Cr)
          </label>
          <input
            type="range"
            min="0"
            max="10000"
            step="500"
            value={debt}
            onChange={(e) => setDebt(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-center mt-2">
            <span className="text-2xl font-bold text-text-primary">₹{debt} Cr</span>
          </div>
        </div>

        {/* Results */}
        <motion.div
          key={`${netIncome}-${equity}-${debt}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-lg border border-primary/30 space-y-3"
          style={{ background: 'var(--surface-elevated)' }}
        >
          <div className="flex justify-between items-center border-b border-border/50 pb-3">
            <span className="text-sm text-text-muted">Return on Equity (ROE)</span>
            <span className="text-3xl font-bold text-primary">{roe}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-text-muted">Debt-to-Equity Ratio</span>
            <span className="font-bold text-text-primary">{debtToEquity}x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-text-muted">Equity + Debt (Illustrative)</span>
            <span className="font-bold text-text-primary">₹{simplifiedCapital.toFixed(0)} Cr</span>
          </div>
          <p className="text-xs text-text-secondary pt-3 border-t border-border/50">
            Higher leverage (debt) can artificially inflate ROE in good times but increases
            financial risk. Equity plus debt does not represent all company assets or liabilities.
          </p>
        </motion.div>
      </div>
    </div>
  )
}