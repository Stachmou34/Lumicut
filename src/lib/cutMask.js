// Masque de découpe d'un panneau, dessiné dans un canvas 2D
// Convention : blanc = matière conservée, noir = zone découpée au laser (la lumière passe)
// Repère identique à l'aperçu 2D (PanelPreview) : un carré de 200 unités centré dans le panneau,
// pour que la vue 3D et la vue 2D placent motif et texte exactement au même endroit.

export const MASK_MAX_PX = 2048

// Positions du texte dans le repère 200 (mêmes valeurs que l'aperçu 2D)
export const TEXT_Y = { top: 15, center: 100, bottom: 180 }
export const TEXT_X = { left: 10, center: 100, right: 190 }

// Prépare un SVG pour la rasterisation : retire le fond blanc des motifs maison
// et impose une taille de rendu pour obtenir un tracé net quelle que soit la viewBox
export function prepareSvgForRaster(svgString, widthPx, heightPx = widthPx) {
  return svgString
    .replace(/<rect[^>]*fill="white"[^>]*\/>/g, '')
    .replace(/<svg([^>]*)>/, (_, attrs) => {
      const sansTaille = attrs.replace(/\s(width|height)="[^"]*"/g, '')
      return `<svg${sansTaille} width="${widthPx}" height="${heightPx}">`
    })
}

// Charge un SVG (chaîne) sous forme d'image dessinable dans un canvas
export function loadSvgImage(svgString, widthPx, heightPx = widthPx) {
  const blob = new Blob([prepareSvgForRaster(svgString, widthPx, heightPx)], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Motif SVG illisible')) }
    img.src = url
  })
}

// Taille du canvas en conservant le ratio largeur / hauteur du panneau
export function maskCanvasSize(widthCm, heightCm, maxPx = MASK_MAX_PX) {
  const ratio = widthCm / heightCm
  return ratio >= 1
    ? { w: maxPx, h: Math.max(1, Math.round(maxPx / ratio)) }
    : { w: Math.max(1, Math.round(maxPx * ratio)), h: maxPx }
}

// Attend que la police du texte soit chargée (sinon le canvas utiliserait une police de repli)
async function ensureFont(family, sizePx) {
  if (!document.fonts?.load) return
  try {
    await document.fonts.load(`${Math.round(sizePx)}px "${family}"`)
  } catch {
    // Police indisponible : le navigateur utilisera la police de repli
  }
}

function drawText(ctx, text, x, y, sizePx, family, spacingPx) {
  if (!text) return
  ctx.font = `${sizePx}px "${family}", sans-serif`
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacingPx}px`
  ctx.fillText(text, x, y)
}

// Dessine le masque complet (motif + texte) et renvoie le canvas
// design : { svg, width, height (cm), motifScale, motifX, motifY, motifRotation,
//            motifMirrorH, motifMirrorV, showText, textContent, textSecondary,
//            textFont, textAlign, textLetterSpacing, textSize, textPosition }
export async function buildCutMask(design, maxPx = MASK_MAX_PX) {
  const { w, h } = maskCanvasSize(design.width, design.height, maxPx)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)

  // Carré de référence de 200 unités, centré dans le panneau
  const side = Math.min(w, h)
  const u = side / 200
  const ox = (w - side) / 2
  const oy = (h - side) / 2

  // Motif pleine surface (généré en cm, viewBox = panneau entier) : couvre tout le panneau
  if (design.svg && design.fullPanel) {
    const img = await loadSvgImage(design.svg, w, h)
    ctx.save()
    ctx.translate(design.motifMirrorH ? w : 0, design.motifMirrorV ? h : 0)
    ctx.scale(design.motifMirrorH ? -1 : 1, design.motifMirrorV ? -1 : 1)
    ctx.drawImage(img, 0, 0, w, h)
    ctx.restore()
  }

  // Motif centré (emblème) : même pile de transformations que l'aperçu 2D
  if (design.svg && !design.fullPanel) {
    const scale = design.motifScale / 100
    const img = await loadSvgImage(design.svg, Math.max(64, Math.round(side * scale)))
    ctx.save()
    ctx.translate(ox + (100 + design.motifX) * u, oy + (100 + design.motifY) * u)
    ctx.rotate((design.motifRotation * Math.PI) / 180)
    ctx.scale(design.motifMirrorH ? -1 : 1, design.motifMirrorV ? -1 : 1)
    ctx.scale(scale, scale)
    ctx.drawImage(img, -100 * u, -100 * u, 200 * u, 200 * u)
    ctx.restore()
  }

  // Texte découpé dans la matière
  if (design.showText && (design.textContent || design.textSecondary)) {
    const mainSize = (design.textSize / 100) * 30 * u
    const x = ox + (TEXT_X[design.textAlign] ?? 100) * u
    const y = oy + (TEXT_Y[design.textPosition] ?? 180) * u
    ctx.fillStyle = '#000000'
    ctx.textAlign = design.textAlign === 'left' || design.textAlign === 'right' ? design.textAlign : 'center'
    ctx.textBaseline = 'middle'
    await ensureFont(design.textFont, mainSize)
    drawText(ctx, design.textContent, x, y, mainSize, design.textFont, design.textLetterSpacing * u)
    drawText(ctx, design.textSecondary, x, y + mainSize * 1.2, mainSize * 0.55, design.textFont, design.textLetterSpacing * 0.5 * u)
  }

  // Trous de fixation : traversent la matière (coordonnées en cm depuis le centre, y vers le haut)
  if (design.holes?.length) {
    const pxPerCm = w / design.width
    ctx.fillStyle = '#000000'
    for (const hole of design.holes) {
      ctx.beginPath()
      ctx.arc((hole.x + design.width / 2) * pxPerCm, (design.height / 2 - hole.y) * pxPerCm, hole.r * pxPerCm, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  return canvas
}

// Repère les trous dont la zone de fixation (capuchon + marge) touche une découpe du motif ou du texte :
// une découpe trop proche fragilise la matière et serait masquée par le capuchon.
// Renvoie la liste des trous en conflit.
export async function findHoleConflicts(design, holes, clearanceCm, maxPx = 512) {
  if (!holes.length || !clearanceCm) return []
  const canvas = await buildCutMask({ ...design, holes: [] }, maxPx)
  const ctx = canvas.getContext('2d')
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const pxPerCm = canvas.width / design.width
  const radius = clearanceCm * pxPerCm

  return holes.filter(hole => {
    const cx = (hole.x + design.width / 2) * pxPerCm
    const cy = (design.height / 2 - hole.y) * pxPerCm
    for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(height - 1, Math.ceil(cy + radius)); y++) {
      for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(width - 1, Math.ceil(cx + radius)); x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > radius ** 2) continue
        if (data[(y * width + x) * 4] < 128) return true // pixel découpé
      }
    }
    return false
  })
}
