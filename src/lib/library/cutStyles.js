// Styles de découpe d'un motif de la bibliothèque : au lieu d'évider toute la silhouette (un grand trou,
// peu joli le jour), la lumière passe par de fines découpes qui dessinent le motif.
//
//  - contour : un trait suit le bord de la forme (et de ses détails intérieurs), tenu par des ponts réguliers ;
//  - echo    : plusieurs traits parallèles, comme les courbes de niveau d'une carte ;
//  - lines   : des fentes parallèles remplissent la forme ;
//  - dots    : des perçages, plus gros au cœur de la forme qu'au bord.
//
// Tout est calculé à la taille réelle du motif (mm) : traits, espacements et ponts gardent la même finesse
// quel que soit le format. Calcul au pixel (≈ 0,35 mm), tracé final en vectoriel (courbes de niveau).

import { contours } from 'd3-contour'
import { distanceTransform, floodFill } from '../cutAnalysis'

const VIEW = 200

export const CUT_STYLES = [
  { id: 'silhouette', label: 'Silhouette', hint: 'La forme entière est évidée : très lumineux, mais un grand trou le jour.' },
  { id: 'contour', label: 'Contour', hint: 'Un trait de lumière dessine le motif ; le jour, une fine gravure.' },
  { id: 'echo', label: 'Contours multiples', hint: 'Plusieurs traits parallèles, comme des courbes de niveau.' },
  { id: 'lines', label: 'Lignes', hint: 'Des fentes parallèles remplissent la forme.' },
  { id: 'dots', label: 'Points', hint: 'Des perçages plus gros au cœur de la forme : un dégradé de lumière.' },
]

// Réglages par style (mm à taille réelle)
export const STYLE_PARAMS = {
  contour: [
    { key: 'width', label: 'Épaisseur du trait', min: 1, max: 4, step: 0.1, unit: ' mm', default: 1.6 },
    { key: 'every', label: 'Écart entre les ponts', min: 20, max: 120, step: 5, unit: ' mm', default: 45 },
  ],
  echo: [
    { key: 'width', label: 'Épaisseur des traits', min: 1, max: 3, step: 0.1, unit: ' mm', default: 1.4 },
    { key: 'count', label: 'Nombre de traits', min: 2, max: 6, step: 1, unit: '', default: 3 },
    { key: 'every', label: 'Écart entre les ponts', min: 20, max: 120, step: 5, unit: ' mm', default: 45 },
  ],
  lines: [
    { key: 'width', label: 'Épaisseur des fentes', min: 1, max: 4, step: 0.1, unit: ' mm', default: 1.6 },
    { key: 'pitch', label: 'Écart entre les fentes', min: 4, max: 12, step: 0.5, unit: ' mm', default: 5.5 },
    { key: 'angle', label: 'Orientation', type: 'choice', default: 0, options: [[0, '—'], [90, '|'], [45, '/'], [135, '\\']] },
  ],
  dots: [
    { key: 'pitch', label: 'Écart entre les points', min: 4, max: 14, step: 0.5, unit: ' mm', default: 6.5 },
    { key: 'size', label: 'Taille des points', min: 0.3, max: 1, step: 0.05, unit: '', default: 0.8 },
  ],
}

export function styleParams(style, params = {}) {
  const out = {}
  for (const p of STYLE_PARAMS[style] ?? []) out[p.key] = params[p.key] ?? p.default
  return out
}

const INSET_MM = 0.5 // le trait reste un peu à l'intérieur du bord de la forme
const SAFETY_MM = 0.8 // marge ajoutée aux ponts (le contrôle mesure au demi-millimètre)

// Forme du motif (chemin du SVG « forme ») rendue en masque : 1 = intérieur de la forme
function rasterize(formeSvg, N, margin, pxPerUnit) {
  const d = formeSvg.match(/\sd="([^"]+)"/)?.[1]
  if (!d) throw new Error('Forme illisible')
  const canvas = document.createElement('canvas')
  canvas.width = N
  canvas.height = N
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, N, N)
  ctx.translate(margin, margin)
  ctx.scale(pxPerUnit, pxPerUnit)
  ctx.fillStyle = '#000'
  ctx.fill(new Path2D(d), 'evenodd')
  const rgba = ctx.getImageData(0, 0, N, N).data
  const inside = new Uint8Array(N * N)
  for (let i = 0; i < N * N; i++) inside[i] = rgba[i * 4] < 128 ? 1 : 0
  return inside
}

// Distances (mm) à partir d'un masque de sources
function distances(N, isSource, mmPerPx) {
  const sq = distanceTransform(N, N, isSource, false)
  const out = new Float32Array(N * N)
  for (let i = 0; i < out.length; i++) out[i] = Math.sqrt(sq[i]) * mmPerPx
  return out
}

// Pose un pont (rectangle orienté de matière) : f devient négatif dessous
function stampBridge(f, N, cx, cy, ux, uy, halfLen, halfWidth) {
  const r = Math.ceil(Math.hypot(halfLen, halfWidth)) + 1
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(N - 1, Math.ceil(cy + r)); y++) {
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(N - 1, Math.ceil(cx + r)); x++) {
      const dx = x - cx
      const dy = y - cy
      const along = Math.abs(dx * ux + dy * uy)
      const across = Math.abs(-dx * uy + dy * ux)
      if (along <= halfLen && across <= halfWidth) f[y * N + x] = -1
    }
  }
}

// Ponts réguliers le long d'une courbe de niveau (anneaux en pixels) : un pont tous les « every » mm,
// au moins un par anneau, perpendiculaire au trait. offset : décalage (0 à 1) pour alterner les rangs.
function bridgesAlong(f, N, rings, { everyPx, halfLen, halfWidth, offset = 0.5, minPerRing = 1 }) {
  for (const ring of rings) {
    const lens = [0]
    for (let k = 1; k < ring.length; k++) lens.push(lens[k - 1] + Math.hypot(ring[k][0] - ring[k - 1][0], ring[k][1] - ring[k - 1][1]))
    const total = lens[lens.length - 1]
    if (total < 2) continue
    const n = Math.max(minPerRing, Math.round(total / everyPx))
    let k = 1
    for (let b = 0; b < n; b++) {
      const s = ((b + offset) / n) * total
      while (k < lens.length - 1 && lens[k] < s) k++
      const [x0, y0] = ring[k - 1]
      const [x1, y1] = ring[k]
      const seg = Math.max(1e-6, lens[k] - lens[k - 1])
      const t = (s - lens[k - 1]) / seg
      const tx = (x1 - x0) / seg
      const ty = (y1 - y0) / seg
      // Le pont traverse le trait : son grand côté suit la normale à la courbe
      stampBridge(f, N, x0 + (x1 - x0) * t - 0.5, y0 + (y1 - y0) * t - 0.5, -ty, tx, halfLen, halfWidth)
    }
  }
}

// Courbes de niveau d'un champ (anneaux en pixels)
function levelRings(values, N, level) {
  const [geo] = contours().size([N, N]).thresholds([level])(values)
  const rings = []
  for (const poly of geo.coordinates) for (const ring of poly) rings.push(ring)
  return rings
}

// Garantie, même règle que le contrôle du studio : on appelle « cœur » la matière à plus de coreMm de
// toute découpe. Le cœur principal est celui du panneau (relié au bord). Tout autre cœur ne tient que par un
// passage trop étroit, ou pas du tout : il reçoit un pont vers le cœur principal, au plus court. Un îlot
// sans cœur (miette plus fine que le minimum) est découpé. Renvoie vrai si quelque chose a changé.
function weakPartsPass(f, N, material, mmPerPx, coreMm, bridgeHalfPx) {
  const n = N * N
  const border = []
  for (let x = 0; x < N; x++) border.push(x, (N - 1) * N + x)
  for (let y = 1; y < N - 1; y++) border.push(y * N, y * N + N - 1)
  const neighbors = i => {
    const x = i % N
    return [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, i - N, i + N]
  }
  const sq = distanceTransform(N, N, i => !material[i], false)
  const r = coreMm / mmPerPx
  const core = new Uint8Array(n)
  for (let i = 0; i < n; i++) core[i] = material[i] && sq[i] > r * r ? 1 : 0
  const main = new Int32Array(n)
  floodFill(core, N, N, border, main, 1)
  const attached = new Int32Array(n)
  floodFill(material, N, N, border, attached, 1)
  let changed = false

  // Un seul parcours en largeur depuis le cœur principal : pour chaque pixel, le pas suivant vers lui
  const parent = new Int32Array(n).fill(-1)
  const dist = new Int32Array(n).fill(-1)
  const queue = new Int32Array(n)
  let head = 0
  let tail = 0
  for (let i = 0; i < n; i++) if (main[i]) { parent[i] = i; dist[i] = 0; queue[tail++] = i }
  while (head < tail) {
    const i = queue[head++]
    for (const j of neighbors(i)) {
      if (j < 0 || j >= n || dist[j] !== -1) continue
      dist[j] = dist[i] + 1
      parent[j] = i
      queue[tail++] = j
    }
  }
  // Pont d'un pixel vers le cœur principal, en suivant le parcours
  const bridgeFrom = a => {
    let b = a
    while (!main[b] && parent[b] !== b && parent[b] >= 0) b = parent[b]
    const ax = a % N
    const ay = (a - ax) / N
    const bx = b % N
    const by = (b - bx) / N
    const len = Math.hypot(bx - ax, by - ay) || 1
    stampBridge(f, N, (ax + bx) / 2, (ay + by) / 2, (bx - ax) / len, (by - ay) / len, len / 2 + 1, bridgeHalfPx)
    return [ax, ay]
  }

  // a) Cœurs secondaires (îlots épais ou parties fragiles) : un pont au plus court, deux pour les grands
  const label = new Uint8Array(n)
  for (let s = 0; s < n; s++) {
    if (!core[s] || main[s] || label[s]) continue
    const comp = []
    head = 0
    tail = 0
    queue[tail++] = s
    label[s] = 1
    while (head < tail) {
      const i = queue[head++]
      comp.push(i)
      for (const j of neighbors(i)) if (j >= 0 && j < n && core[j] && !main[j] && !label[j]) { label[j] = 1; queue[tail++] = j }
    }
    let best = comp[0]
    for (const i of comp) if (dist[i] >= 0 && (dist[best] < 0 || dist[i] < dist[best])) best = i
    if (dist[best] < 0) continue
    const [ax, ay] = bridgeFrom(best)
    if (comp.length * mmPerPx * mmPerPx > 250) {
      const span = Math.sqrt(comp.length)
      let second = -1
      for (const i of comp) {
        const x = i % N
        const y = (i - x) / N
        if (Math.hypot(x - ax, y - ay) < span * 0.8 || dist[i] < 0) continue
        if (second < 0 || dist[i] < dist[second]) second = i
      }
      if (second >= 0) bridgeFrom(second)
    }
    changed = true
  }

  // b) Îlots sans aucun cœur (miettes plus fines que le minimum) : découpés
  const seen = new Uint8Array(n)
  for (let s = 0; s < n; s++) {
    if (!material[s] || attached[s] || seen[s]) continue
    const comp = []
    let hasCore = false
    head = 0
    tail = 0
    queue[tail++] = s
    seen[s] = 1
    while (head < tail) {
      const i = queue[head++]
      comp.push(i)
      if (core[i]) hasCore = true
      for (const j of neighbors(i)) if (j >= 0 && j < n && material[j] && !attached[j] && !seen[j]) { seen[j] = 1; queue[tail++] = j }
    }
    if (hasCore) continue
    for (const i of comp) f[i] = 1
    changed = true
  }
  return changed
}

// Règle stricte (cœur à un demi-minimum + 0,3 mm), répétée jusqu'à stabilité
function holdWeakParts(f, N, mmPerPx, minMaterialMm, bridgeHalfPx) {
  for (let pass = 0; pass < 5; pass++) {
    const material = new Uint8Array(N * N)
    for (let i = 0; i < material.length; i++) material[i] = f[i] > 0 ? 0 : 1
    if (!weakPartsPass(f, N, material, mmPerPx, minMaterialMm / 2 + 0.3, bridgeHalfPx)) break
  }
}

// Vérification sur le tracé final, rendu comme le fera le contrôle du studio : la même passe
// (îlots, parties fragiles, miettes) sur ce rendu. Renvoie vrai si un pont a été ajouté.
function checkTraced(f, N, d, margin, pxPerUnit, mmPerPx, minMaterialMm, bridgeHalfPx) {
  const canvas = document.createElement('canvas')
  canvas.width = N
  canvas.height = N
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, N, N)
  ctx.translate(margin, margin)
  ctx.scale(pxPerUnit, pxPerUnit)
  ctx.fillStyle = '#000'
  if (d) ctx.fill(new Path2D(d), 'evenodd')
  const rgba = ctx.getImageData(0, 0, N, N).data
  const material = new Uint8Array(N * N)
  for (let i = 0; i < material.length; i++) material[i] = rgba[i * 4] >= 128 ? 1 : 0
  // Règle exacte du contrôle du studio, puis règle stricte
  const a = weakPartsPass(f, N, material, mmPerPx, minMaterialMm / 2, bridgeHalfPx)
  const b = weakPartsPass(f, N, material, mmPerPx, minMaterialMm / 2 + 0.3, bridgeHalfPx)
  return a || b
}

// Simplification d'un anneau (Ramer-Douglas-Peucker)
function simplify(points, tol) {
  if (points.length < 4) return points
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    const [ax, ay] = points[a]
    const [bx, by] = points[b]
    const dx = bx - ax
    const dy = by - ay
    const L = Math.hypot(dx, dy) || 1
    let max = 0
    let idx = -1
    for (let k = a + 1; k < b; k++) {
      const d = Math.abs((points[k][0] - ax) * dy - (points[k][1] - ay) * dx) / L
      if (d > max) { max = d; idx = k }
    }
    if (max > tol && idx > 0) {
      keep[idx] = 1
      stack.push([a, idx], [idx, b])
    }
  }
  return points.filter((_, k) => keep[k])
}

// Anneau fermé (premier point = dernier) : on le coupe au point le plus éloigné du départ,
// sinon la simplification ne garderait que le départ et l'arrivée, confondus
function simplifyRing(ring, tol) {
  let far = 0
  let best = -1
  for (let k = 1; k < ring.length; k++) {
    const d = Math.hypot(ring[k][0] - ring[0][0], ring[k][1] - ring[0][1])
    if (d > best) { best = d; far = k }
  }
  if (far < 2) return ring
  return [...simplify(ring.slice(0, far + 1), tol), ...simplify(ring.slice(far), tol).slice(1)]
}

const fmt = n => String(Math.round(n * 100) / 100)

function pathFromField(f, N, toUnits) {
  const [geo] = contours().size([N, N]).thresholds([0.0001])(f)
  const parts = []
  for (const poly of geo.coordinates) {
    for (const ring of poly) {
      const pts = simplifyRing(ring, 0.35)
      if (pts.length < 4) continue
      parts.push('M' + pts.map(([x, y]) => {
        const [u, v] = toUnits(x, y)
        return `${fmt(u)} ${fmt(v)}`
      }).join('L') + 'Z')
    }
  }
  return parts.join('')
}

const cache = new Map()
const lastByFamily = new Map()

/**
 * Motif de la bibliothèque dans un style de découpe.
 * formeSvg : forme d'origine (sans ponts), repère 200 ; unitMm : mm par unité du repère à taille réelle ;
 * bridgeMm : largeur minimale de matière du matériau.
 */
export function applyCutStyle(formeSvg, style, params = {}, { unitMm, bridgeMm = 3, key = '', preview = false } = {}) {
  const p = styleParams(style, params)
  // Taille arrondie par paliers de 5 % : agrandir à la souris ne recalcule pas le style à chaque mouvement
  const unit = Math.exp(Math.round(Math.log(unitMm) / 0.05) * 0.05)
  const family = JSON.stringify([key || formeSvg.length, style, p, bridgeMm])
  const cacheKey = `${family}|${unit.toFixed(4)}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)
  // Pendant un geste (agrandir à la souris), on garde le dernier tracé calculé pour ce motif
  if (preview && lastByFamily.has(family)) return lastByFamily.get(family)

  const sideMm = VIEW * unit
  // Même finesse que le contrôle du studio (0,5 mm) : ce que le calcul tient, le contrôle le voit tenu
  const mmPerPx = Math.max(0.5, sideMm / 1000)
  const pxPerUnit = unit / mmPerPx
  const margin = 8
  const N = Math.ceil(VIEW * pxPerUnit) + 2 * margin
  const inside = rasterize(formeSvg, N, margin, pxPerUnit)
  const D = distances(N, i => !inside[i], mmPerPx) // profondeur dans la forme (mm)
  const bridge = bridgeMm + SAFETY_MM
  const toUnits = (x, y) => [(x - margin) / pxPerUnit, (y - margin) / pxPerUnit]
  const f = new Float32Array(N * N).fill(-1)
  const px = mm => mm / mmPerPx

  if (style === 'dots') {
    // Perçages en quinconce ; rayon selon la profondeur, borné pour garder un pont entre deux points
    const pitch = p.pitch
    const rMax = Math.max(0.4, (Math.min(pitch * p.size, pitch - bridge)) / 2)
    const rMin = 0.45
    const parts = []
    const rowStep = (pitch * Math.sqrt(3)) / 2
    let row = 0
    for (let y = rowStep / 2; y < sideMm; y += rowStep, row++) {
      for (let x = (row % 2 ? pitch / 2 : 0) + pitch / 2; x < sideMm; x += pitch) {
        const ix = Math.round(px(x) + margin)
        const iy = Math.round(px(y) + margin)
        if (ix < 0 || iy < 0 || ix >= N || iy >= N) continue
        const depth = D[iy * N + ix]
        const r = Math.min(rMax, (depth - INSET_MM) * 0.75)
        if (r < rMin) continue
        const [u, v] = toUnits(px(x) + margin, px(y) + margin)
        const ru = r / unit
        parts.push(`M${fmt(u - ru)} ${fmt(v)}a${fmt(ru)} ${fmt(ru)} 0 1 0 ${fmt(2 * ru)} 0a${fmt(ru)} ${fmt(ru)} 0 1 0 ${fmt(-2 * ru)} 0Z`)
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}"><path fill="black" fill-rule="evenodd" d="${parts.join('')}"/></svg>`
    cache.set(cacheKey, svg)
    lastByFamily.set(family, svg)
    if (cache.size > 24) cache.delete(cache.keys().next().value)
    if (lastByFamily.size > 24) lastByFamily.delete(lastByFamily.keys().next().value)
    return svg
  }

  if (style === 'lines') {
    // Fentes parallèles ; elles s'arrêtent à un demi-millimètre du bord de la forme
    const w = Math.min(p.width, p.pitch - bridge)
    const a = (p.angle * Math.PI) / 180
    const nx = -Math.sin(a)
    const ny = Math.cos(a)
    for (let i = 0; i < N * N; i++) {
      if (!inside[i]) continue
      const x = ((i % N) - margin) * mmPerPx
      const y = (Math.floor(i / N) - margin) * mmPerPx
      const t = x * nx + y * ny
      const phase = ((t % p.pitch) + p.pitch) % p.pitch
      const line = w / 2 - Math.abs(phase - p.pitch / 2)
      f[i] = Math.min(line, D[i] - INSET_MM)
    }
  } else {
    // Contour et contours multiples : bandes à profondeur constante sous le bord de la forme
    const w = p.width
    const count = style === 'echo' ? p.count : 1
    const spacing = w + bridge // un pont de matière entre deux traits
    for (let k = 0; k < count; k++) {
      const center = INSET_MM + w / 2 + k * spacing
      // Zone assez large pour ce trait des deux côtés avec un pont au milieu ; ailleurs (parties fines),
      // le premier trait devient un seul trait central, les suivants s'arrêtent
      const deep = center + w / 2 + bridge / 2
      // Un point est « en zone large » si une partie assez profonde l'attend droit devant, vers l'intérieur
      const wide = distances(N, i => D[i] > deep, mmPerPx)
      const tol = 1.5 * mmPerPx
      for (let i = 0; i < N * N; i++) {
        if (!inside[i]) continue
        let v
        // Le cœur profond de la forme (D > deep) reste en matière : seule la bande est découpée
        if (D[i] >= deep || wide[i] <= deep - D[i] + tol) v = w / 2 - Math.abs(D[i] - center)
        else v = k === 0 ? D[i] - INSET_MM : -1
        if (v > f[i]) f[i] = v
      }
    }
    // Ponts réguliers le long de chaque trait, décalés d'un trait à l'autre
    for (let k = 0; k < count; k++) {
      const center = INSET_MM + w / 2 + k * spacing
      const rings = levelRings(D, N, center)
      bridgesAlong(f, N, rings, {
        everyPx: px(p.every),
        halfLen: px(w / 2 + 1.2),
        halfWidth: px(bridge / 2),
        offset: k % 2 ? 0 : 0.5,
        minPerRing: 1,
      })
    }
  }

  holdWeakParts(f, N, mmPerPx, bridgeMm, px(bridge / 2))
  let d = pathFromField(f, N, toUnits)
  for (let attempt = 0; attempt < 6; attempt++) {
    if (!checkTraced(f, N, d, margin, pxPerUnit, mmPerPx, bridgeMm, px(bridge / 2))) break
    d = pathFromField(f, N, toUnits)
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}"><path fill="black" fill-rule="evenodd" d="${d}"/></svg>`
  cache.set(cacheKey, svg)
  lastByFamily.set(family, svg)
  if (cache.size > 24) cache.delete(cache.keys().next().value)
  if (lastByFamily.size > 24) lastByFamily.delete(lastByFamily.keys().next().value)
  return svg
}
