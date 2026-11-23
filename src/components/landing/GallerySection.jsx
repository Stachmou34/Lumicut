import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import StoryMotif from './StoryMotif'
import { loadLibraryIndex, libraryIndex } from '../../lib/library/libraryClient'
import { useConfiguratorStore } from '../../store/configuratorStore'

// Quelques motifs de la bibliothèque, de thèmes différents ; un clic ouvre le studio avec le motif
const PICKS = ['cerf-elaphe', 'grand-duc', 'colibri', 'baleine', 'tour-eiffel', 'constellation-orion', 'tournesol', 'machaon']

export default function GallerySection() {
  const [index, setIndex] = useState(libraryIndex())
  const selectLibraryMotif = useConfiguratorStore(s => s.selectLibraryMotif)
  const navigate = useNavigate()

  useEffect(() => {
    if (!index) loadLibraryIndex().then(setIndex).catch(() => {})
  }, [index])

  const entries = PICKS.map(id => index?.motifs.find(m => m.id === id)).filter(Boolean)
  const category = id => index?.categories.find(c => c.id === id)?.label

  const open = entry => {
    selectLibraryMotif(entry)
    navigate('/studio')
  }

  return (
    <section id="galerie" className="scroll-mt-20 bg-[#070910] px-4 sm:px-8 py-24 lg:py-32">
      <div className="max-w-6xl mx-auto">
        <p className="text-sm font-semibold text-amber-400">Galerie</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white">Des idées pour commencer.</h2>
          <Link to="/gallery" className="text-amber-400 hover:text-amber-300 font-medium">
            Voir les {index?.motifs.length ?? ''} motifs →
          </Link>
        </div>

        <ul className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {entries.map((entry, i) => (
            <motion.li
              key={entry.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: (i % 4) * 0.06 }}
            >
              <button
                type="button"
                onClick={() => open(entry)}
                className="group w-full text-left rounded-3xl bg-[radial-gradient(ellipse_at_50%_40%,#1b2133_0%,#0b0e17_70%)] ring-1 ring-white/10 hover:ring-amber-400/50 p-4 transition-shadow"
              >
                <span className="block aspect-[4/3] rounded-xl bg-[#111] ring-1 ring-white/5 shadow-[0_0_40px_rgba(255,167,87,0.18)] group-hover:shadow-[0_0_60px_rgba(255,167,87,0.32)] transition-shadow">
                  <StoryMotif motif={entry.id} className="w-full h-full" />
                </span>
                <span className="mt-3 block text-white font-medium truncate">{entry.name}</span>
                <span className="block text-sm text-slate-500 truncate">{category(entry.category)}</span>
              </button>
            </motion.li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-slate-500">
          Dessins issus de sources libres, crédités sur la page <Link to="/credits" className="underline hover:text-slate-300">Crédits des motifs</Link>.
        </p>
      </div>
    </section>
  )
}
