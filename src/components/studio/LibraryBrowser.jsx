import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useConfiguratorStore } from '../../store/configuratorStore'
import {
  loadLibraryIndex, libraryIndex, librarySvgUrl, filterLibrary,
  isLibraryMotif, libraryIdOf, LICENSE_LABELS,
} from '../../lib/library/libraryClient'
import { MAP_PRESETS, catalogThumbnail } from '../../motifs/catalog'
import MotifThumb from './MotifThumb'

const PAGE = 36

// Vignette d'un motif de la bibliothèque : le SVG sert de masque, teinté de la couleur des LED
export function LibraryThumb({ id, color }) {
  const url = `url("${librarySvgUrl(id)}")`
  return (
    <div className="aspect-square w-full bg-slate-950 p-2">
      <div
        className="w-full h-full [mask-size:contain] [mask-repeat:no-repeat] [mask-position:center] [-webkit-mask-size:contain] [-webkit-mask-repeat:no-repeat] [-webkit-mask-position:center]"
        style={{ backgroundColor: color, maskImage: url, WebkitMaskImage: url }}
      />
    </div>
  )
}

// Crédit du motif sélectionné (auteur, source, licence)
function CreditLine({ entry }) {
  const c = entry.credit
  return (
    <p className="text-[11px] text-slate-500 leading-relaxed">
      <span className="text-slate-300">{entry.name}</span> — dessin d’origine : {c.author} ({c.origin}),{' '}
      <a href={c.licenseUrl} target="_blank" rel="noreferrer" className="underline hover:text-slate-300">
        {LICENSE_LABELS[c.license] ?? c.license}
      </a>
      {' · '}
      <a href={c.url} target="_blank" rel="noreferrer" className="underline hover:text-slate-300">source</a>
    </p>
  )
}

// Catalogue : la bibliothèque de motifs réels, par thème, avec recherche
export default function LibraryBrowser() {
  const motifId = useConfiguratorStore(s => s.motifId)
  const generatorName = useConfiguratorStore(s => s.generatorName)
  const ledColor = useConfiguratorStore(s => s.ledColor)
  const selectLibraryMotif = useConfiguratorStore(s => s.selectLibraryMotif)
  const setGenerator = useConfiguratorStore(s => s.setGenerator)
  const [index, setIndex] = useState(libraryIndex())
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [limit, setLimit] = useState(PAGE)
  const sentinel = useRef(null)

  useEffect(() => {
    if (index) return
    loadLibraryIndex().then(setIndex).catch(e => setError(e.message))
  }, [index])

  const motifs = index?.motifs ?? []
  const items = useMemo(() => filterLibrary(motifs, { query, category }), [motifs, query, category])
  const counts = useMemo(() => {
    const c = {}
    for (const m of motifs) c[m.category] = (c[m.category] ?? 0) + 1
    return c
  }, [motifs])
  // Cartes du monde : thème « Cartes », ou recherche qui les concerne (« carte », « monde »…)
  const showMaps = category === 'cartes' || (category === 'all' && query.trim() !== '' && filterLibrary(
    MAP_PRESETS.map(p => ({ ...p, category: 'cartes' })), { query, category: 'all' },
  ).length > 0)

  // Nouvelle recherche ou nouveau thème : on repart de la première page
  useEffect(() => setLimit(PAGE), [query, category])

  // Pages suivantes chargées quand le bas de la grille apparaît
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) setLimit(l => l + PAGE)
    })
    io.observe(el)
    return () => io.disconnect()
  }, [items.length, limit])

  const selectedId = isLibraryMotif(motifId) ? libraryIdOf(motifId) : null
  const selected = selectedId ? motifs.find(m => m.id === selectedId) : null

  if (error) {
    return <p className="text-xs text-red-400">{error}. Réessayez dans un instant.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Rechercher : cerf, lune, Paris, lotus…"
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
      />

      <div className="flex gap-1 flex-wrap">
        {[{ id: 'all', label: 'Tous' }, ...(index?.categories ?? []), { id: 'cartes', label: 'Cartes' }].map(c => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-2 py-0.5 rounded-full text-[11px] transition-colors ${category === c.id ? 'bg-amber-500 text-black font-semibold' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
          >
            {c.label}
            {counts[c.id] ? <span className="opacity-60"> {counts[c.id]}</span> : null}
          </button>
        ))}
      </div>

      {selected && <CreditLine entry={selected} />}

      {!index && <p className="text-xs text-slate-500">Chargement de la bibliothèque…</p>}

      {showMaps && (
        <div className="flex flex-col gap-1.5">
          {MAP_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => setGenerator(p.generator, p.name)}
              title={`${p.name} — données Natural Earth (domaine public)`}
              className={`rounded-md overflow-hidden border text-left transition-all ${motifId === 'generated' && generatorName === p.name ? 'border-amber-400' : 'border-slate-700 hover:border-slate-500'}`}
            >
              <MotifThumb svg={catalogThumbnail(p).svg} className="aspect-[2/1]" />
              <div className="px-2 py-1 text-[11px] text-slate-300 bg-slate-800 flex justify-between gap-2">
                <span className="truncate">{p.name}</span>
                <span className="text-slate-500 flex-shrink-0">Natural Earth</span>
              </div>
            </button>
          ))}
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Les vrais contours des continents, recalculés à la taille de votre panneau. Réglez la finesse des points dans l’onglet « ✨ Créer ».
          </p>
        </div>
      )}

      {category !== 'cartes' && (
        <div className="grid grid-cols-3 gap-1.5">
          {items.slice(0, limit).map(m => (
            <button
              key={m.id}
              onClick={() => selectLibraryMotif(m)}
              title={`${m.name} — ${m.credit.author} (${m.credit.origin})`}
              className={`rounded-md overflow-hidden border text-left transition-all ${selectedId === m.id ? 'border-amber-400 shadow shadow-amber-400/20' : 'border-slate-700 hover:border-slate-500'}`}
            >
              <LibraryThumb id={m.id} color={ledColor} />
              <div className="px-1 py-0.5 text-[10px] text-slate-300 bg-slate-800 truncate">{m.name}</div>
            </button>
          ))}
        </div>
      )}
      {category !== 'cartes' && items.length > limit && <div ref={sentinel} className="h-6" />}
      {index && category !== 'cartes' && !items.length && (
        <p className="text-xs text-slate-500">Aucun motif ne correspond. Essayez un autre mot, ou l’onglet « ✨ Créer ».</p>
      )}

      <p className="text-[11px] text-slate-500 leading-relaxed">
        {motifs.length} dessins réels, tous vérifiés à la découpe : rien ne tombe, les ponts de matière tiennent.{' '}
        <Link to="/credits" className="underline hover:text-slate-300">Sources et licences</Link>
      </p>
    </div>
  )
}
