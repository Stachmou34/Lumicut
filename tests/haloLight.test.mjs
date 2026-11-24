// Lumière du ruban sur le mur : la formule exacte (source rectangulaire, bords du U) comparée à un
// calcul rayon par rayon, et ordres de grandeur du halo
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const bundle = await build({
  stdin: { contents: "export * from './src/lib/haloLight.js'", resolveDir: root },
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: false,
  logLevel: 'silent',
})
const lib = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)

// Panneau 60 × 30 cm en acrylique 4 mm, U de 2 cm, entretoises de 30 mm, ruban de 14,5 mm
const W = 0.6
const H = 0.3
const R = 0.004
const gap = 0.03
const faceBack = gap + 0.016
const stripW = 0.0145
const stripH = 0.006
const h = faceBack - stripH
const emitW = stripW * 0.6
const geo = { halfW: W / 2, halfH: H / 2, rim: R, gap }

// Bords du U (boîtes) : un rayon qui en traverse une est arrêté
const rims = [
  [[-W / 2, H / 2 - R, gap], [W / 2, H / 2, faceBack]],
  [[-W / 2, -H / 2, gap], [W / 2, -H / 2 + R, faceBack]],
  [[-W / 2, -H / 2, gap], [-W / 2 + R, H / 2, faceBack]],
  [[W / 2 - R, -H / 2, gap], [W / 2, H / 2, faceBack]],
]
function blocked(q, p) {
  const d = [p[0] - q[0], p[1] - q[1], p[2] - q[2]]
  return rims.some(([lo, hi]) => {
    let t0 = 0
    let t1 = 1
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-12) {
        if (q[i] < lo[i] || q[i] > hi[i]) return false
      } else {
        let a = (lo[i] - q[i]) / d[i]
        let b = (hi[i] - q[i]) / d[i]
        if (a > b) [a, b] = [b, a]
        t0 = Math.max(t0, a)
        t1 = Math.min(t1, b)
        if (t0 > t1) return false
      }
    }
    return true
  })
}

// Éclairement rayon par rayon (point milieu sur une grille fine de la source)
function traced(px, py, rect, height, n = 400, m = 400) {
  const dx = (rect.x1 - rect.x0) / n
  const dy = (rect.y1 - rect.y0) / m
  let e = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const q = [rect.x0 + (i + 0.5) * dx, rect.y0 + (j + 0.5) * dy, height]
      if (blocked(q, [px, py, 0])) continue
      const r2 = (q[0] - px) ** 2 + (q[1] - py) ** 2 + height * height
      e += (height * height) / (r2 * r2) * dx * dy
    }
  }
  return e
}

test('une source infinie éclaire à π fois sa luminance, et la formule suit une intégration directe', () => {
  assert.ok(Math.abs(lib.rectFactor(-1e4, 1e4, -1e4, 1e4, 1) - Math.PI) < 1e-3)
  // Rectangle quelconque, décalé du point éclairé
  const rect = { x0: -0.02, x1: 0.05, y0: 0.01, y1: 0.03 }
  const exact = lib.rectFactor(rect.x0, rect.x1, rect.y0, rect.y1, 0.04)
  const free = traced(0, 0, rect, 0.04)
  assert.ok(Math.abs(exact - free) / exact < 2e-3, `${exact} ≠ ${free}`)
})

test('éclairement du mur par le ruban du haut : formule exacte = calcul rayon par rayon (bords du U)', () => {
  // Ruban du haut, milieu à R + largeur / 2 du bord
  const cy = H / 2 - R - stripW / 2
  const emit = { x0: -0.25, x1: 0.25, y0: cy - emitW / 2, y1: cy + emitW / 2 }
  const points = [
    [0, cy], // sous le ruban (vu à travers une découpe)
    [0, 0], // centre du panneau
    [0.1, H / 2 - 0.02], // derrière le panneau, près du bord
    [0, H / 2 + 0.002], // au ras du bord, côté mur
    [0, H / 2 + 0.01],
    [0, H / 2 + 0.02],
    [0, H / 2 + 0.03],
    [0.27, H / 2 + 0.01], // près du coin, au-dessus
  ]
  for (const [px, py] of points) {
    const exact = lib.supportIrradiance(px, py, geo, [{ ...emit, h, L: 1 }])
    const ref = traced(px, py, emit, h, 150, 4000)
    const tol = Math.max(1e-6, ref * 0.005)
    assert.ok(Math.abs(exact - ref) <= tol, `(${px}, ${py}) : ${exact} ≠ ${ref}`)
  }
})

test('le halo direct s\'éteint à quelques centimètres du bord, plus loin avec des entretoises plus longues', () => {
  const reach = standoff => {
    const g = { ...geo, gap: standoff }
    const fb = standoff + 0.016
    const cy = H / 2 - R - stripW / 2
    const emit = { x0: -0.25, x1: 0.25, y0: cy - emitW / 2, y1: cy + emitW / 2, h: fb - stripH, L: 1 }
    const atEdge = lib.supportIrradiance(0, H / 2 + 0.001, g, [emit])
    // Distance au bord où l'éclairement tombe sous 1 % de celui du ras du bord
    for (let d = 0.001; d < 0.2; d += 0.0005) {
      if (lib.supportIrradiance(0, H / 2 + d, g, [emit]) < atEdge * 0.01) return d
    }
    return Infinity
  }
  const r20 = reach(0.02)
  const r30 = reach(0.03)
  const r40 = reach(0.04)
  assert.ok(r20 < r30 && r30 < r40, `${r20} ${r30} ${r40}`)
  assert.ok(r30 > 0.015 && r30 < 0.05, `halo de ${r30} m avec 30 mm d'entretoises`)
})

test('derrière le motif, le centre d\'un grand panneau noir reçoit bien moins de lumière que les bords', () => {
  const cy = H / 2 - R - stripW / 2
  const cx = W / 2 - R - stripW / 2
  const emitters = [
    { x0: -cx, x1: cx, y0: cy - emitW / 2, y1: cy + emitW / 2, h, L: 1 },
    { x0: -cx, x1: cx, y0: -cy - emitW / 2, y1: -cy + emitW / 2, h, L: 1 },
    { x0: cx - emitW / 2, x1: cx + emitW / 2, y0: -cy, y1: cy, h, L: 1 },
    { x0: -cx - emitW / 2, x1: -cx + emitW / 2, y0: -cy, y1: cy, h, L: 1 },
  ]
  const edge = lib.supportIrradiance(0, cy, geo, emitters)
  const center = lib.supportIrradiance(0, 0, geo, emitters)
  assert.ok(center / edge < 0.1, `centre ${center} / bord ${edge}`)
})

test('rebond : part renvoyée par le dos du panneau selon sa couleur', () => {
  const wall = lib.albedoOf('#e9e1d3')
  assert.ok(wall > 0.7 && wall < 0.85)
  const black = lib.bounceShare(wall, lib.albedoOf('#0c0c0e'))
  const birch = lib.bounceShare(wall, lib.albedoOf('#d6b68b'))
  assert.ok(black < 0.01, `noir : ${black}`)
  assert.ok(birch > 0.2 && birch < 0.45, `bouleau : ${birch}`)
})

test('largeur du halo direct affichée au client : environ 2, 3 et 4 cm avec 20, 30 et 40 mm de déport', () => {
  const reach = gapMm => lib.directHaloReach({ gap: gapMm / 1000, rim: R, rimDepth: 0.016, stripW, stripH, emitW })
  const cm = [20, 30, 40].map(mm => Math.round(reach(mm) * 100))
  assert.deepEqual(cm, [2, 3, 4])
})
