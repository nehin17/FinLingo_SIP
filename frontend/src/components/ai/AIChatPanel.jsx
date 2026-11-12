import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, LoaderCircle, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import DemoOrb from '../demo/DemoOrb.jsx'
import { api } from '../../services/api.js'

const initialMessages = [
  {
    id: 'welcome',
    role: 'assistant',
    content: "Hi, I'm Atlas. I can help you navigate FinLingo, understand finance and markets, research companies, and find recent information.",
    sources: [],
  },
]

const quickPrompts = [
  'What is a P/E ratio?',
  'Explain recent market trends',
  'How do I use my watchlist?',
]

function getPageContext() {
  return `Current route: ${window.location.pathname}${window.location.search}`
}

function getTicker() {
  const params = new URLSearchParams(window.location.search)
  const ticker = params.get('ticker')
  return ticker ? ticker.trim().toUpperCase() : null
}

function MessageContent({ message, isUser }) {
  if (isUser) return <p className="whitespace-pre-wrap">{message.content}</p>

  return (
    <div className="atlas-markdown space-y-2 break-words [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_a]:text-blue-500 [&_a]:underline [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_td]:border [&_th]:p-1.5 [&_td]:p-1.5 [&_th]:text-left [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-2 [&_pre]:bg-black/10">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
      {message.sources?.length > 0 && (
        <div className="border-t pt-2 mt-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold mb-1">Sources</p>
          <ul className="list-disc pl-4 space-y-1">
            {message.sources.map((source, index) => (
              <li key={`${source.url}-${index}`} className="text-xs">
                <a href={source.url} target="_blank" rel="noreferrer" className="text-blue-500 underline">
                  {source.title || source.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function AIChatPanel({ onClose }) {
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (prompt) => {
    const content = prompt.trim()
    if (!content || loading) return

    const userMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content,
      sources: [],
    }
    const previousTurns = messages
      .filter((message) => message.id !== 'welcome' && ['user', 'assistant'].includes(message.role))
      .slice(-12)
      .map(({ role, content: turnContent }) => ({ role, content: turnContent }))

    setMessages((current) => [...current, userMessage])
    setInput('')
    setLoading(true)

    try {
      const data = await api.ai.chat({
        message: content,
        ticker: getTicker(),
        pageContext: getPageContext(),
        history: previousTurns,
      })
      setMessages((current) => [...current, {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: data?.response || 'Atlas returned an empty response. Please try again.',
        sources: Array.isArray(data?.sources) ? data.sources : [],
      }])
    } catch (error) {
      console.error('Atlas request failed:', error)
      setMessages((current) => [...current, {
        id: `${Date.now()}-error`,
        role: 'assistant',
        content: error?.message || 'Atlas could not connect. Check that the backend is running and try again.',
        sources: [],
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage(input)
  }

  return (
    <motion.section
      role="dialog"
      aria-modal="false"
      aria-label="FinLingo AI Assistant"
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.97 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex flex-col overflow-hidden w-[calc(100vw-2rem)] sm:w-[390px] h-[min(640px,calc(100vh-7rem))] rounded-2xl sm:rounded-3xl border"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: '0 24px 70px rgba(15, 23, 42, 0.22)' }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <DemoOrb size={34} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Atlas</p>
              <span className="text-[10px] font-medium" style={{ color: '#16A34A' }}>● Online</span>
            </div>
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>FinLingo AI Assistant</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close AI assistant" className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ color: 'var(--text-muted)' }}>
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4" aria-live="polite">
        {messages.map((message) => {
          const isUser = message.role === 'user'
          return (
            <motion.div key={message.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && <DemoOrb size={28} className="mt-0.5 shrink-0" />}
              <div className="max-w-[86%] rounded-2xl px-3.5 py-3 text-sm leading-relaxed" style={isUser
                ? { color: '#FFFFFF', background: 'linear-gradient(135deg, #2563EB, #4F46E5)', borderBottomRightRadius: '6px' }
                : { color: 'var(--text)', background: 'var(--surface-elevated, rgba(148, 163, 184, 0.12))', borderBottomLeftRadius: '6px' }}>
                <MessageContent message={message} isUser={isUser} />
              </div>
            </motion.div>
          )
        })}

        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5">
              <DemoOrb size={28} animated />
              <div className="rounded-2xl rounded-bl-md px-3.5 py-3" style={{ background: 'var(--surface-elevated, rgba(148, 163, 184, 0.12))' }}>
                <LoaderCircle size={16} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {messages.length === 1 && !loading && (
          <div className="pt-2">
            <p className="text-xs font-medium mb-2.5" style={{ color: 'var(--text-muted)' }}>Suggested questions</p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button key={prompt} type="button" onClick={() => sendMessage(prompt)} className="rounded-full border px-3 py-1.5 text-xs transition-colors" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'transparent' }}>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <input value={input} onChange={(event) => setInput(event.target.value)} disabled={loading} placeholder="Ask Atlas anything..." aria-label="Ask Atlas a question" className="min-w-0 flex-1 bg-transparent outline-none text-sm" style={{ color: 'var(--text)' }} />
          <button type="submit" disabled={!input.trim() || loading} aria-label="Send message" className="w-8 h-8 rounded-lg flex items-center justify-center text-white disabled:opacity-40 shrink-0" style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)' }}>
            {loading ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowUp size={16} />}
          </button>
        </div>
        <p className="text-[10px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>Atlas provides educational information, not personalized investment advice.</p>
      </form>
    </motion.section>
  )
}
