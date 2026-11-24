// Mise en page du panneau dans le « repère 200 » partagé par la 2D, la 3D et le masque de découpe :
// un carré de 200 unités, de côté min(largeur, hauteur), centré dans le panneau.

import { stripBandMm } from './stripBand'

// Positions prédéfinies du texte (boutons Haut / Centre / Bas et alignements)
export const TEXT_Y = { top: 15, center: 100, bottom: 180 }
export const TEXT_X = { left: 10, center: 100, right: 190 }

// Étendue du panneau dans le repère 200 et taille d'une unité en cm
export function panelExtents(widthCm, heightCm) {
  const S = Math.min(widthCm, heightCm)
  const hx = (100 * widthCm) / S
  const hy = (100 * heightCm) / S
  return { x0: 100 - hx, y0: 100 - hy, x1: 100 + hx, y1: 100 + hy, unitCm: S / 200 }
}

// Marge au-delà de la bande du ruban pour un texte à une position prédéfinie (unités du repère)
const TEXT_BAND_MARGIN = 1.5

// Largeur de la bande réservée au ruban (mm) : fournie par designFromState, ou tirée des réglages
function bandOf(d) {
  if (typeof d.stripBandMm === 'number') return d.stripBandMm
  return d.lightModel ? stripBandMm(d.lightModel, d.material) : 0
}

// Borne basse puis haute ; si la place manque (texte plus grand que la zone libre), le milieu de la zone
const clampInside = (v, lo, hi) => (lo <= hi ? Math.min(Math.max(v, lo), hi) : (lo + hi) / 2)

// Point d'ancrage du texte : position libre (déplacée à la souris) ou position prédéfinie.
// Une position prédéfinie (en haut, en bas, à gauche, à droite) garde le texte hors de la bande
// réservée au ruban, le long des bords, quels que soient le format et le ruban ; une position libre
// reste où le client l'a mise (le contrôle de fabrication la signale si elle entre dans la bande).
export function textAnchor(d) {
  let x = d.textX ?? TEXT_X[d.textAlign] ?? 100
  let y = d.textY ?? TEXT_Y[d.textPosition] ?? 180
  if (d.textX != null && d.textY != null) return { x, y }
  const band = bandOf(d)
  const block = band && d.width && d.height ? measureTextBlock(d) : null
  if (!block) return { x, y }
  const e = panelExtents(d.width, d.height)
  const inset = band / 10 / e.unitCm + TEXT_BAND_MARGIN
  if (d.textY == null) y = clampInside(y, e.y0 + inset - block.top, e.y1 - inset - block.bottom)
  if (d.textX == null) x = clampInside(x, e.x0 + inset - block.left, e.x1 - inset - block.left - block.w)
  return { x, y }
}

// Tailles de police (unités du repère) de la ligne principale et du sous-titre
export function textSizes(d) {
  const main = (d.textSize / 100) * 30
  return { main, sub: main * 0.55 }
}

let measureCtx = null

// Encombrement du bloc de texte, relatif à son ancrage (avant rotation)
export function measureTextBlock(d) {
  if (!d.showText || !(d.textContent || d.textSecondary)) return null
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')
  const { main, sub } = textSizes(d)
  const width = (text, size, spacing) => {
    if (!text) return 0
    measureCtx.font = `${size}px "${d.textFont}", sans-serif`
    if ('letterSpacing' in measureCtx) measureCtx.letterSpacing = `${spacing}px`
    return measureCtx.measureText(text).width
  }
  const w = Math.max(
    width(d.textContent, main, d.textLetterSpacing),
    width(d.textSecondary, sub, d.textLetterSpacing * 0.5),
    main * 0.5,
  )
  const top = -main * 0.62
  const bottom = d.textSecondary ? main * 1.2 + sub * 0.62 : main * 0.62
  // Décalage horizontal selon l'alignement : l'ancrage est le début, le milieu ou la fin du texte
  const left = d.textAlign === 'left' ? 0 : d.textAlign === 'right' ? -w : -w / 2
  return { w, top, bottom, left }
}
