// Contrôle de fabrication d'un panneau, à partir du masque de découpe (blanc = matière, noir = découpe).
// Repère :
//  - les îlots : morceaux de matière entièrement entourés de découpe, qui tombent au moment de la découpe
//    (intérieur d'un O, disque entouré d'un anneau…) ;
//  - les parties fragiles : morceaux qui ne tiennent au reste du panneau que par un passage plus étroit
//    que l'épaisseur minimale de matière ;
//  - les zones trop fines : bandes de matière plus étroites que ce minimum (risque de casse ou de brûlure) ;
//  - la bande du ruban : le long des bords, la place où le ruban LED se colle dans le creux du U ;
//    une découpe y laisserait voir le ruban à travers le motif (voir lib/stripBand.js).

import { buildCutMask } from './cutMask'

const INF = 1e20
const COLORS = {
  island: [239, 68, 68, 235],
  fragile: [249, 115, 22, 215],
  thin: [250, 204, 21, 200],
  band: [56, 189, 248, 235],
}
// Surface minimale signalée dans la bande du ruban (mm²) : en dessous, ce n'est que l'anticrénelage d'un bord
const MIN_BAND_MM2 = 2

// Transformée de distance euclidienne exacte en 1D (Felzenszwalb & Huttenlocher)
function edt1d(f, n, d, v, z) {
  let k = 0
  v[0] = 0
  z[0] = -INF
  z[1] = INF
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    while (s <= z[k]) {
      k--
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    }
    k++
    v[k] = q
    z[k] = s
    z[k + 1] = INF
  }
  k = 0
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]
  }
}

// Distance au carré (en pixels) de chaque pixel à la source la plus proche.
// isSource(i) : pixel source ; outsideIsSource : l'extérieur du panneau compte comme source (bord découpé)
export function distanceTransform(w, h, isSource, outsideIsSource) {
  // Une marge d'un pixel autour de l'image représente l'extérieur du panneau
  const W = w + 2
  const H = h + 2
  const grid = new Float64Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const inside = x > 0 && y > 0 && x <= w && y <= h
      grid[y * W + x] = inside
        ? (isSource((y - 1) * w + (x - 1)) ? 0 : INF)
        : (outsideIsSource ? 0 : INF)
    }
  }
  const n = Math.max(W, H)
  const f = new Float64Array(n)
  const d = new Float64Array(n)
  const v = new Int32Array(n)
  const z = new Float64Array(n + 1)
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) f[y] = grid[y * W + x]
    edt1d(f, H, d, v, z)
    for (let y = 0; y < H; y++) grid[y * W + x] = d[y]
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) f[x] = grid[y * W + x]
    edt1d(f, W, d, v, z)
    for (let x = 0; x < W; x++) grid[y * W + x] = d[x]
  }
  // Retour au format de l'image (sans la marge)
  const out = new Float64Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) out[y * w + x] = grid[(y + 1) * W + (x + 1)]
  }
  return out
}

// Remplissage par diffusion (4-voisinage) depuis une liste de pixels de départ, limité à mask
export function floodFill(mask, w, h, starts, out, label) {
  const queue = new Int32Array(w * h)
  let head = 0
  let tail = 0
  for (const s of starts) {
    if (mask[s] && !out[s]) {
      out[s] = label
      queue[tail++] = s
    }
  }
  let count = 0
  let sx = 0
  let sy = 0
  while (head < tail) {
    const i = queue[head++]
    count++
    const x = i % w
    const y = (i - x) / w
    sx += x
    sy += y
    if (x > 0 && mask[i - 1] && !out[i - 1]) { out[i - 1] = label; queue[tail++] = i - 1 }
    if (x < w - 1 && mask[i + 1] && !out[i + 1]) { out[i + 1] = label; queue[tail++] = i + 1 }
    if (y > 0 && mask[i - w] && !out[i - w]) { out[i - w] = label; queue[tail++] = i - w }
    if (y < h - 1 && mask[i + w] && !out[i + w]) { out[i + w] = label; queue[tail++] = i + w }
  }
  return { count, cx: count ? sx / count : 0, cy: count ? sy / count : 0 }
}

// Composantes connexes d'un masque : renvoie la carte des étiquettes et leurs statistiques
export function components(mask, w, h) {
  const labels = new Int32Array(w * h)
  const list = []
  for (let i = 0; i < w * h; i++) {
    if (mask[i] && !labels[i]) {
      const stats = floodFill(mask, w, h, [i], labels, list.length + 1)
      list.push({ label: list.length + 1, ...stats })
    }
  }
  return { labels, list }
}

// Position lisible d'un point du panneau (coordonnées en pixels)
function describePosition(cx, cy, w, h) {
  const v = cy < h / 3 ? 'en haut' : cy > (2 * h) / 3 ? 'en bas' : 'au milieu'
  const hz = cx < w / 3 ? 'à gauche' : cx > (2 * w) / 3 ? 'à droite' : 'au centre'
  return v === 'au milieu' && hz === 'au centre' ? 'au centre' : `${v} ${hz}`
}

/**
 * Analyse un design (même format que buildCutMask).
 * options.minBridgeMm : largeur minimale de matière tolérée
 * options.islandsOnly : ne calcule que les îlots et la bande du ruban (plus rapide)
 * options.stripBandMm : largeur de la bande réservée au ruban le long des bords (0 : pas de contrôle)
 */
export async function analyzeCut(design, { minBridgeMm = 3, islandsOnly = false, stripBandMm = 0 } = {}) {
  // Environ 0,5 mm par pixel, plafonné pour rester rapide sur les grands formats
  const longCm = Math.max(design.width, design.height)
  const maxPx = Math.max(400, Math.min(2000, Math.round(longCm * 20)))
  const canvas = await buildCutMask(design, maxPx)
  const w = canvas.width
  const h = canvas.height
  const mmPerPx = (design.width * 10) / w
  const mm2PerPx = mmPerPx * mmPerPx
  const rgba = canvas.getContext('2d').getImageData(0, 0, w, h).data
  const n = w * h

  const material = new Uint8Array(n)
  for (let i = 0; i < n; i++) material[i] = rgba[i * 4] >= 128 ? 1 : 0

  // 1) Îlots : matière qui n'est pas reliée au bord du panneau
  const border = []
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1)
  const attached = new Int32Array(n)
  floodFill(material, w, h, border, attached, 1)

  const floating = new Uint8Array(n)
  for (let i = 0; i < n; i++) floating[i] = material[i] && !attached[i] ? 1 : 0
  const islandComps = components(floating, w, h)
  const minIslandPx = 0.5 / mm2PerPx
  const islands = islandComps.list
    .filter(c => c.count >= minIslandPx)
    .map(c => ({
      label: c.label,
      areaMm2: Math.round(c.count * mm2PerPx),
      where: describePosition(c.cx, c.cy, w, h),
      x: (c.cx / w) * design.width,
      y: (c.cy / h) * design.height,
    }))

  // 2) Bande du ruban : découpes à moins de stripBandMm d'un bord ; les trous des fixations sont prévus
  //    (à 3 cm du bord, hors de la bande) et ne comptent pas. Emprise des découpes au passage.
  const pxPerCm = w / design.width
  const holes = (design.holes ?? []).map(hole => ({
    cx: (hole.x + design.width / 2) * pxPerCm,
    cy: (design.height / 2 - hole.y) * pxPerCm,
    r2: (hole.r * pxPerCm + 1.5) ** 2,
  }))
  const bandPx = stripBandMm / mmPerPx
  const bandMask = new Uint8Array(n)
  const sideCount = { 'en haut': 0, 'en bas': 0, 'à gauche': 0, 'à droite': 0 }
  let bandCount = 0
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let i = 0; i < n; i++) {
    if (material[i]) continue
    const x = i % w
    const y = (i - x) / w
    if (holes.some(o => (x - o.cx) ** 2 + (y - o.cy) ** 2 <= o.r2)) continue
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
    if (!bandPx) continue
    // Bord le plus proche
    let d = y
    let side = 'en haut'
    if (h - 1 - y < d) { d = h - 1 - y; side = 'en bas' }
    if (x < d) { d = x; side = 'à gauche' }
    if (w - 1 - x < d) { d = w - 1 - x; side = 'à droite' }
    if (d < bandPx) {
      bandMask[i] = 1
      bandCount++
      sideCount[side]++
    }
  }
  const bandArea = bandCount * mm2PerPx
  const stripBand = stripBandMm && bandArea >= MIN_BAND_MM2
    ? {
      bandMm: stripBandMm,
      areaMm2: Math.round(bandArea),
      sides: Object.entries(sideCount).filter(([, c]) => c * mm2PerPx >= MIN_BAND_MM2 / 2).map(([side]) => side),
    }
    : null
  // Emprise des découpes (cm, depuis le coin haut gauche) : sert à réduire le motif hors de la bande
  const cutBox = x1 >= 0 ? { x0: x0 / pxPerCm, y0: y0 / pxPerCm, x1: (x1 + 1) / pxPerCm, y1: (y1 + 1) / pxPerCm } : null

  const result = { islands, fragile: [], thin: [], stripBand, bandAreaMm2: Math.round(bandArea), cutBox, minBridgeMm, mmPerPx, overlay: null }
  if (islandsOnly) return result

  // 3) Épaisseur de matière : distance de chaque pixel de matière à la découpe ou au bord du panneau
  const r = minBridgeMm / 2 / mmPerPx
  const r2 = r * r
  const dist = distanceTransform(w, h, i => !material[i], true)
  // Cœur : matière à plus de r de toute découpe ; deux cœurs séparés = reliés seulement par un passage trop étroit
  const core = new Uint8Array(n)
  for (let i = 0; i < n; i++) core[i] = attached[i] && dist[i] > r2 ? 1 : 0
  const coreComps = components(core, w, h)

  // Le cœur principal est le plus grand (le cadre du panneau et tout ce qui y est solidement relié)
  let mainLabel = 0
  let mainCount = 0
  for (const c of coreComps.list) if (c.count > mainCount) { mainCount = c.count; mainLabel = c.label }

  // Zone « ouverte » : matière à moins de r d'un cœur (= partie suffisamment épaisse)
  const distToCore = distanceTransform(w, h, i => core[i] === 1, false)
  const distToMain = distanceTransform(w, h, i => coreComps.labels[i] === mainLabel, false)

  // Parties fragiles : cœurs secondaires assez grands, élargis de r pour l'affichage
  const minFragilePx = (minBridgeMm * minBridgeMm) / mm2PerPx
  const fragileLabels = new Set()
  for (const c of coreComps.list) {
    if (c.label === mainLabel || c.count < minFragilePx / 4) continue
    fragileLabels.add(c.label)
    result.fragile.push({
      areaMm2: Math.round(c.count * mm2PerPx),
      where: describePosition(c.cx, c.cy, w, h),
      x: (c.cx / w) * design.width,
      y: (c.cy / h) * design.height,
    })
  }

  // Zones trop fines : matière rattachée mais loin de tout cœur (plus étroite que le minimum partout)
  const thinMask = new Uint8Array(n)
  for (let i = 0; i < n; i++) thinMask[i] = attached[i] && distToCore[i] > r2 ? 1 : 0
  const thinComps = components(thinMask, w, h)
  const minThinPx = (1.5 * minBridgeMm * minBridgeMm) / mm2PerPx
  const thinLabels = new Set()
  for (const c of thinComps.list) {
    if (c.count < minThinPx) continue
    thinLabels.add(c.label)
    result.thin.push({
      areaMm2: Math.round(c.count * mm2PerPx),
      where: describePosition(c.cx, c.cy, w, h),
      x: (c.cx / w) * design.width,
      y: (c.cy / h) * design.height,
    })
  }

  // 4) Calque de surbrillance : rouge = tombe, orange = fragile, jaune = trop fin, bleu = dans la bande du ruban
  const overlay = document.createElement('canvas')
  overlay.width = w
  overlay.height = h
  const octx = overlay.getContext('2d')
  const img = octx.createImageData(w, h)
  const islandSet = new Set(islands.map(c => c.label))
  for (let i = 0; i < n; i++) {
    let color = null
    if (floating[i] && islandSet.has(islandComps.labels[i])) color = COLORS.island
    else if (attached[i] && distToMain[i] > r2 && distToCore[i] <= r2 && fragileLabels.size) {
      // matière proche d'un cœur secondaire mais pas du cœur principal
      color = COLORS.fragile
    } else if (thinMask[i] && thinLabels.has(thinComps.labels[i])) color = COLORS.thin
    else if (stripBand && bandMask[i]) color = COLORS.band
    if (color) img.data.set(color, i * 4)
  }
  octx.putImageData(img, 0, 0)
  // Limite de la bande du ruban, en pointillés, quand une découpe y entre
  if (stripBand) {
    const lw = Math.max(1.5, w / 400)
    octx.setLineDash([lw * 5, lw * 3.5])
    octx.lineWidth = lw
    octx.strokeStyle = 'rgba(56, 189, 248, 0.9)'
    octx.strokeRect(bandPx, bandPx, w - 2 * bandPx, h - 2 * bandPx)
  }
  result.overlay = overlay
  return result
}
