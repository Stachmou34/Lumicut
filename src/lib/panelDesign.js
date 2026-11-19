import { motifs } from '../motifs/index'
import { computeFixingHoles } from './fixings'

// Extrait de l'état du configurateur tout ce qui détermine la découpe du panneau :
// motif, texte, dimensions et trous de fixation. Utilisé par la vue 3D et par le contrôle des fixations.
export function designFromState(s) {
  const svg = s.motifId === 'ai-generated' && s.aiMotifSvg
    ? s.aiMotifSvg
    : (motifs.find(m => m.id === s.motifId) ?? motifs[0]).svg
  const width = s.width || 60
  const height = s.height || 30
  return {
    svg,
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
    holes: computeFixingHoles(width, height, s.mounting),
  }
}
