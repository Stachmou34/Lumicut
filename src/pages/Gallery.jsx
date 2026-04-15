import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { motifs, CATEGORIES } from '../motifs/index'
import { useConfiguratorStore } from '../store/configuratorStore'

export default function Gallery() {
  const [activeCategory, setActiveCategory] = useState('all')
  const setMotifId = useConfiguratorStore(s => s.setMotifId)
  const navigate = useNavigate()

  const filtered =
    activeCategory === 'all' ? motifs : motifs.filter(m => m.category === activeCategory)

  const handleSelect = (motif) => {
    setMotifId(motif.id)
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
          </div>
          <Link
            to="/studio"
            className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            Configurateur →
          </Link>
        </div>

        <div className="flex gap-2 mb-8 flex-wrap">
          {CATEGORIES.map(c => (
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
              transition={{ delay: i * 0.05 }}
              onClick={() => handleSelect(m)}
              className="group bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-amber-400/50 transition-all"
            >
              <div
                className="bg-white p-4 aspect-square"
                dangerouslySetInnerHTML={{ __html: m.svg }}
              />
              <div className="p-3">
                <div className="font-semibold text-sm text-slate-200 group-hover:text-amber-400 transition-colors">
                  {m.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{m.description}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
