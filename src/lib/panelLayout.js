// Mise en page du panneau dans le « repère 200 » partagé par la 2D, la 3D et le masque de découpe :
// un carré de 200 unités, de côté min(largeur, hauteur), centré dans le panneau.

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

// Point d'ancrage du texte : position libre (déplacée à la souris) ou position prédéfinie
export function textAnchor(d) {
  return {
    x: d.textX ?? TEXT_X[d.textAlign] ?? 100,
    y: d.textY ?? TEXT_Y[d.textPosition] ?? 180,
  }
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
