// Outils géométriques des générateurs de motifs.
// Convention : les formes renvoyées sont les zones DÉCOUPÉES (noires), la matière est ce qui reste.
// Unités : cm pour les motifs pleine surface (repère du panneau, y vers le bas),
// unités du carré 200 pour les emblèmes.

// Générateur pseudo-aléatoire déterministe (mulberry32) : même graine = même motif
export function createRandom(seed) {
  let a = (Math.floor(seed) >>> 0) || 1
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => Math.floor(min + (max - min + 1) * next()),
    pick: list => list[Math.floor(next() * list.length)],
    chance: p => next() < p,
  }
}

// Nombre compact pour le SVG (2 décimales)
export const fmt = n => String(Math.round(n * 100) / 100)

export function svgDocument(viewW, viewH, paths) {
  const body = paths.map(d => `<path d="${d}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(viewW)} ${fmt(viewH)}"><g fill="black">${body}</g></svg>`
}

export function polygonArea(poly) {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % poly.length]
    a += x1 * y2 - x2 * y1
  }
  return a / 2
}

// Garde la partie du polygone où f(p) >= 0 (f affine : découpe par un demi-plan)
export function clipHalfPlane(poly, f) {
  const out = []
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    const fp = f(p)
    const fq = f(q)
    if (fp >= 0) out.push(p)
    if ((fp >= 0) !== (fq >= 0)) {
      const t = fp / (fp - fq)
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t])
    }
  }
  return out
}

// Découpe un polygone par un rectangle [x0, y0, x1, y1]
export function clipPolygonToRect(poly, [x0, y0, x1, y1]) {
  let out = poly
  out = clipHalfPlane(out, p => p[0] - x0)
  if (out.length < 3) return []
  out = clipHalfPlane(out, p => x1 - p[0])
  if (out.length < 3) return []
  out = clipHalfPlane(out, p => p[1] - y0)
  if (out.length < 3) return []
  return clipHalfPlane(out, p => y1 - p[1])
}

// Réduit un polygone convexe de d sur tous ses côtés (intersection de demi-plans : robuste
// même quand un côté court disparaît). Renvoie null si le polygone s'effondre.
export function insetConvexPolygon(poly, d) {
  const sign = Math.sign(polygonArea(poly)) || 1
  let out = poly
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i]
    const [bx, by] = poly[(i + 1) % poly.length]
    const len = Math.hypot(bx - ax, by - ay)
    if (len < 1e-9) continue
    const nx = (-(by - ay) / len) * sign
    const ny = ((bx - ax) / len) * sign
    out = clipHalfPlane(out, p => (p[0] - ax) * nx + (p[1] - ay) * ny - d)
    if (out.length < 3) return null
  }
  return out
}

// Chemin SVG d'un polygone aux angles arrondis (courbes inscrites : la forme ne grossit jamais)
export function roundedPolygonPath(poly, radius) {
  const n = poly.length
  if (radius <= 0) return 'M' + poly.map(p => `${fmt(p[0])} ${fmt(p[1])}`).join('L') + 'Z'
  let d = ''
  for (let i = 0; i < n; i++) {
    const prev = poly[(i - 1 + n) % n]
    const cur = poly[i]
    const next = poly[(i + 1) % n]
    const l1 = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]) || 1
    const l2 = Math.hypot(next[0] - cur[0], next[1] - cur[1]) || 1
    const t1 = Math.min(radius / l1, 0.5)
    const t2 = Math.min(radius / l2, 0.5)
    const a = [cur[0] + (prev[0] - cur[0]) * t1, cur[1] + (prev[1] - cur[1]) * t1]
    const b = [cur[0] + (next[0] - cur[0]) * t2, cur[1] + (next[1] - cur[1]) * t2]
    d += `${i === 0 ? 'M' : 'L'}${fmt(a[0])} ${fmt(a[1])}Q${fmt(cur[0])} ${fmt(cur[1])} ${fmt(b[0])} ${fmt(b[1])}`
  }
  return d + 'Z'
}

export function polylinePath(points, closed = true) {
  return 'M' + points.map(p => `${fmt(p[0])} ${fmt(p[1])}`).join('L') + (closed ? 'Z' : '')
}

function pointInPolygon(x, y, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function segmentDistance(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}

function orient(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}

// Distance minimale entre deux segments [a, b] et [c, d] (0 s'ils se croisent).
// Un segment de longueur nulle représente un point.
export function segmentsDistance(a, b, c, d) {
  const o1 = orient(a, b, c)
  const o2 = orient(a, b, d)
  const o3 = orient(c, d, a)
  const o4 = orient(c, d, b)
  if (o1 * o2 < 0 && o3 * o4 < 0) return 0
  return Math.min(
    segmentDistance(a[0], a[1], c, d),
    segmentDistance(b[0], b[1], c, d),
    segmentDistance(c[0], c[1], a, b),
    segmentDistance(d[0], d[1], a, b),
  )
}

// Distance d'un point à un polygone (0 si le point est à l'intérieur)
export function pointPolygonDistance(px, py, poly) {
  if (pointInPolygon(px, py, poly)) return 0
  let best = Infinity
  for (let i = 0; i < poly.length; i++) {
    best = Math.min(best, segmentDistance(px, py, poly[i], poly[(i + 1) % poly.length]))
  }
  return best
}

// Vrai si le polygone reste à distance d'une zone protégée (fixation : cercle x, y, r)
export function clearOfKeepOut(poly, keepOut, margin = 0) {
  return keepOut.every(k => pointPolygonDistance(k.x, k.y, poly) > k.r + margin)
}

// Profil de crête par déplacement du point milieu : n = 2^k + 1 valeurs entre 0 et 1
export function ridgeProfile(rng, levels, roughness) {
  const n = 2 ** levels + 1
  const pts = new Float64Array(n)
  pts[0] = rng.next()
  pts[n - 1] = rng.next()
  let step = n - 1
  let amp = 1
  while (step > 1) {
    const half = step / 2
    for (let i = half; i < n; i += step) {
      pts[i] = (pts[i - half] + pts[i + half]) / 2 + (rng.next() - 0.5) * amp
    }
    amp *= roughness
    step = half
  }
  let min = Infinity
  let max = -Infinity
  for (const v of pts) { min = Math.min(min, v); max = Math.max(max, v) }
  const span = max - min || 1
  return Array.from(pts, v => (v - min) / span)
}

// Échantillonne un profil (tableau de valeurs régulièrement réparties sur [x0, x1]) en x
export function sampleProfile(values, x0, x1, x) {
  const t = Math.max(0, Math.min(1, (x - x0) / (x1 - x0))) * (values.length - 1)
  const i = Math.min(values.length - 2, Math.floor(t))
  const f = t - i
  return values[i] * (1 - f) + values[i + 1] * f
}

// Étoile pleine (zone découpée) : branches pointues, rayon intérieur relatif
export function starPath(cx, cy, r, branches, innerRatio, rotation = -Math.PI / 2) {
  const pts = []
  for (let i = 0; i < branches * 2; i++) {
    const a = rotation + (i * Math.PI) / branches
    const rr = i % 2 === 0 ? r : r * innerRatio
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }
  return polylinePath(pts)
}

export function circlePath(cx, cy, r) {
  return `M${fmt(cx - r)} ${fmt(cy)}a${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(2 * r)} 0a${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(-2 * r)} 0Z`
}

// Croissant de lune : disque (cx, cy, R) privé d'un disque décalé (ox, oy relatifs, rayon k·R)
export function crescentPath(cx, cy, R, ox, oy, k) {
  const r = R * k
  const bx = cx + ox
  const by = cy + oy
  const pts = []
  const steps = 72
  // Arc extérieur : points du grand cercle hors du petit disque
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const x = cx + Math.cos(a) * R
    const y = cy + Math.sin(a) * R
    if (Math.hypot(x - bx, y - by) >= r) pts.push({ a, x, y })
  }
  if (pts.length < 3) return circlePath(cx, cy, R)
  // Ordonne l'arc extérieur en partant juste après la zone masquée
  let startIdx = 0
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].a - pts[i - 1].a > (Math.PI * 2) / steps + 1e-6) { startIdx = i; break }
  }
  const outer = [...pts.slice(startIdx), ...pts.slice(0, startIdx)].map(p => [p.x, p.y])
  // Arc intérieur : points du petit cercle situés dans le grand disque, parcourus en sens inverse
  const first = outer[0]
  const last = outer[outer.length - 1]
  const a0 = Math.atan2(last[1] - by, last[0] - bx)
  let a1 = Math.atan2(first[1] - by, first[0] - bx)
  // On revient par le côté du petit cercle intérieur au grand disque
  const mid = (sweep) => [bx + Math.cos(a0 + sweep / 2) * r, by + Math.sin(a0 + sweep / 2) * r]
  let sweep = a1 - a0
  const candidate = (s) => Math.hypot(mid(s)[0] - cx, mid(s)[1] - cy) < R
  if (!candidate(sweep)) sweep = sweep > 0 ? sweep - Math.PI * 2 : sweep + Math.PI * 2
  const inner = []
  for (let i = 1; i < steps; i++) {
    const a = a0 + (sweep * i) / steps
    inner.push([bx + Math.cos(a) * r, by + Math.sin(a) * r])
  }
  return polylinePath([...outer, ...inner])
}
