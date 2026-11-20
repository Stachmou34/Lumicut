import { useEffect } from 'react'
import { useConfiguratorStore } from '../../store/configuratorStore'
import { isLibraryMotif, libraryIdOf, loadLibrarySvg, loadLibraryIndex } from './libraryClient'

// Charge le SVG du motif de la bibliothèque sélectionné (clic, lien partagé, design sauvegardé)
// et le range dans le store : la 2D, la 3D et le contrôle de découpe le lisent de là.
export function useLibrarySync() {
  const motifId = useConfiguratorStore(s => s.motifId)
  const loadedId = useConfiguratorStore(s => s.librarySvgId)

  useEffect(() => {
    if (!isLibraryMotif(motifId)) return
    const id = libraryIdOf(motifId)
    if (loadedId === id) return
    let cancelled = false
    Promise.all([loadLibrarySvg(id), loadLibraryIndex().catch(() => null)])
      .then(([svg, index]) => {
        if (cancelled) return
        const entry = index?.motifs.find(m => m.id === id)
        useConfiguratorStore.getState().setLibrarySvg(id, svg, entry?.name)
      })
      .catch(() => {
        // Motif retiré de la bibliothèque (ancien lien) : retour au motif par défaut
        if (!cancelled) useConfiguratorStore.getState().setMotifId('arbre-de-vie')
      })
    return () => { cancelled = true }
  }, [motifId, loadedId])
}
