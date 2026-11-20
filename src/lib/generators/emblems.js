import { fmt, circlePath, polylinePath, segmentsDistance } from './geometry'

// Emblèmes centrés, dessinés dans le carré de 200 unités (même repère que les motifs du catalogue).
// unitMm = taille réelle d'une unité, pour garantir des ponts de matière en millimètres.

const C = 100
const R_MAX = 95

// Point du repère local d'une forme orientée selon le rayon : u le long du rayon (depuis r), v en travers
function radial(theta, r) {
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  return (u, v) => [C + c * (r + u) - s * v, C + s * (r + u) + c * v]
}

function pt([x, y]) {
  return `${fmt(x)} ${fmt(y)}`
}

// Forme radiale de longueur L (rayon) et largeur maximale W
function radialShape(kind, theta, r, L, W) {
  const p = radial(theta, r)
  if (kind === 'dot') {
    const [x, y] = p(L / 2, 0)
    return circlePath(x, y, Math.min(L, W) / 2)
  }
  if (kind === 'diamond') return polylinePath([p(0, 0), p(L / 2, W / 2), p(L, 0), p(L / 2, -W / 2)])
  if (kind === 'drop') {
    // Goutte : pointe vers le centre, arrondie vers l'extérieur (demi-largeur max ≈ 0,44 W)
    return `M${pt(p(0, 0))}C${pt(p(L * 0.35, W * 0.55))} ${pt(p(L * 1.02, W * 0.62))} ${pt(p(L, 0))}` +
      `C${pt(p(L * 1.02, -W * 0.62))} ${pt(p(L * 0.35, -W * 0.55))} ${pt(p(0, 0))}Z`
  }
  // Pétale (amande) : demi-largeur max = W / 2
  return `M${pt(p(0, 0))}Q${pt(p(L / 2, W))} ${pt(p(L, 0))}Q${pt(p(L / 2, -W))} ${pt(p(0, 0))}Z`
}

// Position de la largeur maximale le long de la forme (pour le calcul de l'écart entre formes)
const WIDEST = { petal: 0.5, drop: 0.65, dot: 0.5, diamond: 0.5 }
const RATIO = { petal: 0.55, drop: 0.62, dot: 0.9, diamond: 0.6 }

export const mandala = {
  id: 'mandala',
  label: 'Mandala',
  category: 'mandala',
  layout: 'emblem',
  description: 'Rosaces de pétales et de points : chaque variante est unique.',
  params: [
    { key: 'rings', label: 'Couronnes', min: 2, max: 7, step: 1, default: 5 },
    { key: 'petals', label: 'Pétales', min: 6, max: 24, step: 2, default: 12 },
    {
      key: 'style', label: 'Style', type: 'choice', default: 'mix',
      options: [['mix', 'Mixte'], ['petal', 'Pétales'], ['drop', 'Gouttes'], ['dot', 'Points']],
    },
    { key: 'bridge', label: 'Ponts de matière', min: 3, max: 12, step: 0.5, unit: ' mm', default: 4 },
  ],
  generate({ rng, params, unitMm }) {
    const b = params.bridge / unitMm
    const minHole = 1.5 / unitMm
    const paths = []

    // Cœur : fleur pleine (pétales qui se chevauchent au centre = un seul trou) ou disque
    const rc = 10
    if (rng.chance(0.6)) {
      const n0 = rng.pick([6, 8, 10])
      for (let k = 0; k < n0; k++) paths.push(radialShape('petal', (k * 2 * Math.PI) / n0, 0, rc, rc * 0.7))
    } else {
      paths.push(circlePath(C, C, rc * 0.8))
    }

    let r = rc + b
    const rings = Math.round(params.rings)
    for (let i = 0; i < rings && r < R_MAX - 3; i++) {
      const remaining = R_MAX - r - b * (rings - i - 1)
      const L = Math.min(R_MAX - r, (remaining / (rings - i)) * rng.range(0.85, 1.15))
      if (L < 3) break
      const kind = params.style === 'mix' ? rng.pick(['petal', 'drop', 'dot', 'diamond', 'petal']) : params.style
      const rw = r + L * WIDEST[kind]
      let W = L * RATIO[kind]
      // Autant de formes que possible en gardant un pont b entre deux voisines
      const nFit = Math.floor((2 * Math.PI * rw) / (W + b))
      let n = Math.min(params.petals * (1 + Math.floor(i / 2)), nFit)
      if (n < 6) {
        n = 6
        W = (2 * Math.PI * rw) / n - b
      }
      n -= n % 2
      if (W < minHole) { r += L + b; continue }
      const offset = ((i % 2) * Math.PI) / n
      for (let k = 0; k < n; k++) paths.push(radialShape(kind, offset + (k * 2 * Math.PI) / n, r, L, W))
      r += L + b
    }
    return paths
  },
}

export const sun = {
  id: 'sun',
  label: 'Soleil',
  category: 'ciel',
  layout: 'emblem',
  description: 'Disque et rayons pointus ou en flammes.',
  params: [
    { key: 'rays', label: 'Rayons', min: 8, max: 48, step: 2, default: 24 },
    { key: 'core', label: 'Taille du cœur', min: 0.15, max: 0.45, step: 0.01, default: 0.28 },
    {
      key: 'style', label: 'Style', type: 'choice', default: 'alternate',
      options: [['alternate', 'Alternés'], ['straight', 'Pointus'], ['flame', 'Flammes']],
    },
    { key: 'bridge', label: 'Ponts de matière', min: 3, max: 12, step: 0.5, unit: ' mm', default: 4 },
  ],
  generate({ rng, params, unitMm }) {
    const b = params.bridge / unitMm
    const rc = R_MAX * params.core
    const paths = [circlePath(C, C, rc)]
    const r1 = rc + b
    let n = Math.round(params.rays)
    let wb = (2 * Math.PI * r1) / n - b
    while (wb < 2 / unitMm && n > 6) {
      n -= 2
      wb = (2 * Math.PI * r1) / n - b
    }
    if (wb <= 0) return paths
    const bendSign = rng.chance(0.5) ? 1 : -1

    for (let k = 0; k < n; k++) {
      const theta = (k * 2 * Math.PI) / n
      const long = params.style !== 'alternate' || k % 2 === 0
      const L = (long ? R_MAX : r1 + (R_MAX - r1) * 0.62) - r1
      const p = radial(theta, r1)
      if (params.style === 'flame') {
        // Rayon ondulé : la courbure reste dans le secteur angulaire, l'écart b est conservé
        const A = Math.min(L / n + wb / (2 * Math.PI), wb) * 0.8 * bendSign
        const left = []
        const right = []
        const steps = 24
        for (let i = 0; i <= steps; i++) {
          const u = (i / steps) * L
          const hw = (wb / 2) * (1 - u / L)
          const vc = A * Math.sin((Math.PI * u) / L)
          left.push(p(u, vc + hw))
          right.push(p(u, vc - hw))
        }
        paths.push(polylinePath([...left, ...right.reverse()]))
      } else {
        paths.push(polylinePath([p(0, wb / 2), p(L, 0), p(0, -wb / 2)]))
      }
    }
    return paths
  },
}


// Arbre de vie : tronc, branches en arbre (aucune boucle), feuilles et racines dans un cercle à ponts.
// Deux segments droits partant du même point ne peuvent pas enfermer de matière ; toutes les autres
// paires (branches non voisines, feuilles) gardent un pont de matière : la découpe forme un seul
// « arbre » sans boucle, donc rien ne peut tomber.
export const treeOfLife = {
  id: 'treeOfLife',
  label: 'Arbre de vie',
  category: 'nature',
  layout: 'emblem',
  description: 'Arbre ramifié dans un cercle, avec feuilles et racines.',
  params: [
    { key: 'depth', label: 'Ramifications', min: 3, max: 6, step: 1, default: 5 },
    { key: 'spread', label: 'Ouverture des branches', min: 0.3, max: 0.8, step: 0.05, default: 0.5 },
    { key: 'leaves', label: 'Feuilles', type: 'toggle', default: true },
    { key: 'roots', label: 'Racines', type: 'toggle', default: true },
    { key: 'ring', label: 'Cercle', type: 'toggle', default: true },
    { key: 'bridge', label: 'Ponts de matière', min: 3, max: 12, step: 0.5, unit: ' mm', default: 4 },
  ],
  generate({ rng, params, unitMm }) {
    const b = params.bridge / unitMm
    const paths = []
    const R = 93
    const ringW = Math.max(2.5, 2.8 / unitMm)
    const limit = params.ring ? R - ringW - b : R
    const segs = [] // { a, z, w } : branches et feuilles posées

    const same = (p, q) => Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6
    const sharesPoint = (s, a, z) => same(s.a, a) || same(s.z, a) || same(s.a, z) || same(s.z, z)
    const inside = (p, margin) => Math.hypot(p[0] - C, p[1] - C) < limit - margin
    const clearOf = (a, z, w, ignore) => segs.every(s =>
      s === ignore || (s.kind === 'branch' && sharesPoint(s, a, z)) ||
      segmentsDistance(a, z, s.a, s.z) > b + (w + s.w) / 2)

    const addBranch = (a, z, w0, w1) => {
      const len = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1
      const nx = -(z[1] - a[1]) / len / 2
      const ny = (z[0] - a[0]) / len / 2
      paths.push(polylinePath([
        [a[0] + nx * w0, a[1] + ny * w0], [z[0] + nx * w1, z[1] + ny * w1],
        [z[0] - nx * w1, z[1] - ny * w1], [a[0] - nx * w0, a[1] - ny * w0],
      ]))
      paths.push(circlePath(z[0], z[1], w1 / 2)) // articulation arrondie
      const seg = { kind: 'branch', a, z, w: Math.max(w0, w1) }
      segs.push(seg)
      return seg
    }

    // Feuille ronde au bout d'une branche : elle ne touche que sa propre branche
    const addLeaf = (p, r, owner) => {
      if (!params.leaves || !inside(p, r)) return
      if (!clearOf(p, p, 2 * r, owner)) return
      paths.push(circlePath(p[0], p[1], r))
      segs.push({ kind: 'leaf', a: p, z: p, w: 2 * r })
    }

    const grow = (a, angle, len, w, depth) => {
      const z = [a[0] + Math.cos(angle) * len, a[1] + Math.sin(angle) * len]
      const w1 = Math.max(1.4, w * 0.72)
      if (!inside(z, w1) || !clearOf(a, z, w)) return
      const seg = addBranch(a, z, w, w1)
      if (depth <= 0 || len < 6) {
        const tip = [z[0] + Math.cos(angle) * 2.8, z[1] + Math.sin(angle) * 2.8]
        addLeaf(tip, rng.range(2.6, 3.6), seg)
        return
      }
      const n = rng.chance(0.25) ? 3 : 2
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1) - 0.5
        const childAngle = angle + t * 2 * params.spread * rng.range(0.85, 1.15) + rng.range(-0.08, 0.08)
        grow(z, childAngle, len * rng.range(0.68, 0.8), w1, depth - 1)
      }
    }

    // Tronc puis couronne : trois départs, à gauche, au centre et à droite
    const base = [C, C + 46]
    const fork = [C, C + 6]
    addBranch(base, fork, 7.5, 5.5)
    grow(fork, -Math.PI / 2 - params.spread * 0.9, 24, 5.5, params.depth - 1)
    grow(fork, -Math.PI / 2 + params.spread * 0.9, 24, 5.5, params.depth - 1)
    grow(fork, -Math.PI / 2 + rng.range(-0.1, 0.1), 22, 5, params.depth - 1)

    // Racines : petites branches vers le bas, sans feuilles
    if (params.roots) {
      const withLeaves = params.leaves
      params = { ...params, leaves: false }
      for (const ang of [Math.PI / 2 - 0.95, Math.PI / 2 - 0.35, Math.PI / 2 + 0.35, Math.PI / 2 + 0.95]) {
        grow(base, ang + rng.range(-0.08, 0.08), 16, 3.6, 2)
      }
      params = { ...params, leaves: withLeaves }
    }

    // Cercle découpé en quatre arcs : les ponts relient l'intérieur au reste du panneau
    if (params.ring) {
      const gapHalf = (b * 0.5 + 0.5) / R
      for (let k = 0; k < 4; k++) {
        const a0 = (k * Math.PI) / 2 + Math.PI / 4 + gapHalf
        const a1 = ((k + 1) * Math.PI) / 2 + Math.PI / 4 - gapHalf
        const outer = []
        const innerPts = []
        for (let i = 0; i <= 40; i++) {
          const a = a0 + ((a1 - a0) * i) / 40
          outer.push([C + Math.cos(a) * R, C + Math.sin(a) * R])
          innerPts.push([C + Math.cos(a) * (R - ringW), C + Math.sin(a) * (R - ringW)])
        }
        paths.push(polylinePath([...outer, ...innerPts.reverse()]))
      }
    }
    return paths
  },
}
