import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { MAP_PRESETS, catalogThumbnail } from '../motifs/catalog'
import { useConfiguratorStore } from '../store/configuratorStore'
import MotifThumb from '../components/studio/MotifThumb'
import { LibraryThumb } from '../components/studio/LibraryBrowser'
import { loadLibraryIndex, libraryIndex, filterLibrary, LICENSE_LABELS } from '../lib/library/libraryClient'

const PAGE = 48

// Galerie publique : la bibliothèque de motifs réels, par thème
export default function Gallery() {
  const [index, setIndex] = useState(libraryIndex())
  const [error, setError] = useState(null)
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const { selectLibraryMotif, setGenerator } = useConfiguratorStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!index) loadLibraryIndex().then(setIndex).catch(e => setError(e.message))
  }, [index])
  useEffect(() => setLimit(PAGE), [category, query])

  const items = useMemo(() => filterLibrary(index?.motifs ?? [], { query, category }), [index, query, category])
  const showMaps = category === 'all' || category === 'cartes'

  // Ouvre le studio avec le motif choisi
  const openMotif = m => {
    selectLibraryMotif(m)
    navigate('/studio')
  }
  const openMap = p => {
    setGenerator(p.generator, p.name)
    navigate('/studio')
  }

  const card = 'group bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-amber-400/50 transition-all text-left'

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8 gap-4">
          <div>
            <Link to="/" className="text-amber-400 font-bold text-xl">LumiCut</Link>
            <h1 className="text-2xl font-bold mt-1">Galerie de motifs</h1>
            <p className="text-sm text-slate-400 mt-1">
              {index ? `${index.motifs.length} dessins réels` : 'Des dessins réels'}, tous vérifiés pour la découpe : aucun morceau ne tombe.
            </p>
          </div>
          <Link to="/studio" className="text-sm text-amber-400 hover:text-amber-300 transition-colors flex-shrink-0">
            Configurateur →
          </Link>
        </div>

        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher un motif : cerf, lune, Paris, lotus…"
          className="w-full mb-4 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
        />
        <div className="flex gap-2 mb-8 flex-wrap">
          {[{ id: 'all', label: 'Tous' }, ...(index?.categories ?? []), { id: 'cartes', label: 'Cartes du monde' }].map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${category === c.id ? 'bg-amber-400 text-black font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {showMaps && !query && MAP_PRESETS.map(p => (
            <button key={p.id} onClick={() => openMap(p)} className={card}>
              <MotifThumb svg={catalogThumbnail(p).svg} className="aspect-square p-3" />
              <div className="p-3">
                <div className="font-semibold text-sm text-slate-200 group-hover:text-amber-400 transition-colors">{p.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Natural Earth · domaine public</div>
              </div>
            </button>
          ))}
          {category !== 'cartes' && items.slice(0, limit).map((m, i) => (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i % PAGE, 16) * 0.02 }}
              onClick={() => openMotif(m)}
              className={card}
            >
              <LibraryThumb id={m.id} color="#fbbf24" />
              <div className="p-3">
                <div className="font-semibold text-sm text-slate-200 group-hover:text-amber-400 transition-colors truncate">{m.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {m.credit.origin} · {LICENSE_LABELS[m.credit.license] ?? m.credit.license}
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {category !== 'cartes' && items.length > limit && (
          <div className="text-center mt-8">
            <button
              onClick={() => setLimit(l => l + PAGE)}
              className="px-6 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-sm text-slate-200"
            >
              Voir plus de motifs ({items.length - limit})
            </button>
          </div>
        )}
        {index && category !== 'cartes' && !items.length && (
          <p className="text-slate-500 text-sm">Aucun motif ne correspond à cette recherche.</p>
        )}

        <p className="text-xs text-slate-500 mt-10">
          Sources : PhyloPic, game-icons.net, Wikimedia Commons, catalogue Hipparcos, Natural Earth.{' '}
          <Link to="/credits" className="underline hover:text-slate-300">Auteurs et licences</Link>
        </p>
      </div>
    </div>
  )
}
