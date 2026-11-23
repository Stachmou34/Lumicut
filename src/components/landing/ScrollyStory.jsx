import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import StoryScene from './StoryScene'
import { STORY_CHAPTERS, STORY_MOTIF_IDS } from './storyChapters'
import { loadLibraryShapes } from '../../lib/library/useLibraryShapes'

// Texte d'un chapitre : il défile par-dessus la scène fixe ; à mi-écran, il devient le chapitre affiché
function StoryChapter({ chapter, index, facts, onActive, reduced }) {
  const ref = useRef(null)
  const inView = useInView(ref, { amount: 0.5 })
  useEffect(() => {
    if (inView) onActive(index)
  }, [inView, index, onActive])

  const first = index === 0
  const Title = first ? 'h1' : 'h2'
  const appear = reduced
    ? {}
    : first
      ? { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay: 0.15 } }
      : { initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { amount: 0.6 }, transition: { duration: 0.6 } }

  return (
    <article
      ref={ref}
      id={chapter.anchor}
      className="min-h-[100svh] flex items-end lg:items-center px-4 sm:px-8 lg:px-[6%] pb-6 lg:pb-0 scroll-mt-0"
    >
      <motion.div
        {...appear}
        className="w-full lg:w-[36%] rounded-3xl bg-slate-950/80 backdrop-blur-md ring-1 ring-white/10 p-5 sm:p-6 lg:bg-transparent lg:backdrop-blur-none lg:ring-0 lg:p-0"
      >
        <p className="text-xs sm:text-sm font-semibold tracking-wide text-amber-400">{chapter.eyebrow}</p>
        <Title className={`mt-2 font-semibold tracking-tight text-white leading-[1.05] ${first ? 'text-4xl sm:text-5xl xl:text-6xl' : 'text-3xl sm:text-4xl xl:text-5xl'}`}>
          {chapter.title}
        </Title>
        <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">{chapter.text(facts)}</p>
        {chapter.cta && (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              to="/studio"
              className="inline-flex items-center rounded-full bg-amber-400 hover:bg-amber-300 text-black font-semibold px-6 py-3 transition-colors"
            >
              Créer mon panneau
            </Link>
            {first && (
              <a href="#comment" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Comment ça marche ↓
              </a>
            )}
          </div>
        )}
      </motion.div>
    </article>
  )
}

// Récit de l'accueil : la scène reste à l'écran pendant que les chapitres défilent
export default function ScrollyStory({ facts }) {
  const [active, setActive] = useState(0)
  const reduced = useReducedMotion() ?? false

  // Motifs du récit chargés d'avance : pas d'attente quand le chapitre change
  useEffect(() => {
    STORY_MOTIF_IDS.forEach(id => loadLibraryShapes(id).catch(() => {}))
  }, [])

  return (
    <section aria-label="Comment naît un panneau LumiCut" className="relative bg-slate-950">
      {/* Scène fixe : en haut sur mobile, à droite sur ordinateur */}
      <div className="sticky top-0 h-[100svh] overflow-hidden" aria-hidden="true">
        <div className="absolute inset-x-3 top-[4.5rem] h-[44svh] sm:inset-x-8 lg:inset-x-auto lg:left-[42%] lg:right-[4%] lg:top-20 lg:bottom-10 lg:h-auto flex items-center justify-center">
          <StoryScene chapter={STORY_CHAPTERS[active]} reduced={reduced} />
        </div>
        {/* Progression du récit */}
        <ol className="hidden lg:flex absolute left-[6%] bottom-10 gap-1.5">
          {STORY_CHAPTERS.map((c, i) => (
            <li key={c.id} className={`h-1 rounded-full transition-all duration-500 ${i === active ? 'w-8 bg-amber-400' : 'w-3 bg-white/20'}`} />
          ))}
        </ol>
      </div>

      {/* Chapitres, qui défilent par-dessus la scène */}
      <div className="relative -mt-[100svh]">
        {STORY_CHAPTERS.map((chapter, i) => (
          <StoryChapter key={chapter.id} chapter={chapter} index={i} facts={facts} onActive={setActive} reduced={reduced} />
        ))}
      </div>
    </section>
  )
}
