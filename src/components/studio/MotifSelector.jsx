import { motion } from 'framer-motion'
import { motifs, CATEGORIES } from '../../motifs/index'
import { useConfiguratorStore } from '../../store/configuratorStore'
import { useState } from 'react'
import SVGRepoSearch from './SVGRepoSearch'

function MotifCard({ motif, selected, onSelect }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className={`relative rounded-lg overflow-hidden border-2 transition-all ${
        selected
          ? 'border-amber-400 shadow-lg shadow-amber-400/20'
          : 'border-slate-700 hover:border-slate-500'
      }`}
    >
      <div
        className="w-full aspect-square bg-white"
        dangerouslySetInnerHTML={{ __html: motif.svg }}
        style={{ lineHeight: 0 }}
      />
      <div
        className={`absolute inset-0 ring-2 ring-inset transition-all ${
          selected ? 'ring-amber-400' : 'ring-transparent'
        }`}
      />
      <div className="p-1.5 bg-slate-800 text-center">
        <div className="text-xs font-medium text-slate-200 truncate">{motif.name}</div>
      </div>
    </motion.button>
  )
}

export default function MotifSelector() {
  const { motifId, setMotifId } = useConfiguratorStore()
  const [activeCategory, setActiveCategory] = useState('all')

  const filtered =
    activeCategory === 'all' ? motifs : motifs.filter(m => m.category === activeCategory)

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Motif</div>

      {/* Category filters + IA */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
              activeCategory === c.id
                ? 'bg-amber-500 text-black font-semibold'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
          >
            {c.label}
          </button>
        ))}
        <button
          onClick={() => setActiveCategory('svgrepo')}
          className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
            activeCategory === 'svgrepo'
              ? 'bg-amber-500 text-black font-semibold'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          🔍 SVGRepo
        </button>
      </div>

      {activeCategory === 'svgrepo' ? (
        <SVGRepoSearch />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {filtered.map(m => (
            <MotifCard
              key={m.id}
              motif={m}
              selected={m.id === motifId}
              onSelect={() => setMotifId(m.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
