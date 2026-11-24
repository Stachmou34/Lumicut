import { motifs } from '../motifs/index'
import { stripBandMm } from './stripBand'
import { computeFixingHoles, clearanceRadiusCm } from './fixings'
import { getPanelMaterial } from './panelMaterials'
import { generateMotif, getGenerator } from './generators'
import { isLibraryMotif, libraryIdOf, libraryIndex, EMPTY_SVG } from './library/libraryClient'
import { applyCutStyle } from './library/cutStyles'

// Zones à garder pleines autour des fixations, en cm depuis le coin haut gauche (y vers le bas)
export function keepOutZones(widthCm, heightCm, mountingId) {
  const r = clearanceRadiusCm(mountingId)
  return computeFixingHoles(widthCm, heightCm, mountingId).map(h => ({
    x: h.x + widthCm / 2,
    y: heightCm / 2 - h.y,
    r: Math.max(r, h.r),
  }))
}

// SVG du motif courant : catalogue, motif importé ou motif généré (recalculé à partir de sa graine
// pour les dimensions, la fixation et le matériau du panneau)
export function resolveMotifSvg(s, width, height) {
  const generate = spec => generateMotif(spec, {
    widthCm: width,
    heightCm: height,
    motifScale: s.motifScale,
    keepOut: keepOutZones(width, height, s.mounting),
    minBridgeMm: getPanelMaterial(s.material).minBridgeMm,
  })
  if (s.motifId === 'generated' && s.generator) return generate(s.generator)
  if (s.motifId === 'ai-generated' && s.aiMotifSvg) return { svg: s.aiMotifSvg, fullPanel: false }
  // Motif de la bibliothèque : dans son style de découpe (calculé à la taille réelle du motif),
  // ou en silhouette ; SVG vide le temps du chargement
  if (isLibraryMotif(s.motifId)) {
    const id = libraryIdOf(s.motifId)
    const style = s.cutStyle ?? 'contour'
    if (s.libraryStyles !== false && style !== 'silhouette') {
      if (!s.libraryForme || s.libraryFormeId !== id) return { svg: EMPTY_SVG, fullPanel: false }
      try {
        const svg = applyCutStyle(s.libraryForme, style, s.cutStyleParams?.[style], {
          unitMm: (Math.min(width, height) * 10 * (s.motifScale / 100)) / 200,
          bridgeMm: getPanelMaterial(s.material).minBridgeMm,
          key: id,
          preview: s.editGesture,
        })
        return { svg, fullPanel: false }
      } catch {
        // Style impossible pour ce dessin : silhouette
      }
    }
    const ready = s.librarySvg && s.librarySvgId === id
    return { svg: ready ? s.librarySvg : EMPTY_SVG, fullPanel: false }
  }
  const motif = motifs.find(m => m.id === s.motifId) ?? motifs[0]
  return motif.generator ? generate(motif.generator) : { svg: motif.svg, fullPanel: false }
}

// Nom lisible du motif courant
export function motifLabel(s) {
  if (s.motifId === 'generated' && s.generator) return s.generatorName || getGenerator(s.generator.type).label
  if (s.motifId === 'ai-generated') return 'Motif importé'
  if (isLibraryMotif(s.motifId)) {
    const id = libraryIdOf(s.motifId)
    return s.libraryName || libraryIndex()?.motifs.find(m => m.id === id)?.name || id
  }
  return motifs.find(m => m.id === s.motifId)?.name ?? s.motifId
}

// Extrait de l'état du configurateur tout ce qui détermine la découpe du panneau :
// motif, texte, dimensions et trous de fixation. Utilisé par la 2D, la 3D et les contrôles de fabrication.
export function designFromState(s) {
  const width = s.width || 60
  const height = s.height || 30
  const { svg, fullPanel } = resolveMotifSvg(s, width, height)
  return {
    svg,
    fullPanel,
    width,
    height,
    motifScale: s.motifScale,
    motifX: s.motifX,
    motifY: s.motifY,
    motifRotation: s.motifRotation,
    motifMirrorH: s.motifMirrorH,
    motifMirrorV: s.motifMirrorV,
    showText: s.showText,
    textContent: s.textContent,
    textSecondary: s.textSecondary,
    textFont: s.textFont,
    textAlign: s.textAlign,
    textLetterSpacing: s.textLetterSpacing,
    textSize: s.textSize,
    textPosition: s.textPosition,
    textX: s.textX ?? null,
    textY: s.textY ?? null,
    textRotation: s.textRotation || 0,
    holes: computeFixingHoles(width, height, s.mounting),
    // Bande réservée au ruban le long des bords : le texte à une position prédéfinie en reste écarté
    stripBandMm: stripBandMm(s.lightModel, s.material),
  }
}
