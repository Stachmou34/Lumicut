import {
  ridgeProfile, sampleProfile, polylinePath, starPath, crescentPath, segmentsDistance,
} from './geometry'

// Paysages en silhouette lumineuse.
// Les reliefs sont des « bandes » découpées entre deux profils, fonctions de x (aucun surplomb) :
// la matière au-dessus reste reliée au ciel, donc rien ne peut tomber.

const STEP = 0.2 // pas d'échantillonnage horizontal (cm)

// Bande découpée entre top(x) et bottom(x), coupée là où elle devient trop mince,
// autour des fixations et au niveau des renforts. Renvoie des chemins SVG.
export function bandPaths({ top, bottom, inner, keepOut, b, minBand, pillars = [], extraXs = [] }) {
  const xs = []
  for (let x = inner[0]; x < inner[2]; x += STEP) xs.push(x)
  xs.push(inner[2])
  for (const p of pillars) xs.push(p - b / 2, p + b / 2)
  for (const x of extraXs) if (x > inner[0] && x < inner[2]) xs.push(x)
  xs.sort((a, c) => a - c)

  const runs = []
  let run = null
  let lastX = -Infinity
  for (const x of xs) {
    if (x - lastX < 1e-4) continue
    lastX = x
    let t = Math.max(top(x), inner[1])
    let bt = Math.min(bottom(x), inner[3])
    // Les fixations restent dans la matière : la bande s'écarte du capuchon
    for (const k of keepOut) {
      const R = k.r + b
      const dx = x - k.x
      if (Math.abs(dx) >= R) continue
      const s = Math.sqrt(R * R - dx * dx)
      if (k.y > (t + bt) / 2) bt = Math.min(bt, k.y - s)
      else t = Math.max(t, k.y + s)
    }
    const inPillar = pillars.some(p => x > p - b / 2 + 1e-6 && x < p + b / 2 - 1e-6)
    if (!inPillar && bt - t >= minBand) {
      if (!run) { run = []; runs.push(run) }
      run.push([x, t, bt])
    } else {
      run = null
    }
  }
  return runs
    .filter(r => r.length >= 2 && r[r.length - 1][0] - r[0][0] >= minBand)
    .map(r => polylinePath([...r.map(([x, t]) => [x, t]), ...r.slice().reverse().map(([x, , bt]) => [x, bt])]))
}

// Positions des renforts verticaux, espacés de 20 à 28 cm
function pillarPositions(rng, inner) {
  const W = inner[2] - inner[0]
  if (W < 30) return []
  const out = []
  let x = inner[0] + rng.range(10, 18)
  while (x < inner[2] - 10) {
    out.push(x)
    x += rng.range(20, 28)
  }
  return out
}

// Chaîne de montagnes : enveloppe haute de sommets aux flancs droits, plus un détail rocheux.
// Renvoie y(x) (y vers le bas), jamais plus bas que baseY.
function mountainRange(rng, inner, { baseY, minH, maxH, peakSpacing, steepness, jag }) {
  const W = inner[2] - inner[0]
  const count = Math.max(2, Math.round(W / peakSpacing))
  const peaks = []
  for (let i = 0; i < count; i++) {
    const x = inner[0] + ((i + rng.range(0.15, 0.85)) / count) * W
    peaks.push({
      x,
      h: rng.range(minH, maxH),
      left: rng.range(0.55, 1.1) * steepness,
      right: rng.range(0.55, 1.1) * steepness,
    })
  }
  const rocks = ridgeProfile(rng, 8, 0.6)
  return x => {
    let y = baseY
    for (const p of peaks) {
      const dx = x - p.x
      y = Math.min(y, baseY - p.h + Math.abs(dx) * (dx < 0 ? p.left : p.right))
    }
    return y + (sampleProfile(rocks, inner[0], inner[2], x) - 0.5) * jag
  }
}

// Lune et étoiles dans le ciel, au-dessus de skyline(x) (y vers le bas).
// Chaque élément est un trou isolé, à distance de pont des autres : aucun îlot.
export function decorateSky({ rng, inner, skyline, keepOut, b, moon, stars, starScale = 1, avoid = [] }) {
  const paths = []
  const placed = [...avoid]
  const W = inner[2] - inner[0]
  const H = inner[3] - inner[1]
  const fits = (x, y, r) => {
    if (x - r - b < inner[0] || x + r + b > inner[2] || y - r - b < inner[1]) return false
    for (const dx of [-r, 0, r]) if (y + r + 1.5 * b > skyline(x + dx)) return false
    if (placed.some(p => Math.hypot(p.x - x, p.y - y) < p.r + r + 1.5 * b)) return false
    if (keepOut.some(k => Math.hypot(k.x - x, k.y - y) < k.r + r + b)) return false
    return true
  }

  if (moon) {
    const R = Math.max(1, Math.min(6, H * 0.11))
    for (let tries = 0; tries < 80; tries++) {
      const side = rng.chance(0.5) ? 1 : -1
      const cx = inner[0] + W / 2 + side * rng.range(0.12, 0.4) * W
      const cy = inner[1] + R + b * 2 + rng.range(0, 0.22) * H
      if (!fits(cx, cy, R)) continue
      paths.push(crescentPath(cx, cy, R, -side * R * 0.45, -R * 0.22, 0.84))
      placed.push({ x: cx, y: cy, r: R })
      break
    }
  }

  const base = Math.max(0.35, Math.min(1.2, H * 0.028)) * starScale
  const starList = []
  for (let attempt = 0; starList.length < stars && attempt < stars * 60; attempt++) {
    const r = base * (0.45 + rng.next() ** 2 * 1.1)
    const x = rng.range(inner[0] + r + b, inner[2] - r - b)
    const y = rng.range(inner[1] + r + b, inner[3] - r - b)
    if (!fits(x, y, r)) continue
    const sparkle = rng.chance(0.6)
    paths.push(starPath(x, y, r, sparkle ? 4 : 5, sparkle ? 0.3 : 0.45, -Math.PI / 2 + rng.range(-0.3, 0.3)))
    placed.push({ x, y, r })
    starList.push({ x, y, r })
  }
  return { paths, placed, stars: starList }
}

export const mountains = {
  id: 'mountains',
  label: 'Montagnes',
  category: 'nature',
  layout: 'panel',
  description: 'Chaînes de montagnes en plusieurs plans, avec lune et étoiles.',
  params: [
    { key: 'layers', label: 'Plans', min: 1, max: 4, step: 1, default: 3 },
    { key: 'height', label: 'Hauteur des sommets', min: 0.35, max: 0.85, step: 0.05, default: 0.65 },
    { key: 'relief', label: 'Relief', min: 0, max: 1, step: 0.05, default: 0.6 },
    { key: 'stars', label: 'Étoiles', min: 0, max: 40, step: 1, default: 12 },
    { key: 'moon', label: 'Lune', type: 'toggle', default: true },
    { key: 'pillars', label: 'Renforts verticaux', type: 'toggle', default: true },
    { key: 'bridge', label: 'Ponts de matière', min: 3, max: 12, step: 0.5, unit: ' mm', default: 5 },
  ],
  generate({ rng, params, inner, keepOut }) {
    const b = params.bridge / 10
    const H = inner[3] - inner[1]
    const W = inner[2] - inner[0]
    const L = Math.round(params.layers)
    const minBand = Math.max(0.6, b * 1.2)
    const span = H * params.height

    // Chaînes du fond vers l'avant : celles du fond ont des sommets plus hauts et plus espacés
    const raw = []
    for (let k = 0; k < L; k++) {
      const depth = L === 1 ? 1 : k / (L - 1) // 0 = fond, 1 = premier plan
      const baseY = inner[3] - span * (0.42 - 0.3 * depth)
      raw.push(mountainRange(rng, inner, {
        baseY,
        minH: span * (0.25 + 0.25 * (1 - depth)) * (0.5 + params.relief * 0.5),
        maxH: span * (0.5 + 0.35 * (1 - depth)) * (0.5 + params.relief * 0.5),
        peakSpacing: Math.max(6, W / (3 + 3 * depth)),
        steepness: 0.45 + params.relief * 0.7,
        jag: 0.25 + params.relief * 0.6,
      }))
    }
    const profiles = []
    for (let k = 0; k < L; k++) {
      const prev = profiles[k - 1]
      profiles.push(prev ? x => Math.max(raw[k](x), prev(x) + b * 1.8 + minBand) : raw[k])
    }
    // Décalage vertical tenant compte de la pente : le pont garde la même épaisseur en biais
    const offsetBelow = f => x => {
      const slope = (f(x + 0.05) - f(x - 0.05)) / 0.1
      return f(x) - b * Math.sqrt(1 + slope * slope)
    }

    const paths = []
    for (let k = 0; k < L; k++) {
      paths.push(...bandPaths({
        top: profiles[k],
        bottom: k < L - 1 ? offsetBelow(profiles[k + 1]) : () => inner[3],
        inner, keepOut, b, minBand,
        pillars: params.pillars ? pillarPositions(rng, inner) : [],
      }))
    }

    const sky = decorateSky({
      rng, inner, keepOut, b,
      skyline: offsetBelow(profiles[0]),
      moon: params.moon,
      stars: Math.round(params.stars),
    })
    return [...paths, ...sky.paths]
  },
}

// Sapin à étages (polygone) : chaque étage pointe vers l'extérieur puis revient vers le tronc
function pinePolygon(t, groundOverlap) {
  const { x, base, h, w, tiers } = t
  const apex = base - h
  const trunkH = h * 0.08
  const crownBottom = base - trunkH
  const step = (crownBottom - apex) / tiers
  const left = [[x, apex]]
  for (let j = 0; j < tiers; j++) {
    const yb = apex + step * (j + 1)
    const hw = (w / 2) * (0.38 + (0.62 * (j + 1)) / tiers)
    left.push([x - hw, yb])
    if (j < tiers - 1) left.push([x - hw * 0.55, yb - step * 0.2])
  }
  const tw = Math.max(0.25, w * 0.09)
  left.push([x - tw / 2, crownBottom], [x - tw / 2, base + groundOverlap])
  const right = left.slice(1).reverse().map(([px, py]) => [2 * x - px, py])
  return [...left, ...right]
}

export const forest = {
  id: 'forest',
  label: 'Forêt',
  category: 'nature',
  layout: 'panel',
  description: 'Sapins en silhouette lumineuse, sous la lune et les étoiles.',
  params: [
    { key: 'density', label: 'Densité', min: 0.3, max: 1.6, step: 0.05, default: 1 },
    { key: 'height', label: 'Hauteur des arbres', min: 0.35, max: 0.8, step: 0.05, default: 0.65 },
    { key: 'tiers', label: 'Étages des sapins', min: 2, max: 6, step: 1, default: 4 },
    { key: 'stars', label: 'Étoiles', min: 0, max: 40, step: 1, default: 14 },
    { key: 'moon', label: 'Lune', type: 'toggle', default: true },
    { key: 'bridge', label: 'Ponts de matière', min: 3, max: 12, step: 0.5, unit: ' mm', default: 5 },
  ],
  generate({ rng, params, inner, keepOut }) {
    const b = params.bridge / 10
    const H = inner[3] - inner[1]
    const W = inner[2] - inner[0]
    const minBand = Math.max(0.6, b * 1.2)

    // Sol légèrement vallonné
    const groundVals = ridgeProfile(rng, 6, 0.45)
    const groundH = H * 0.1
    const ground = x => inner[3] - groundH * (0.6 + 0.4 * sampleProfile(groundVals, inner[0], inner[2], x))

    // Sapins placés sans se toucher (un pont de matière entre deux arbres, rien ne peut s'enfermer) ;
    // les grands d'abord, puis des plus petits dans les trouées
    const target = Math.max(2, Math.round((W / (H * params.height * 0.55)) * params.density * 1.6))
    const maxTries = target * 40
    const trees = []
    for (let tries = 0; trees.length < target && tries < maxTries; tries++) {
      const shrink = 1 - 0.55 * (tries / maxTries)
      let h = H * params.height * rng.range(0.55, 1) * shrink
      const ratio = rng.range(0.5, 0.62)
      const x = rng.range(inner[0] + (h * ratio) / 2 + b, inner[2] - (h * ratio) / 2 - b)
      const base = ground(x)
      h = Math.min(h, base - inner[1] - H * 0.18)
      if (h < H * 0.14) continue
      const w = h * ratio
      if (trees.some(t => Math.abs(t.x - x) < (t.w + w) / 2 + b)) continue
      if (keepOut.some(k => Math.abs(k.x - x) < w / 2 + k.r + b && k.y > base - h - k.r - b)) continue
      const tiers = Math.max(2, Math.round(params.tiers + rng.range(-0.6, 0.6)))
      trees.push({ x, base, h, w, tiers })
    }

    const paths = bandPaths({ top: ground, bottom: () => inner[3], inner, keepOut, b, minBand })
    for (const t of trees) paths.push(polylinePath(pinePolygon(t, Math.min(groundH * 0.5, 0.6))))

    // Ligne d'horizon pour placer lune et étoiles : enveloppe triangulaire des sapins
    const skyline = x => {
      let y = ground(x)
      for (const t of trees) {
        const dx = Math.abs(x - t.x)
        if (dx <= t.w / 2) y = Math.min(y, t.base - t.h + (dx / (t.w / 2)) * t.h * 0.95)
      }
      return y - b
    }
    const sky = decorateSky({ rng, inner, keepOut, b, skyline, moon: params.moon, stars: Math.round(params.stars) })
    return [...paths, ...sky.paths]
  },
}

// Ciel étoilé : étoiles de tailles variées, lune, étoile filante et constellations.
// Les constellations relient leurs étoiles par un arbre (sans boucle) : la matière ne peut pas être encerclée.
export const starrySky = {
  id: 'sky',
  label: 'Ciel étoilé',
  category: 'ciel',
  layout: 'panel',
  description: 'Étoiles, constellations, lune et étoile filante.',
  params: [
    { key: 'stars', label: 'Étoiles', min: 10, max: 150, step: 1, default: 55 },
    { key: 'size', label: 'Taille des étoiles', min: 0.5, max: 2, step: 0.05, default: 1 },
    { key: 'constellations', label: 'Constellations', min: 0, max: 4, step: 1, default: 2 },
    { key: 'moon', label: 'Lune', type: 'toggle', default: true },
    { key: 'shooting', label: 'Étoile filante', type: 'toggle', default: true },
    { key: 'bridge', label: 'Ponts de matière', min: 3, max: 12, step: 0.5, unit: ' mm', default: 4 },
  ],
  generate({ rng, params, inner, keepOut }) {
    const b = params.bridge / 10
    const W = inner[2] - inner[0]
    const H = inner[3] - inner[1]
    const paths = []
    const avoid = []
    const segments = []

    // Étoile filante : tête en bas à droite, traînée effilée qui remonte vers la gauche
    if (params.shooting) {
      const headR = Math.max(0.45, Math.min(1.3, H * 0.03)) * params.size
      for (let tries = 0; tries < 40; tries++) {
        const hx = inner[0] + W * rng.range(0.55, 0.85)
        const hy = inner[1] + H * rng.range(0.3, 0.6)
        const len = W * rng.range(0.12, 0.2)
        const ang = Math.PI - rng.range(0.25, 0.5)
        const tx = hx + Math.cos(ang) * len
        const ty = hy - Math.sin(ang) * len
        if (tx - b < inner[0] || ty - b < inner[1] || hy + headR * 1.6 + b > inner[3]) continue
        if (keepOut.some(k => segmentsDistance([hx, hy], [tx, ty], [k.x, k.y], [k.x, k.y]) < k.r + headR + b)) continue
        const nx = -(ty - hy) / len
        const ny = (tx - hx) / len
        const w0 = headR * 0.75
        paths.push(polylinePath([[hx + nx * w0, hy + ny * w0], [tx, ty], [hx - nx * w0, hy - ny * w0]]))
        paths.push(starPath(hx, hy, headR * 1.6, 4, 0.3))
        avoid.push({ x: hx, y: hy, r: headR * 1.6 }, { x: (hx + tx) / 2, y: (hy + ty) / 2, r: len / 2 + w0 })
        break
      }
    }

    const sky = decorateSky({
      rng, inner, keepOut, b, avoid,
      skyline: () => inner[3],
      moon: params.moon,
      stars: Math.round(params.stars),
      starScale: params.size,
    })
    paths.push(...sky.paths)
    const stars = sky.stars

    // Constellations : quelques étoiles proches reliées par un arbre couvrant minimal
    const lineW = Math.max(0.12, b * 0.4)
    const used = new Set()
    for (let c = 0; c < params.constellations && stars.length > 4; c++) {
      const seedIdx = rng.int(0, stars.length - 1)
      if (used.has(seedIdx)) continue
      const s0 = stars[seedIdx]
      const group = stars
        .map((s, i) => ({ s, i, d: Math.hypot(s.x - s0.x, s.y - s0.y) }))
        .filter(o => !used.has(o.i) && o.d < Math.min(W, H) * 0.45)
        .sort((a, z) => a.d - z.d)
        .slice(0, rng.int(4, 6))
      if (group.length < 3) continue
      // Prim : relie chaque étoile à la plus proche déjà reliée
      const inTree = [group[0]]
      const rest = group.slice(1)
      while (rest.length) {
        let best = null
        for (const o of rest) for (const t of inTree) {
          const d = Math.hypot(o.s.x - t.s.x, o.s.y - t.s.y)
          if (!best || d < best.d) best = { o, t, d }
        }
        rest.splice(rest.indexOf(best.o), 1)
        inTree.push(best.o)
        const a = [best.t.s.x, best.t.s.y]
        const z = [best.o.s.x, best.o.s.y]
        // Le trait ne doit frôler ni une autre étoile, ni un autre trait, ni une fixation
        const isEnd = p => (p.x === a[0] && p.y === a[1]) || (p.x === z[0] && p.y === z[1])
        const clear =
          sky.placed.every(p => isEnd(p) || segmentsDistance(a, z, [p.x, p.y], [p.x, p.y]) > p.r + b + lineW / 2) &&
          segments.every(([p, q]) => {
            const shared = [p, q].some(e => (e[0] === a[0] && e[1] === a[1]) || (e[0] === z[0] && e[1] === z[1]))
            return shared || segmentsDistance(a, z, p, q) > b + lineW
          }) &&
          keepOut.every(k => segmentsDistance(a, z, [k.x, k.y], [k.x, k.y]) > k.r + b)
        if (!clear) continue
        segments.push([a, z])
        const len = best.d || 1
        const nx = (-(z[1] - a[1]) / len) * (lineW / 2)
        const ny = ((z[0] - a[0]) / len) * (lineW / 2)
        paths.push(polylinePath([[a[0] + nx, a[1] + ny], [z[0] + nx, z[1] + ny], [z[0] - nx, z[1] - ny], [a[0] - nx, a[1] - ny]]))
      }
      group.forEach(o => used.add(o.i))
    }
    return paths
  },
}
