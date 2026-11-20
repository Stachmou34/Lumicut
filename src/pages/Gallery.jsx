import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { CATALOG, CATALOG_CATEGORIES, catalogThumbnail } from '../motifs/catalog'
import { useConfiguratorStore } from '../store/configuratorStore'
import MotifThumb from '../components/studio/MotifThumb'

export default function Gallery() {
  const [activeCategory, setActiveCategory] = useState('all')
  const { setMotifId, setGenerator } = useConfiguratorStore()
  const navigate = useNavigate()

  const filtered = activeCategory === 'all' ? CATALOG : CATALOG.filter(m => m.category === activeCategory)

  // Ouvre le studio avec le motif choisi (motif dessiné ou préréglage généré)
  const handleSelect = (item) => {
    if (item.kind === 'static') setMotifId(item.id)
    else setGenerator(item.generator, item.name)
    navigate('/studio')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to="/" className="text-amber-400 font-bold text-xl">
              LumiCut
            </Link>
            <h1 className="text-2xl font-bold mt-1">Galerie de motifs</h1>
            <p className="text-sm text-slate-400 mt-1">
              Tous les motifs marqués ✓ sont vérifiés pour la découpe : aucun morceau ne tombe.
            </p>
          </div>
          <Link
            to="/studio"
            className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            Configurateur →
          </Link>
        </div>

        <div className="flex gap-2 mb-8 flex-wrap">
          {CATALOG_CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                activeCategory === c.id
                  ? 'bg-amber-400 text-black font-bold'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((m, i) => (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => handleSelect(m)}
              className="group bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-amber-400/50 transition-all text-left"
            >
              <MotifThumb svg={catalogThumbnail(m).svg} className="aspect-[2/1] p-3" />
              <div className="p-3 flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-slate-200 group-hover:text-amber-400 transition-colors">
                  {m.name}
                </span>
                {m.verified && <span className="text-xs text-emerald-400" title="Découpe vérifiée">✓</span>}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
