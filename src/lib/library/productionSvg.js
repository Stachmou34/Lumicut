import { motifs } from '../../motifs/index'
import { isLibraryMotif, libraryIdOf, loadLibrarySvg } from './libraryClient'

// SVG d'un motif pour l'atelier (fichier de production) : bibliothèque de motifs réels ou motif historique.
// Renvoie null si le motif n'a pas de dessin fixe (motif généré : recréé à partir de sa description).
export async function motifSvgForProduction(motifId) {
  if (isLibraryMotif(motifId)) {
    try {
      return await loadLibrarySvg(libraryIdOf(motifId))
    } catch {
      return null
    }
  }
  return motifs.find(m => m.id === motifId)?.svg ?? null
}
