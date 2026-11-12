import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import DemoOrb from '../demo/DemoOrb.jsx'
import AIChatPanel from './AIChatPanel.jsx'

export default function FloatingAIAssistant() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <div
      id="finlingo-ai-assistant"
      className="fixed right-5 bottom-5 sm:right-6 sm:bottom-6 z-[100] flex flex-col items-end gap-4"
    >
      <AnimatePresence>
        {open && (
          <div id="atlas-chat-panel">
            <AIChatPanel onClose={() => setOpen(false)} />
          </div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="atlas-chat-panel"
        aria-label={open ? 'Close FinLingo AI Assistant' : 'Open FinLingo AI Assistant'}
        title={open ? 'Close AI Assistant' : 'Open FinLingo AI Assistant'}
        whileHover={{ y: -4, scale: 1.04 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-16 h-16 rounded-2xl flex items-center justify-center border transition-shadow duration-200"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: open
            ? '0 14px 36px rgba(37, 99, 235, 0.26)'
            : '0 10px 28px rgba(15, 23, 42, 0.18)',
        }}
      >
        <DemoOrb size={48} animated={!open} />
        <AnimatePresence>
          {open && (
            <motion.span
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}
              className="absolute -right-1 -top-1 w-6 h-6 rounded-full flex items-center justify-center border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              <X size={13} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}
