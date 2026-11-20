import { useEffect } from 'react'
import { useConfiguratorStore } from '../../store/configuratorStore'
import { isLibraryMotif, libraryIdOf, loadLibrarySvg, loadLibraryForme, loadLibraryIndex } from './libraryClient'

// Charge le motif de la bibliothèque sélectionné (clic, lien partagé, design sauvegardé) et le range
// dans le store : la silhouette prête à découper et, s'il accepte les styles, sa forme d'origine.
// La 2D, la 3D et le contrôle de découpe les lisent de là.
export function useLibrarySync() {
  const motifId = useConfiguratorStore(s => s.motifId)
  const loadedId = useConfiguratorStore(s => s.librarySvgId)
  const formeId = useConfiguratorStore(s => s.libraryFormeId)
  const styles = useConfiguratorStore(s => s.libraryStyles)

  useEffect(() => {
    if (!isLibraryMotif(motifId)) return
    const id = libraryIdOf(motifId)
    if (loadedId === id) return
    let cancelled = false
    Promise.all([loadLibrarySvg(id), loadLibraryIndex().catch(() => null)])
      .then(([svg, index]) => {
        if (cancelled) return
        const entry = index?.motifs.find(m => m.id === id)
        useConfiguratorStore.getState().setLibrarySvg(id, svg, entry?.name, entry ? entry.styles !== false : undefined)
      })
      .catch(() => {
        // Motif retiré de la bibliothèque (ancien lien) : retour au motif par défaut
        if (!cancelled) useConfiguratorStore.getState().setMotifId('arbre-de-vie')
      })
    return () => { cancelled = true }
  }, [motifId, loadedId])

  useEffect(() => {
    if (!isLibraryMotif(motifId) || !styles) return
    const id = libraryIdOf(motifId)
    if (formeId === id) return
    let cancelled = false
    loadLibraryForme(id)
      .then(svg => { if (!cancelled) useConfiguratorStore.getState().setLibraryForme(id, svg) })
      .catch(() => {
        // Pas de forme d'origine : le motif reste en silhouette
        if (!cancelled) useConfiguratorStore.setState({ libraryStyles: false })
      })
    return () => { cancelled = true }
  }, [motifId, formeId, styles])
}
