import { motifs } from '../../motifs/index'
import { isLibraryMotif, libraryIdOf, loadLibrarySvg, loadLibraryForme } from './libraryClient'
import { applyCutStyle } from './cutStyles'
import { deserializeDesign } from '../designSerializer'
import { getPanelMaterial } from '../panelMaterials'

// SVG du motif pour l'atelier (fichier de production), d'après la configuration de la commande.
// Motif de la bibliothèque : dans son style de découpe, recalculé à la taille commandée (traits et ponts
// en millimètres réels). Renvoie null si le motif n'a pas de dessin fixe (motif généré).
export async function motifSvgForProduction(config) {
  const motifId = config?.motif
  const design = config?.design ? safeDeserialize(config.design) : null
  if (isLibraryMotif(motifId)) {
    const id = libraryIdOf(motifId)
    const style = design?.cutStyle ?? 'contour'
    try {
      if (design && style !== 'silhouette') {
        const forme = await loadLibraryForme(id)
        const width = design.width || 60
        const height = design.height || 30
        return applyCutStyle(forme, style, design.cutStyleParams?.[style], {
          unitMm: (Math.min(width, height) * 10 * ((design.motifScale ?? 90) / 100)) / 200,
          bridgeMm: getPanelMaterial(design.material).minBridgeMm,
          key: id,
        })
      }
      return await loadLibrarySvg(id)
    } catch {
      return null
    }
  }
  return motifs.find(m => m.id === motifId)?.svg ?? null
}

function safeDeserialize(encoded) {
  try {
    return deserializeDesign(encoded)
  } catch {
    return null
  }
}
