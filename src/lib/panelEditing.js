// Édition directe des éléments du panneau (motif, texte) : boîtes de sélection, poignées,
// détection du point cliqué et calcul des gestes (déplacer, agrandir, tourner, aimanter).
// Tout est exprimé dans le repère 200 (voir panelLayout.js), commun à la 2D et à la 3D.

import { panelExtents, textAnchor, measureTextBlock } from './panelLayout'

const rad = d => (d * Math.PI) / 180
const deg = r => (r * 180) / Math.PI
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const round1 = v => Math.round(v * 10) / 10

// Mêmes bornes que les curseurs du panneau latéral (Ajuster, Texte)
export const SCALE_LIMITS = { motif: [40, 100], text: [40, 160] }
const SNAP_DISTANCE = 3 // unités : aimantation sur les axes du panneau
const SNAP_ANGLE = 4 // degrés : aimantation tous les 15°

// Champs concernés par l'édition directe (annuler / rétablir)
export const EDIT_FIELDS = [
  'motifX', 'motifY', 'motifScale', 'motifRotation', 'motifMirrorH', 'motifMirrorV',
  'textX', 'textY', 'textSize', 'textRotation', 'textAlign', 'textPosition', 'showText', 'textContent',
  'cutStyle', 'cutStyleParams',
]

export function snapshotOf(state) {
  const snap = {}
  for (const k of EDIT_FIELDS) snap[k] = state[k]
  return snap
}

export const sameSnapshot = (a, b) => EDIT_FIELDS.every(k => a[k] === b[k])

// Boîte du motif : un carré de 200 × échelle, centré sur sa position
function motifBox(d) {
  const s = 200 * (d.motifScale / 100)
  const cx = 100 + d.motifX
  const cy = 100 + d.motifY
  return { kind: 'motif', cx, cy, w: s, h: s, rotation: d.motifRotation || 0, pivot: [cx, cy] }
}

// Boîte du bloc de texte, qui tourne autour de son ancrage
function textBox(d) {
  const tb = measureTextBlock(d)
  if (!tb) return null
  const a = textAnchor(d)
  const r = rad(d.textRotation || 0)
  const ox = tb.left + tb.w / 2
  const oy = (tb.top + tb.bottom) / 2
  return {
    kind: 'text',
    cx: a.x + ox * Math.cos(r) - oy * Math.sin(r),
    cy: a.y + ox * Math.sin(r) + oy * Math.cos(r),
    w: tb.w + 4,
    h: tb.bottom - tb.top + 2,
    rotation: d.textRotation || 0,
    pivot: [a.x, a.y],
  }
}

// Boîtes des éléments : centre, dimensions, rotation (degrés) et point de pivot
export function elementBoxes(d) {
  const boxes = {}
  if (d.svg && d.fullPanel) {
    const e = panelExtents(d.width, d.height)
    boxes.pattern = { kind: 'pattern', cx: 100, cy: 100, w: e.x1 - e.x0, h: e.y1 - e.y0, rotation: 0 }
  } else if (d.svg) {
    boxes.motif = motifBox(d)
  }
  const tb = textBox(d)
  if (tb) boxes.text = tb
  return boxes
}

// Demi-encombrement horizontal et vertical d'une boîte tournée
function halfExtents(box) {
  const r = rad(box.rotation || 0)
  const c = Math.abs(Math.cos(r))
  const s = Math.abs(Math.sin(r))
  return [(box.w / 2) * c + (box.h / 2) * s, (box.w / 2) * s + (box.h / 2) * c]
}

// Plage du centre pour que l'élément reste sur le panneau ;
// plus grand que le panneau sur un axe, il doit alors le couvrir entièrement
function centerSpan(lo, hi, half) {
  const a = lo + half
  const b = hi - half
  return a <= b ? [a, b] : [b, a]
}

// Centre corrigé pour garder l'élément sur le panneau. Un élément qui déborde déjà
// (après un agrandissement ou une rotation) peut toujours rentrer, sans sauter.
function containCenter(box, e, [cx, cy]) {
  const [hx, hy] = halfExtents(box)
  const fit = (v, lo, hi, half, from) => {
    const [a, b] = centerSpan(lo, hi, half)
    return clamp(v, Math.min(a, from), Math.max(b, from))
  }
  return [fit(cx, e.x0, e.x1, hx, box.cx), fit(cy, e.y0, e.y1, hy, box.cy)]
}

// L'élément dépasse-t-il du panneau ? (tolérance d'une demi-unité)
function overflows(box, e) {
  const [hx, hy] = halfExtents(box)
  return box.cx - hx < e.x0 - 0.5 || box.cx + hx > e.x1 + 0.5 || box.cy - hy < e.y0 - 0.5 || box.cy + hy > e.y1 + 0.5
}

// Complète un agrandissement ou une rotation : l'élément qui grandit près d'un bord est repoussé
// vers l'intérieur. Un élément qui débordait déjà (placé en débord avec Alt) n'est pas déplacé.
function keepInside(element, state, patch) {
  const boxOf = element === 'motif' ? motifBox : textBox
  const next = { ...state, ...patch }
  const before = boxOf(state)
  const after = boxOf(next)
  if (!before || !after) return patch
  const e = panelExtents(state.width, state.height)
  if (overflows(before, e)) return patch
  const [hx, hy] = halfExtents(after)
  const dx = clamp(after.cx, ...centerSpan(e.x0, e.x1, hx)) - after.cx
  const dy = clamp(after.cy, ...centerSpan(e.y0, e.y1, hy)) - after.cy
  if (!dx && !dy) return patch
  if (element === 'motif') return { ...patch, motifX: round1(next.motifX + dx), motifY: round1(next.motifY + dy) }
  const a = textAnchor(next)
  return { ...patch, textX: round1(a.x + dx), textY: round1(a.y + dy) }
}

// Plage des décalages motifX / motifY qui gardent le motif sur le panneau (curseurs « Ajuster »)
export function motifOffsetRange(d) {
  const e = panelExtents(d.width, d.height)
  const [hx, hy] = halfExtents(motifBox({ ...d, motifX: 0, motifY: 0 }))
  const shift = ([a, b]) => [a - 100, b - 100]
  return { x: shift(centerSpan(e.x0, e.x1, hx)), y: shift(centerSpan(e.y0, e.y1, hy)) }
}

// Point du repère exprimé dans le repère de la boîte (centre, non tourné)
function toBoxLocal(p, box) {
  const r = rad(-box.rotation)
  const dx = p[0] - box.cx
  const dy = p[1] - box.cy
  return [dx * Math.cos(r) - dy * Math.sin(r), dx * Math.sin(r) + dy * Math.cos(r)]
}

function fromBoxLocal([lx, ly], box) {
  const r = rad(box.rotation)
  return [box.cx + lx * Math.cos(r) - ly * Math.sin(r), box.cy + lx * Math.sin(r) + ly * Math.cos(r)]
}

// Coins (agrandir) et poignée de rotation, placée au-dessus du bord haut
export function boxHandles(box, rotateOffset) {
  const hw = box.w / 2
  const hh = box.h / 2
  return {
    corners: [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(p => fromBoxLocal(p, box)),
    topCenter: fromBoxLocal([0, -hh], box),
    rotate: fromBoxLocal([0, -hh - rotateOffset], box),
  }
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

// Élément et poignée sous le pointeur ; handleR = rayon des poignées (unités du repère)
export function hitTest(p, boxes, selected, handleR) {
  const sel = selected && boxes[selected]
  if (sel && sel.kind !== 'pattern') {
    const h = boxHandles(sel, handleR * 4)
    if (dist(p, h.rotate) <= handleR * 1.8) return { element: selected, handle: 'rotate' }
    if (h.corners.some(c => dist(p, c) <= handleR * 1.8)) return { element: selected, handle: 'scale' }
  }
  for (const key of ['text', 'motif']) {
    const box = boxes[key]
    if (!box) continue
    const [lx, ly] = toBoxLocal(p, box)
    if (Math.abs(lx) <= box.w / 2 + handleR && Math.abs(ly) <= box.h / 2 + handleR) return { element: key, handle: 'move' }
  }
  if (boxes.pattern) {
    const [lx, ly] = toBoxLocal(p, boxes.pattern)
    if (Math.abs(lx) <= boxes.pattern.w / 2 && Math.abs(ly) <= boxes.pattern.h / 2) return { element: 'pattern', handle: null }
  }
  return null
}

// Curseur à afficher au survol
export function cursorFor(hit) {
  if (!hit) return ''
  if (hit.handle === 'move') return 'move'
  if (hit.handle === 'scale') return 'nwse-resize'
  if (hit.handle === 'rotate') return 'grab'
  return 'pointer'
}

// Nouveau réglage pendant un geste. g = { element, handle, start, snap, box, design }
// free = sans aimantation (touche Alt). Renvoie { patch, guides }.
export function gesturePatch(g, p, { free = false } = {}) {
  const { element, handle, start, snap, box, design } = g
  const e = panelExtents(design.width, design.height)
  const guides = []

  if (handle === 'move') {
    let cx = box.cx + p[0] - start[0]
    let cy = box.cy + p[1] - start[1]
    if (free) {
      // Alt : ni aimantation ni butée, seul le centre reste sur le panneau
      cx = clamp(cx, e.x0, e.x1)
      cy = clamp(cy, e.y0, e.y1)
    } else {
      // Aimantation du centre de l'élément sur les axes du panneau
      if (Math.abs(cx - 100) < SNAP_DISTANCE) cx = 100
      if (Math.abs(cy - 100) < SNAP_DISTANCE) cy = 100
      // Butée sur les bords : l'élément ne sort pas du panneau
      ;[cx, cy] = containCenter(box, e, [cx, cy])
      if (cx === 100) guides.push('vertical')
      if (cy === 100) guides.push('horizontal')
    }
    const dx = cx - box.cx
    const dy = cy - box.cy
    if (element === 'motif') return { patch: { motifX: round1(snap.motifX + dx), motifY: round1(snap.motifY + dy) }, guides }
    const a = textAnchor({ ...design, ...snap })
    return { patch: { textX: round1(a.x + dx), textY: round1(a.y + dy) }, guides }
  }

  // État au début du geste : sert à repousser l'élément à l'intérieur s'il grandit près d'un bord
  const initial = { ...design, ...snap }

  if (handle === 'scale') {
    const factor = dist(p, [box.cx, box.cy]) / Math.max(1, dist(start, [box.cx, box.cy]))
    const [min, max] = SCALE_LIMITS[element]
    const patch = element === 'motif'
      ? { motifScale: Math.round(clamp(snap.motifScale * factor, min, max)) }
      : { textSize: Math.round(clamp(snap.textSize * factor, min, max)) }
    return { patch: free ? patch : keepInside(element, initial, patch), guides }
  }

  if (handle === 'rotate') {
    const c = [box.cx, box.cy]
    const delta = deg(Math.atan2(p[1] - c[1], p[0] - c[0]) - Math.atan2(start[1] - c[1], start[0] - c[0]))
    const base = element === 'motif' ? snap.motifRotation || 0 : snap.textRotation || 0
    let angle = ((base + delta) % 360 + 360) % 360
    const nearest = Math.round(angle / 15) * 15
    if (!free && Math.abs(angle - nearest) < SNAP_ANGLE) angle = nearest % 360
    angle = Math.round(angle)
    const patch = element === 'motif' ? { motifRotation: angle } : { textRotation: angle }
    return { patch: free ? patch : keepInside(element, initial, patch), guides }
  }

  return { patch: {}, guides }
}

// Actions rapides (barre d'outils et clavier) : renvoient le réglage à appliquer
// state : réglages du configurateur (largeur, hauteur, motif, texte)
export function nudge(element, state, dx, dy) {
  const box = element === 'motif' ? motifBox(state) : element === 'text' ? textBox(state) : null
  if (!box) return {}
  const [cx, cy] = containCenter(box, panelExtents(state.width, state.height), [box.cx + dx, box.cy + dy])
  if (element === 'motif') return { motifX: round1(state.motifX + cx - box.cx), motifY: round1(state.motifY + cy - box.cy) }
  const a = textAnchor(state)
  return { textX: round1(a.x + cx - box.cx), textY: round1(a.y + cy - box.cy) }
}

export function scaleBy(element, state, step) {
  if (element !== 'motif' && element !== 'text') return {}
  const [min, max] = SCALE_LIMITS[element]
  const patch = element === 'motif'
    ? { motifScale: clamp(state.motifScale + step, min, max) }
    : { textSize: clamp(state.textSize + step, min, max) }
  return keepInside(element, state, patch)
}

export function rotateBy(element, state, step) {
  if (element !== 'motif' && element !== 'text') return {}
  const norm = a => ((a % 360) + 360) % 360
  const patch = element === 'motif'
    ? { motifRotation: norm((state.motifRotation || 0) + step) }
    : { textRotation: norm((state.textRotation || 0) + step) }
  return keepInside(element, state, patch)
}
