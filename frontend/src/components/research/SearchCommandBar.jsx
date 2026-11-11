
// src/components/research/SearchCommandBar.jsx

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, CornerDownLeft, Clock3 } from 'lucide-react'

export default function SearchCommandBar({
  suggestions = [],
  loading = false,
  onQuery,
  onSelect,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const inputRef = useRef(null)
  const wrapRef = useRef(null)

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handleKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Click outside closes palette
  useEffect(() => {
    const handleClick = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Debounced API-ready query callback
  useEffect(() => {
    const timer = setTimeout(() => {
      onQuery?.(query.trim())
    }, 250)

    return () => clearTimeout(timer)
  }, [query, onQuery])

  const items = useMemo(() => suggestions, [suggestions])

  const handleSelect = (ticker) => {
    onSelect?.(ticker)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border shadow-sm transition-all duration-200 focus-within:border-primary/50 focus-within:shadow-md"
        style={{ background: 'var(--surface-elevated)' }}
      >
        <Search size={17} className="text-text-muted shrink-0" />

        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Choose a company or search by name or ticker…"
          aria-label="Search companies"
          aria-expanded={open}
          aria-controls="finlingo-company-options"
          role="combobox"
          autoComplete="off"
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
            if (event.key === 'Enter' && open && items.length > 0) {
              event.preventDefault()
              handleSelect(items[0].ticker)
            }
          }}
          className="flex-1 min-w-0 bg-transparent text-sm text-text-primary placeholder:text-slate-600 dark:placeholder:text-slate-300 focus:outline-none"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}

        <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 text-[11px] font-semibold text-slate-800 dark:text-white">
          ⌘K
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="absolute z-40 left-0 right-0 mt-2 rounded-2xl border border-border shadow-2xl overflow-hidden backdrop-blur-xl"
            style={{ background: 'var(--surface)' }}
          >
            <div className="px-4 py-2 border-b border-border text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">
              {query.trim() ? `${items.length} matching companies` : `All companies · ${items.length}`}
            </div>

            {loading && (
              <div className="px-4 py-4 text-sm text-text-muted flex items-center gap-2">
                <Clock3 size={14} />
                Searching market database…
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="px-4 py-4 text-sm text-text-secondary">
                {query.trim() ? 'No matching companies found.' : 'Company directory unavailable.'}
              </div>
            )}

            <div id="finlingo-company-options" role="listbox" className="max-h-[380px] overflow-y-auto overscroll-contain">
            {!loading &&
              items.map((item) => (
                <button
                  key={item.ticker}
                  type="button"
                  onClick={() => handleSelect(item.ticker)}
                  role="option"
                  aria-selected="false"
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-elevated focus:bg-surface-elevated focus:outline-none transition-colors duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                      {item.ticker.slice(0, 2)}
                    </span>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">
                        {item.name}
                        <span className="text-text-secondary font-normal">
                          {' '}· {item.ticker}
                        </span>
                      </p>

                      <p className="text-[11px] text-text-muted truncate">
                        {item.exchange} · {item.sector}
                      </p>
                    </div>
                  </div>

                  <CornerDownLeft
                    size={13}
                    className="text-text-muted shrink-0"
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

