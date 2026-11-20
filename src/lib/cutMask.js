// Masque de découpe d'un panneau, dessiné dans un canvas 2D
// Convention : blanc = matière conservée, noir = zone découpée au laser (la lumière passe)
// Repère identique à l'aperçu 2D (PanelPreview) : un carré de 200 unités centré dans le panneau,
// pour que la vue 3D et la vue 2D placent motif et texte exactement au même endroit.

export const MASK_MAX_PX = 2048

import { textAnchor, textSizes } from './panelLayout'

// Positions du texte dans le repère 200 (mêmes valeurs que l'aperçu 2D)
export { TEXT_X, TEXT_Y } from './panelLayout'

// Images de motifs déjà décodées : pendant un glisser, seul le placement change,
// le motif n'est pas redécodé à chaque mouvement de souris
const imageCache = new Map()

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
  const key = `${widthPx}x${heightPx}|${svgString}`
  if (imageCache.has(key)) return imageCache.get(key)
  const blob = new Blob([prepareSvgForRaster(svgString, widthPx, heightPx)], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const promise = new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Motif SVG illisible')) }
    img.src = url
  })
  imageCache.set(key, promise)
  promise.catch(() => imageCache.delete(key))
  if (imageCache.size > 8) imageCache.delete(imageCache.keys().next().value)
  return promise
}

// SVG « simple » (motifs de la bibliothèque, styles de découpe, générateurs) : uniquement des chemins
// et des cercles noirs, sans transformation. On le dessine alors directement (Path2D), au tracé exact :
// plus net et plus rapide que de passer par une image redimensionnée, qui floute les passages fins.
// Renvoie { viewBox: [x, y, w, h], shapes: [{ path, rule }] } ou null (autre SVG : rendu en image).
const simpleCache = new Map()
export function simpleSvgShapes(svg) {
  if (simpleCache.has(svg)) return simpleCache.get(svg)
  let result = null
  const vb = svg.match(/viewBox="([^"]+)"/)?.[1]?.trim().split(/[\s,]+/).map(Number)
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  // Uniquement : <g fill="black">, <path …/>, <circle …/>, <rect fill="white" (fond retiré)
  const tags = body.match(/<[^>]+>/g) ?? []
  const allowed = tags.every(t => /^<\/?g( fill="black")?>$/.test(t) || /^<(path|circle)\s[^>]*\/>$/.test(t) || /^<rect[^>]*fill="white"[^>]*\/>$/.test(t))
  if (vb?.length === 4 && vb.every(Number.isFinite) && allowed && !/transform=/.test(body) && !/fill="(?!black)[^"]*"/.test(body.replace(/<rect[^>]*\/>/g, ''))) {
    const shapes = []
    for (const t of tags) {
      if (t.startsWith('<path')) {
        const d = t.match(/\sd="([^"]+)"/)?.[1]
        if (d) shapes.push({ path: new Path2D(d), rule: /fill-rule="evenodd"/.test(t) ? 'evenodd' : 'nonzero' })
      } else if (t.startsWith('<circle')) {
        const num = k => Number(t.match(new RegExp(`\\s${k}="([^"]+)"`))?.[1])
        const [cx, cy, r] = [num('cx'), num('cy'), num('r')]
        if ([cx, cy, r].every(Number.isFinite)) {
          const p = new Path2D()
          p.arc(cx, cy, r, 0, Math.PI * 2)
          shapes.push({ path: p, rule: 'nonzero' })
        }
      }
    }
    if (shapes.length) result = { viewBox: vb, shapes }
  }
  simpleCache.set(svg, result)
  if (simpleCache.size > 12) simpleCache.delete(simpleCache.keys().next().value)
  return result
}

function fillShapes(ctx, simple) {
  ctx.fillStyle = '#000000'
  for (const s of simple.shapes) ctx.fill(s.path, s.rule)
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
    const simple = simpleSvgShapes(design.svg)
    ctx.save()
    ctx.translate(design.motifMirrorH ? w : 0, design.motifMirrorV ? h : 0)
    ctx.scale(design.motifMirrorH ? -1 : 1, design.motifMirrorV ? -1 : 1)
    if (simple) {
      const [vx, vy, vw, vh] = simple.viewBox
      ctx.scale(w / vw, h / vh)
      ctx.translate(-vx, -vy)
      fillShapes(ctx, simple)
    } else {
      ctx.drawImage(await loadSvgImage(design.svg, w, h), 0, 0, w, h)
    }
    ctx.restore()
  }

  // Motif centré (emblème) : même pile de transformations que l'aperçu 2D
  if (design.svg && !design.fullPanel) {
    const scale = design.motifScale / 100
    const simple = simpleSvgShapes(design.svg)
    // Tracé exact si le SVG est simple et carré ; sinon image, de taille arrondie par paliers
    // (agrandir à la souris réutilise la même image décodée)
    const square = simple && simple.viewBox[2] === simple.viewBox[3]
    const img = square ? null : await loadSvgImage(design.svg, Math.max(128, Math.ceil((side * scale) / 128) * 128))
    ctx.save()
    ctx.translate(ox + (100 + design.motifX) * u, oy + (100 + design.motifY) * u)
    ctx.rotate((design.motifRotation * Math.PI) / 180)
    ctx.scale(design.motifMirrorH ? -1 : 1, design.motifMirrorV ? -1 : 1)
    ctx.scale(scale, scale)
    if (square) {
      const [vx, vy, vw] = simple.viewBox
      ctx.translate(-100 * u, -100 * u)
      ctx.scale((200 * u) / vw, (200 * u) / vw)
      ctx.translate(-vx, -vy)
      fillShapes(ctx, simple)
    } else {
      ctx.drawImage(img, -100 * u, -100 * u, 200 * u, 200 * u)
    }
    ctx.restore()
  }

  // Texte découpé dans la matière
  if (design.showText && (design.textContent || design.textSecondary)) {
    const mainSize = textSizes(design).main * u
    // Ancrage : position prédéfinie ou libre (déplacée à la souris), puis rotation autour de ce point
    const anchor = textAnchor(design)
    ctx.save()
    ctx.translate(ox + anchor.x * u, oy + anchor.y * u)
    ctx.rotate(((design.textRotation || 0) * Math.PI) / 180)
    ctx.fillStyle = '#000000'
    ctx.textAlign = design.textAlign === 'left' || design.textAlign === 'right' ? design.textAlign : 'center'
    ctx.textBaseline = 'middle'
    await ensureFont(design.textFont, mainSize)
    drawText(ctx, design.textContent, 0, 0, mainSize, design.textFont, design.textLetterSpacing * u)
    drawText(ctx, design.textSecondary, 0, mainSize * 1.2, mainSize * 0.55, design.textFont, design.textLetterSpacing * 0.5 * u)
    ctx.restore()
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
