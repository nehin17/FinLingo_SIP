import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { BookOpen, Flame, Flower2, MoonStar, Sprout } from 'lucide-react'
import './GrowthThemes.css'

const TOTAL_LESSONS = 31
const THEME_STORAGE_KEY = 'finlingo_growth_visual_theme_v2'
const VISUAL_THEMES = [
  { id: 'garden', label: 'Botanical Garden', Icon: Flower2 },
  { id: 'atlas', label: 'Star Atlas', Icon: MoonStar },
]

const GARDEN_STAGES = [
  { min: 0, title: 'The seed', description: 'Every great idea begins somewhere.' },
  { min: 1, title: 'First sprout', description: 'A new understanding is beginning to grow.' },
  { min: 5, title: 'Young sapling', description: 'Your first connections are taking shape.' },
  { min: 12, title: 'Branching out', description: 'Your understanding stretches across new subjects.' },
  { min: 21, title: 'In bloom', description: 'A flourishing collection of financial concepts.' },
  { min: 31, title: 'The complete garden', description: 'All 31 lessons completed. Keep nurturing what you know.' },
]

const ATLAS_STAGES = [
  { min: 0, title: 'The first horizon', description: 'Your sky is ready for the first discovery.' },
  { min: 1, title: 'First light', description: 'Your first completed lesson is now a star.' },
  { min: 5, title: 'Finding a pattern', description: 'New insights are beginning to connect.' },
  { min: 12, title: 'A growing constellation', description: 'Your understanding reaches across new ideas.' },
  { min: 21, title: 'An illuminated sky', description: 'Your research knowledge is taking shape.' },
  { min: 31, title: 'The full star atlas', description: 'All 31 stars shine in your learning atlas.' },
]

// Hand-positioned leaves: one unique decorative detail is earned per saved lesson.
const LEAF_POSITIONS = [
  [218, 253, -48, 1.55], [262, 236, 44, 1.5], [220, 197, -44, 1.22], [263, 180, 46, 1.18],
  [181, 246, -48, 1], [155, 229, -56, .95], [291, 240, 43, 1], [321, 226, 54, .92],
  [187, 219, -60, .96], [282, 211, 51, .9], [217, 228, -25, .82], [260, 220, 25, .85],
  [141, 192, -52, .96], [115, 178, -54, .84], [179, 181, -36, .93], [210, 175, -30, .92],
  [266, 169, 34, .91], [296, 182, 44, .94], [346, 191, 54, .92], [362, 171, 55, .84],
  [188, 151, -42, .92], [167, 124, -60, .84], [224, 138, -25, .87], [250, 128, 22, .88],
  [290, 135, 35, .9], [315, 113, 53, .84], [139, 142, -49, .94], [104, 150, -62, .83],
  [342, 148, 50, .92], [208, 105, -26, .85], [270, 103, 29, .85],
]

const BRANCHES = [
  { at: 1, path: 'M241 353 C236 319 239 286 239 251' },
  { at: 2, path: 'M239 251 C244 229 237 206 239 191' },
  { at: 4, path: 'M239 191 C236 174 237 162 238 151' },
  { at: 5, path: 'M239 256 C217 246 199 235 174 236' },
  { at: 7, path: 'M240 246 C262 232 280 235 315 219' },
  { at: 9, path: 'M239 226 C215 218 194 208 180 201' },
  { at: 10, path: 'M242 228 C267 212 275 203 287 195' },
  { at: 12, path: 'M241 216 C244 191 240 172 238 145' },
  { at: 13, path: 'M239 191 C209 181 170 185 139 175' },
  { at: 15, path: 'M240 189 C213 175 198 164 180 157' },
  { at: 17, path: 'M241 186 C275 177 309 185 346 180' },
  { at: 19, path: 'M238 169 C258 152 276 147 306 143' },
  { at: 21, path: 'M237 151 C213 138 195 125 167 122' },
  { at: 23, path: 'M238 145 C241 122 239 111 239 93' },
  { at: 25, path: 'M242 136 C270 121 293 124 321 110' },
  { at: 27, path: 'M209 180 C176 163 136 149 109 146' },
  { at: 29, path: 'M238 111 C221 102 208 99 193 95' },
]

const STAR_POSITIONS = [
  [174, 319], [240, 300], [314, 311], [347, 272], [298, 249], [238, 253], [174, 240],
  [115, 258], [103, 212], [161, 195], [223, 205], [281, 188], [337, 204], [383, 187],
  [354, 152], [297, 151], [234, 160], [172, 155], [132, 134], [194, 119], [252, 112],
  [308, 105], [378, 114], [404, 78], [335, 73], [270, 73], [200, 73], [142, 82],
  [91, 101], [86, 162], [416, 146],
]

function useSavedVisualTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'atlas' ? 'atlas' : 'garden'
    } catch {
      return 'garden'
    }
  })

  useEffect(() => {
    try { localStorage.setItem(THEME_STORAGE_KEY, theme) } catch { /* Local preference only */ }
  }, [theme])

  return [theme, setTheme]
}

function PaintedLeaf({ x, y, angle, size, index, reducedMotion }) {
  const shades = ['#718e65', '#8aa57b', '#a3b68d', '#6d987f', '#b1ab73']
  const color = shades[index % shades.length]
  const blossom = index >= 4 && index % 4 === 0

  return <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${size})`}>
    <motion.g initial={reducedMotion ? false : { opacity: 0, scale: .65 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reducedMotion ? 0 : .48, ease: 'easeOut', delay: reducedMotion ? 0 : Math.min(index * .022, .35) }}>
    <path d="M0 0 C4 -14 17 -22 26 -17 C29 -5 18 3 0 0Z" fill={color} fillOpacity=".94"/>
    <path d="M0 0 Q12 -10 25 -17" fill="none" stroke="#f9f0d8" strokeOpacity=".7" strokeWidth="1"/>
    <path d="M8 -8 Q8 -15 12 -17 M14 -11 Q19 -10 21 -9" fill="none" stroke="#eef1d5" strokeOpacity=".65" strokeWidth=".65"/>
    {blossom && <g transform="translate(26 -18)">
      {[0, 72, 144, 216, 288].map((rotation) => <ellipse key={rotation} cx="0" cy="-5" rx="3.8" ry="6.6"
        transform={`rotate(${rotation})`} fill="#fff9ed" stroke="#e6c6a1" strokeWidth=".65"/>)}
      <circle r="3.2" fill="#deb368"/><circle r="1.2" fill="#985f35"/>
    </g>}
    </motion.g>
  </g>
}

function GardenArtwork({ count, reducedMotion }) {
  return <svg viewBox="0 0 480 410" className="pg-growth-artwork" role="img"
    aria-label={`A painted botanical garden grown from a seed, showing ${count} of 31 learned concepts`}>
    <defs>
      <linearGradient id="pg-garden-paper" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#faf3e8"/><stop offset=".56" stopColor="#f8f5e9"/><stop offset="1" stopColor="#eee7d6"/>
      </linearGradient>
      <radialGradient id="pg-garden-sun"><stop offset="0" stopColor="#ffe4af" stopOpacity=".78"/><stop offset="1" stopColor="#ffe4af" stopOpacity="0"/></radialGradient>
      <linearGradient id="pg-garden-wood" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#806446"/><stop offset=".56" stopColor="#a07b55"/><stop offset="1" stopColor="#7f6148"/>
      </linearGradient>
      <linearGradient id="pg-garden-leaf" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#b5cba7"/><stop offset="1" stopColor="#71946e"/>
      </linearGradient>
      <filter id="pg-garden-texture" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".45" numOctaves="3" seed="7" result="noise"/>
        <feColorMatrix in="noise" type="saturate" values="0"/>
      </filter>
      <filter id="pg-garden-soft"><feGaussianBlur stdDeviation="9"/></filter>
    </defs>
    <rect width="480" height="410" rx="20" fill="url(#pg-garden-paper)"/>
    <ellipse cx="360" cy="100" rx="145" ry="106" fill="url(#pg-garden-sun)" opacity=".9"/>
    <circle cx="352" cy="111" r="34" fill="#e9c997" opacity=".22"/>
    <path d="M-5 269 C70 215 136 239 203 223 C261 207 326 228 375 208 C426 189 473 220 487 220 L487 408 H-5Z" fill="#c1d0c5" opacity=".44"/>
    <path d="M-5 313 C83 291 123 265 210 293 C288 316 343 260 487 277 L487 410 H-5Z" fill="#a5c2b4" opacity=".31"/>
    <path d="M-5 341 C91 324 169 353 231 331 C324 303 370 333 486 318 L486 410 H-5Z" fill="#d8d7bb" opacity=".47"/>
    <ellipse cx="239" cy="360" rx="130" ry="22" fill="#c7aa84" opacity=".2" filter="url(#pg-garden-soft)"/>
    <ellipse cx="85" cy="139" rx="78" ry="63" fill="#e3c8c0" opacity=".18" filter="url(#pg-garden-soft)"/>
    <ellipse cx="403" cy="214" rx="82" ry="67" fill="#c1cfac" opacity=".2" filter="url(#pg-garden-soft)"/>
    <path d="M49 347 Q105 324 152 345 M321 341 Q365 326 416 335" fill="none" stroke="#b6ae8d" strokeWidth="1.3" opacity=".43"/>
    <g opacity=".48" fill="none" stroke="#8b9e7a" strokeWidth="1.4" strokeLinecap="round">
      <path d="M77 360 q-8 -16 -4 -25 M73 347 q-7 -7 -10 -6 M76 350 q7 -8 12 -7"/>
      <path d="M398 355 q4 -20 1 -27 M398 344 q-8 -8 -14 -6 M399 342 q8 -8 12 -5"/>
      <path d="M418 358 q7 -9 7 -18 M418 352 l-7 -7"/>
    </g>
    <g transform="translate(0 -2)">
      <ellipse cx="240" cy="360" rx="50" ry="11" fill="#856348" opacity=".20"/>
      <path d="M196 363 Q240 370 284 363 L275 392 Q239 405 205 392Z" fill="#b88d68" stroke="#98704e" strokeWidth="1.25"/>
      <path d="M199 367 Q240 377 281 367" fill="none" stroke="#efdfc4" strokeOpacity=".65" strokeWidth="1.6"/>
      <path d="M208 385 Q240 396 272 385" fill="none" stroke="#8c674b" strokeOpacity=".46" strokeWidth="1"/>
      <ellipse cx="240" cy="362" rx="46" ry="8" fill="#9f7856" stroke="#936b4b" strokeWidth="1"/>
      <ellipse cx="240" cy="359" rx="43" ry="5.6" fill="#69523e"/>
      <path d="M232 361 Q240 348 248 360 Q241 369 235 366Z" fill="#c6a076" stroke="#5d4737" strokeWidth="1"/>
      <path d="M234 356 Q241 353 245 358" stroke="#f3d9ab" strokeWidth="1" fill="none"/>
      <circle cx="215" cy="379" r="1.4" fill="#e7cba5" opacity=".6"/><circle cx="264" cy="378" r="1.4" fill="#e7cba5" opacity=".6"/>
    </g>
    {BRANCHES.filter((branch) => count >= branch.at).map((branch) =>
      <motion.path key={branch.path} d={branch.path} fill="none" stroke="url(#pg-garden-wood)"
        strokeWidth={branch.at < 5 ? 4.6 : branch.at < 12 ? 3.5 : 2.6}
        strokeLinecap="round" strokeLinejoin="round"
        initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : .72, ease: 'easeOut' }}/>
    )}
    {LEAF_POSITIONS.slice(0, count).map(([x, y, angle, size], index) =>
      <PaintedLeaf key={`garden-leaf-${index}`} x={x} y={y} angle={angle} size={size}
        index={index} reducedMotion={reducedMotion}/>
    )}
    {count >= 2 && <g transform="translate(239 189)" opacity=".95">
      <path d="M0 0 C-6 -6 -5 -16 0 -21 C6 -16 6 -7 0 0Z" fill="#e8d6b5" stroke="#b7a37e" strokeWidth="1"/>
      <path d="M0 -2 C-2 -9 -1 -15 0 -19" stroke="#d2ad71" strokeOpacity=".6" fill="none"/>
    </g>}
    <rect width="480" height="410" rx="20" fill="#a18f6e" opacity=".055" filter="url(#pg-garden-texture)" style={{ mixBlendMode: 'multiply' }}/>
    <path d="M22 384 Q235 377 456 386" fill="none" stroke="#a6a58b" strokeOpacity=".16"/>
    <text x="24" y="32" fontFamily="Georgia, serif" fontStyle="italic" fontSize="15" fill="#79735e">finlingo · a learning garden</text>
    <text x="455" y="388" textAnchor="end" fontFamily="Georgia, serif" fontStyle="italic" fontSize="12" fill="#9b957f">{count} / 31</text>
  </svg>
}

function AtlasArtwork({ count, reducedMotion }) {
  const points = STAR_POSITIONS.slice(0, count)
  return <svg viewBox="0 0 480 410" className="pg-growth-artwork" role="img"
    aria-label={`A painted celestial atlas with ${count} out of 31 lesson stars illuminated`}>
    <defs>
      <linearGradient id="pg-atlas-night" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#151829"/><stop offset=".5" stopColor="#343150"/><stop offset="1" stopColor="#58516b"/>
      </linearGradient>
      <radialGradient id="pg-atlas-moon"><stop offset="0" stopColor="#ffeed0" stopOpacity="1"/><stop offset="1" stopColor="#efd8a9" stopOpacity=".86"/></radialGradient>
      <radialGradient id="pg-atlas-lavender"><stop offset="0" stopColor="#ddb1c7" stopOpacity=".34"/><stop offset="1" stopColor="#ddb1c7" stopOpacity="0"/></radialGradient>
      <filter id="pg-atlas-blur"><feGaussianBlur stdDeviation="10"/></filter>
      <filter id="pg-atlas-star-blur"><feGaussianBlur stdDeviation="3.5"/></filter>
      <filter id="pg-atlas-texture"><feTurbulence type="fractalNoise" baseFrequency=".38" numOctaves="3" seed="9"/><feColorMatrix type="saturate" values="0"/></filter>
    </defs>
    <rect width="480" height="410" rx="20" fill="url(#pg-atlas-night)"/>
    <ellipse cx="318" cy="108" rx="181" ry="137" fill="url(#pg-atlas-lavender)"/>
    <ellipse cx="376" cy="99" rx="57" ry="50" fill="#fff0ce" opacity=".21" filter="url(#pg-atlas-blur)"/>
    <circle cx="376" cy="100" r="32" fill="url(#pg-atlas-moon)" opacity=".95"/>
    <circle cx="365" cy="87" r="8" fill="#d2b995" opacity=".22"/>
    <circle cx="383" cy="108" r="5" fill="#d2b995" opacity=".28"/>
    <path d="M0 311 C62 282 111 304 181 282 C262 255 329 284 480 244 L480 410 H0Z" fill="#a38eac" opacity=".29"/>
    <path d="M0 347 C83 310 129 335 202 316 C300 287 352 317 480 297 L480 410 H0Z" fill="#79708d" opacity=".33"/>
    <path d="M0 367 C75 349 142 354 215 344 C316 327 378 344 480 320 L480 410 H0Z" fill="#151929" opacity=".49"/>
    {Array.from({ length: 45 }, (_, i) => {
      const x = (i * 83 + 25) % 455 + 12
      const y = (i * 47 + 39) % 292 + 25
      return <circle key={`dust-${i}`} cx={x} cy={y} r={i % 5 === 0 ? 1.4 : .75} fill="#f8e4ca" opacity={i % 3 === 0 ? .38 : .21}/>
    })}
    <path d="M44 110 Q240 45 424 145 M55 182 Q241 98 435 224" fill="none" stroke="#edd7ba" strokeOpacity=".12" strokeWidth=".85" strokeDasharray="3 8"/>
    {points.length > 1 && <motion.path
      d={points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')}
      fill="none" stroke="#f4d7a7" strokeOpacity=".62" strokeWidth="1.25"
      strokeLinecap="round" strokeLinejoin="round"
      initial={reducedMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }}
      transition={{ duration: reducedMotion ? 0 : .85 }}/>
    }
    {points.map(([x, y], i) => <g key={`learnt-star-${i}`} transform={`translate(${x} ${y})`}>
      <motion.g initial={reducedMotion ? false : { scale: .3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : .38, delay: reducedMotion ? 0 : Math.min(i * .028, .35) }}>
      <circle r="13" fill="#efd3a7" opacity=".33" filter="url(#pg-atlas-star-blur)"/>
      <path d="M0 -9 L2.2 -2.2 L9 0 L2.2 2.2 L0 9 L-2.2 2.2 L-9 0 L-2.2 -2.2Z" fill="#fbe5b9" stroke="#fff8e7" strokeWidth=".6"/>
      <circle r="2" fill="#fff9e9"/>
      </motion.g>
    </g>)}
    <rect width="480" height="410" rx="20" fill="#e8d9bc" opacity=".055" filter="url(#pg-atlas-texture)" style={{ mixBlendMode: 'soft-light' }}/>
    <text x="24" y="32" fontFamily="Georgia, serif" fontStyle="italic" fontSize="15" fill="#fff2da">finlingo · star atlas</text>
    <text x="455" y="386" textAnchor="end" fontFamily="Georgia, serif" fontStyle="italic" fontSize="12" fill="#f6e0c2">{count} / 31</text>
  </svg>
}

export default function GrowthTree({ completed = null, total = TOTAL_LESSONS, streak = null }) {
  const reducedMotion = useReducedMotion()
  const [theme, setTheme] = useSavedVisualTheme()
  const verified = completed != null && Number.isFinite(Number(completed))
  const max = Math.min(TOTAL_LESSONS, Math.max(1, Number(total) || TOTAL_LESSONS))
  const count = verified ? Math.max(0, Math.min(max, Math.floor(Number(completed)))) : 0
  const percent = verified ? Math.round((count / max) * 100) : 0
  const stages = theme === 'garden' ? GARDEN_STAGES : ATLAS_STAGES
  const stage = useMemo(() => verified ? [...stages].reverse().find((entry) => count >= entry.min) : null, [count, verified, stages])
  const next = stages.find((entry) => entry.min > count)

  return <section className="pg-tree-card pg-growth-card" aria-label="Learning growth artwork">
    <div className="pg-section-top pg-growth-heading">
      <div>
        <div className="pg-overline"><Sprout size={13}/> YOUR LEARNING JOURNEY</div>
        <h2>{theme === 'garden' ? 'A garden of ideas' : 'A sky of discoveries'}</h2>
        <p>Each completed lesson adds one detail to your chosen artwork.</p>
      </div>
      {streak != null && <span className="pg-streak-pill"><Flame size={14}/> {streak}-day streak</span>}
    </div>
    <div className={`pg-growth-illustration pg-growth-${theme}`}>
      {theme === 'garden'
        ? <GardenArtwork count={count} reducedMotion={reducedMotion}/>
        : <AtlasArtwork count={count} reducedMotion={reducedMotion}/>}
    </div>
    <div className="pg-growth-stage-row">
      <div>
        <span className="pg-growth-kicker">CURRENT STAGE</span>
        <strong>{stage?.title || 'Progress unavailable'}</strong>
        <p>{stage?.description || 'Saved lesson progress could not be loaded.'}</p>
      </div>
      <div className="pg-growth-fraction"><strong>{verified ? count : '—'}<span> / {max}</span></strong><small>Lessons</small></div>
    </div>
    <div className="pg-growth-track" role="progressbar" aria-label="Lessons completed"
      aria-valuemin={0} aria-valuemax={max} aria-valuenow={verified ? count : undefined}>
      <motion.div initial={false} animate={{ width: `${percent}%` }} transition={{ duration: reducedMotion ? 0 : .6 }}/>
    </div>
    <div className="pg-growth-milestone">
      <Sprout size={16}/>
      <span>{!verified ? 'Saved progress unavailable' : next
        ? `${next.min - count} more lesson${next.min - count === 1 ? '' : 's'} until ${next.title.toLowerCase()}`
        : 'All 31 lessons completed'}</span>
    </div>
    <div className="pg-growth-note"><BookOpen size={14}/> Only saved lesson completions grow your artwork.</div>
    <div className="pg-growth-theme-select" aria-label="Choose learning artwork">
      {VISUAL_THEMES.map(({ id, label, Icon }) => <button type="button" key={id}
        aria-pressed={theme === id} onClick={() => setTheme(id)}
        className={`pg-growth-theme-button ${theme === id ? 'pg-growth-theme-active' : ''}`}>
        <Icon size={17}/>{label}
      </button>)}
    </div>
  </section>
}
