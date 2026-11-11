import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import CaseStudyCard from './CaseStudyCard'
import { caseStudies } from '../../data/caseStudies'

export default function FeaturedCaseStudies() {
  const scrollRef = useRef(null)

  const scroll = (direction) => {
    if (!scrollRef.current) return

    scrollRef.current.scrollBy({
      left: direction === 'left' ? -360 : 360,
      behavior: 'smooth',
    })
  }

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary">
          Featured Case Studies
        </h2>

        <p className="text-sm text-text-secondary mt-2">
          Guided research labs with annual SEC figures, analytical methods and practical questions.
        </p>
      </div>

      <div className="relative px-8">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scroll-smooth"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {caseStudies.map((caseStudy) => (
            <CaseStudyCard
              key={caseStudy.id || caseStudy.slug}
              caseStudy={caseStudy}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => scroll('left')}
          aria-label="Previous case studies"
          className="
            absolute
            left-0
            top-1/2
            -translate-y-1/2
            w-10
            h-10
            rounded-full
            border
            flex
            items-center
            justify-center
            text-text-muted
            hover:text-primary
            hover:border-primary
            transition-all
          "
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <ChevronLeft size={20} />
        </button>

        <button
          type="button"
          onClick={() => scroll('right')}
          aria-label="Next case studies"
          className="
            absolute
            right-0
            top-1/2
            -translate-y-1/2
            w-10
            h-10
            rounded-full
            border
            flex
            items-center
            justify-center
            text-text-muted
            hover:text-primary
            hover:border-primary
            transition-all
          "
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  )
}