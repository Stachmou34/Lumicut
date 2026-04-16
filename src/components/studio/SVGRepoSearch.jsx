import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { searchSVGRepo, fetchSVGContent } from '../../lib/svgrepoClient'
import { cleanSVGForLaser } from '../../lib/svgCleaner'
import { getCachedSVG, cacheSVG } from '../../lib/svgCache'
import { useConfiguratorStore } from '../../store/configuratorStore'
import { useFavoritesStore } from '../../store/favoritesStore'
import { logMotifUsage } from '../../lib/logMotif'
import SVGRepoThumbnail from './SVGRepoThumbnail'

// Mots-clés pertinents pour décoration laser
const SUGGESTIONS = [
  'tree', 'wolf', 'mandala', 'deer', 'lotus',
  'butterfly', 'lion', 'eagle', 'geometric', 'feather',
  'dreamcatcher', 'fox', 'owl', 'compass', 'hummingbird',
]

const TABS = [
  { id: 'search',     label: 'Rechercher' },
  { id: 'favorites',  label: '♥ Favoris' },
]

export default function SVGRepoSearch() {
  const { setMotif } = useConfiguratorStore()
  const { favorites } = useFavoritesStore()

  const [tab, setTab]             = useState('search')
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState([])
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]         = useState(null)
  const [hasMore, setHasMore]     = useState(false)

  // État pour la sélection en cours
  const [selecting, setSelecting] = useState(null) // id du motif en cours de chargement
  const [warnings, setWarnings]   = useState([])
  const [pendingMotif, setPendingMotif] = useState(null) // motif en attente de confirmation warnings

  const doSearch = useCallback(async (q, p = 1) => {
    if (!q.trim()) return
    if (p === 1) { setLoading(true); setResults([]) }
    else setLoadingMore(true)
    setError(null)
    try {
      const svgs = await searchSVGRepo(q, p)
      if (p === 1) setResults(svgs)
      else setResults(prev => [...prev, ...svgs])
      setPage(p)
      setHasMore(svgs.length === 20)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Debounce sur la saisie
  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const t = setTimeout(() => doSearch(query, 1), 400)
    return () => clearTimeout(t)
  }, [query, doSearch])

  // Sélection d'un motif — téléchargement + nettoyage
  const handleSelect = async (motif) => {
    const cacheKey = motif.id

    // Vérifier le cache d'abord
    const cached = getCachedSVG(cacheKey)
    if (cached) {
      setMotif(cached, 'svgrepo')
      return
    }

    setSelecting(motif.id)
    setWarnings([])
    try {
      const raw = await fetchSVGContent(motif.id)
      const { svgString, warnings: w } = cleanSVGForLaser(raw)
      cacheSVG(cacheKey, svgString)

      if (w.length > 0) {
        // Montrer les warnings avant d'appliquer
        setPendingMotif({ svgString, motif })
        setWarnings(w)
      } else {
        setMotif(svgString, 'svgrepo')
        logMotifUsage({ id: motif.id, title: motif.title, svgString })
      }
    } catch (e) {
      setError(`Ce motif n'est pas compatible : ${e.message}`)
    } finally {
      setSelecting(null)
    }
  }

  const confirmApply = () => {
    if (pendingMotif) {
      setMotif(pendingMotif.svgString, 'svgrepo')
      logMotifUsage({ id: pendingMotif.motif.id, title: pendingMotif.motif.title, svgString: pendingMotif.svgString })
      setPendingMotif(null)
      setWarnings([])
    }
  }

  const cancelApply = () => {
    setPendingMotif(null)
    setWarnings([])
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-slate-300 text-base">🔍</span>
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">SVGRepo</span>
        <span className="text-xs text-slate-500">— Millions de motifs</span>
      </div>

      {/* Onglets search / favoris */}
      <div className="flex gap-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
              tab === t.id
                ? 'bg-slate-600 text-white font-medium'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
            {t.id === 'favorites' && favorites.length > 0 && (
              <span className="ml-1 text-amber-400">{favorites.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <>
          {/* Input de recherche */}
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un motif..."
            className="w-full bg-slate-700 border border-slate-600 text-slate-100 text-sm rounded-lg px-3 py-2
                       focus:outline-none focus:border-amber-400/60 transition-colors placeholder:text-slate-500"
          />

          {/* Suggestions */}
          {!query && (
            <div className="flex flex-wrap gap-1">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="px-2 py-0.5 rounded-full bg-slate-700 text-xs text-slate-400
                             hover:bg-slate-600 hover:text-slate-200 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg px-3 py-2 flex justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-600 hover:text-red-400">×</button>
            </div>
          )}

          {/* Warnings avec confirmation */}
          <AnimatePresence>
            {warnings.length > 0 && pendingMotif && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs rounded-lg px-3 py-2.5 flex flex-col gap-2"
              >
                <div>
                  {warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={confirmApply}
                    className="flex-1 py-1.5 rounded bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-200 transition-colors"
                  >
                    Utiliser quand même
                  </button>
                  <button
                    onClick={cancelApply}
                    className="flex-1 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grille de résultats */}
          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <SVGRepoThumbnail key={i} loading motif={{}} onSelect={() => {}} />
              ))}
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {results.map(motif => (
                  <div key={motif.id} className="relative">
                    <SVGRepoThumbnail
                      motif={motif}
                      onSelect={handleSelect}
                    />
                    {/* Spinner sur le motif en cours de sélection */}
                    {selecting === motif.id && (
                      <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Charger plus */}
              {hasMore && (
                <button
                  onClick={() => doSearch(query, page + 1)}
                  disabled={loadingMore}
                  className="w-full py-2 rounded-lg text-xs text-slate-400 border border-slate-600
                             hover:bg-slate-700 transition-colors disabled:opacity-40"
                >
                  {loadingMore ? 'Chargement…' : 'Charger plus'}
                </button>
              )}
            </>
          ) : query.length >= 2 && !loading ? (
            <div className="text-center text-xs text-slate-500 py-4">Aucun résultat pour "{query}"</div>
          ) : null}
        </>
      )}

      {tab === 'favorites' && (
        favorites.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-6">
            Aucun favori — cliquez ♥ sur un motif pour l'enregistrer
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {favorites.map(motif => (
              <div key={motif.id} className="relative">
                <SVGRepoThumbnail
                  motif={motif}
                  onSelect={handleSelect}
                />
                {selecting === motif.id && (
                  <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
