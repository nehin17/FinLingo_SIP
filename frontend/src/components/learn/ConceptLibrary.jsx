import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronDown, BookOpen } from 'lucide-react'
import { LESSONS } from '../../data/learningCurriculum.js'
import { learningService } from '../../services/learningService.js'

const CATEGORY_NAMES = ['All', 'Valuation', 'Accounting', 'Cash Flow', 'Competitive Advantage', 'Other Terms']
const categoryFor = (lesson) => {
  if (lesson.pathId === 'valuation-fundamentals') return 'Valuation'
  if (lesson.pathId === 'financial-statements') return 'Accounting'
  if (lesson.pathId === 'cash-flow-mastery') return 'Cash Flow'
  return 'Competitive Advantage'
}

export default function ConceptLibrary() {
  const [remote, setRemote] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [expanded, setExpanded] = useState(null)
  const [visibleCount, setVisibleCount] = useState(9)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    learningService.terms().then((data) => { if (!cancelled) setRemote(Array.isArray(data) ? data : []) })
      .catch(() => { /* Curated curriculum glossary remains available if the terms API is offline. */ })
    return () => { cancelled = true }
  }, [])

  const concepts = useMemo(() => {
    const originals = LESSONS.map((lesson) => ({ id: lesson.id, name: lesson.title, category: categoryFor(lesson), description: lesson.explanation, details: lesson.formula, lessonId: lesson.id }))
    const known = new Set(originals.map((entry) => entry.name.toLowerCase()))
    const backend = remote.filter((term) => term && typeof term.term === 'string' && term.term.trim() && !known.has(term.term.trim().toLowerCase()))
      .map((term) => ({ id: `db-${term.id || term.term}`, name: term.term, category: 'Other Terms', description: term.shortDefinition || term.longDefinition || '', details: term.longDefinition || '' }))
    return [...originals, ...backend]
  }, [remote])
  const filtered = concepts.filter((entry) => (category === 'All' || entry.category === category) &&
    `${entry.name} ${entry.description} ${entry.category}`.toLowerCase().includes(query.trim().toLowerCase()))
  const shown = filtered.slice(0, visibleCount)
  const updateQuery = (value) => { setQuery(value); setVisibleCount(9); setExpanded(null) }
  const updateCategory = (value) => { setCategory(value); setVisibleCount(9); setExpanded(null) }

  return <section className="mb-14" aria-label="Concept Library">
    <div className="mb-5"><h2 className="text-2xl font-bold text-text-primary">Concept Library</h2><p className="mt-2 text-sm text-text-secondary">Use this glossary while studying. Open a term to see its method and jump directly to the full lesson.</p></div>
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-border px-4" style={{ background: 'var(--surface)' }}><Search size={17} className="text-text-muted"/><input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="Search concepts, formulas, or financial terms…" className="w-full bg-transparent py-3 text-sm text-text-primary outline-none placeholder:text-text-muted" /></div>
    <div className="mb-6 flex flex-wrap gap-2">{CATEGORY_NAMES.map((name) => <button key={name} onClick={() => updateCategory(name)} className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
      style={{ background: category === name ? 'var(--primary)' : 'var(--surface)', borderColor: category === name ? 'var(--primary)' : 'var(--border)', color: category === name ? '#FFFFFF' : 'var(--text)' }}>{name}</button>)}</div>
    <p className="mb-3 text-xs text-text-muted">{filtered.length} matching concepts · Showing {Math.min(visibleCount, filtered.length)}</p>
    <div className="grid gap-3 md:grid-cols-2">{shown.map((entry) => <article key={entry.id} className="rounded-xl border border-border p-5" style={{ background: 'var(--surface)' }}>
      <button type="button" onClick={() => setExpanded(expanded === entry.id ? null : entry.id)} className="flex w-full items-start justify-between gap-3 text-left" aria-expanded={expanded === entry.id}>
        <span><span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary"><BookOpen size={13}/>{entry.category}</span><span className="block text-base font-bold text-text-primary">{entry.name}</span></span>
        <ChevronDown size={18} className={`shrink-0 text-text-muted transition-transform ${expanded === entry.id ? 'rotate-180' : ''}`}/>
      </button>
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-text-secondary">{entry.description}</p>
      {expanded === entry.id && <div className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-text-secondary">
        <p>{entry.details || 'Open the related lesson for additional worked examples and practice.'}</p>
        {entry.lessonId && <button type="button" onClick={() => { const lesson = LESSONS.find((item) => item.id === entry.lessonId); if (lesson) { navigate(`/learn?path=${encodeURIComponent(lesson.pathId)}&lesson=${encodeURIComponent(lesson.id)}`); window.scrollTo({ top: 0, behavior: 'smooth' }) } }}
          className="mt-3 font-semibold text-primary hover:underline">Study this concept in its lesson →</button>}
      </div>}
    </article>)}
      {!filtered.length && <p className="col-span-full rounded-xl border border-border p-5 text-sm text-text-secondary">No concepts match your search.</p>}
    </div>
    {visibleCount < filtered.length && <div className="mt-5 text-center"><button type="button" onClick={() => setVisibleCount((count) => count + 9)} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-text-primary hover:border-primary">Show more concepts</button></div>}
  </section>
}
