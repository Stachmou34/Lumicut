// Bande réservée au ruban LED, le long des bords du panneau en U : aucune découpe n'y est permise.
// Le ruban s'y colle, au fond du creux, contre le bord : une découpe dans la bande laisserait voir
// le ruban à travers le motif, et le ruban n'aurait pas de surface où coller.
// Largeur = bord du U + largeur du ruban choisi + un jeu pour la pose à la main.
import { panelProfile } from './panelProfile'
import { PANEL_MATERIALS } from './panelMaterials'
import { LIGHT_MODELS, stripSection } from './lighting/lightingCatalog'

// Jeu laissé au-delà du ruban, pour une pose à la main (mm)
export const STRIP_BAND_CLEARANCE_MM = 2

// Largeur de la bande réservée pour un ruban et une matière (mm)
export function stripBandMm(lightModel, materialId) {
  return panelProfile(materialId).rimMm + stripSection(lightModel).widthMm + STRIP_BAND_CLEARANCE_MM
}

// Bande la plus large possible, tous rubans et toutes matières confondus (mm) :
// les motifs générés laissent au moins ce cadre plein, quel que soit le ruban choisi ensuite
export function maxStripBandMm() {
  return Math.max(...Object.keys(PANEL_MATERIALS).flatMap(m => LIGHT_MODELS.map(l => stripBandMm(l.id, m))))
}

// Échelle qui fait sortir le motif de la bande, en le réduisant autour de son centre.
// box : emprise des découpes du motif seul (cm, depuis le coin haut gauche : x0, y0, x1, y1).
// Renvoie la nouvelle échelle (%), ou null si réduire ne suffit pas (centre du motif dans la bande,
// ou échelle sous le minimum) : il faut alors déplacer le motif.
export function scaleToClearBand({ width, height, motifScale, motifX = 0, motifY = 0, box, bandCm, minScale = 40 }) {
  if (!box) return null
  const u = Math.min(width, height) / 200
  const cx = width / 2 + motifX * u
  const cy = height / 2 + motifY * u
  let k = 1
  // Place disponible de chaque côté du centre, emprise actuelle de ce côté
  const fit = (room, extent) => {
    if (extent > room) k = Math.min(k, room / extent)
  }
  fit(cx - bandCm, cx - box.x0)
  fit(width - bandCm - cx, box.x1 - cx)
  fit(cy - bandCm, cy - box.y0)
  fit(height - bandCm - cy, box.y1 - cy)
  if (k <= 0) return null
  if (k >= 1) return motifScale
  // Un peu de marge sous la limite (la découpe est mesurée au pixel près)
  const scale = Math.floor(motifScale * k * 0.97)
  return scale >= minScale ? scale : null
}
