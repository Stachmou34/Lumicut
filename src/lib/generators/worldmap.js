// Carte du monde réelle : continents de Natural Earth (domaine public), projection Natural Earth I.
// La terre est rendue par des points ou des lignes découpés : chaque point est un trou isolé,
// séparé des autres par au moins un pont de matière, donc aucun morceau ne tombe.

import { LAND_W, LAND_H, LAND_RLE } from './worldLand'
import { fmt } from './geometry'

let landMask = null
function land() {
  if (landMask) return landMask
  landMask = new Uint8Array(LAND_W * LAND_H)
  LAND_RLE.split(',').forEach((row, y) => {
    let x = 0
    let value = 0
    for (const run of row.split('.')) {
      const n = parseInt(run, 36)
      if (value) landMask.fill(1, y * LAND_W + x, y * LAND_W + x + n)
      x += n
      value = 1 - value
    }
  })
  return landMask
}

// Terre ou mer à une longitude / latitude (degrés)
function isLand(lon, lat) {
  const x = Math.floor(((((lon + 180) % 360) + 360) % 360) / 360 * LAND_W)
  const y = Math.floor((90 - lat) / 180 * LAND_H)
  if (y < 0 || y >= LAND_H) return false
  return land()[y * LAND_W + Math.min(LAND_W - 1, x)] === 1
}

// Projection Natural Earth I (Šavrič, Jenny, Patterson, Petrovič, Hurni, 2011) et son inverse
function project(lambda, phi) {
  const phi2 = phi * phi
  const phi4 = phi2 * phi2
  return [
    lambda * (0.8707 - 0.131979 * phi2 + phi4 * (-0.013791 + phi4 * (0.003971 * phi2 - 0.001529 * phi4))),
    phi * (1.007226 + phi2 * (0.015085 + phi4 * (-0.044475 + 0.028874 * phi2 - 0.005916 * phi4))),
  ]
}

function invert(x, y) {
  let phi = y
  for (let i = 0; i < 25; i++) {
    const phi2 = phi * phi
    const phi4 = phi2 * phi2
    const delta = (phi * (1.007226 + phi2 * (0.015085 + phi4 * (-0.044475 + 0.028874 * phi2 - 0.005916 * phi4))) - y)
      / (1.007226 + phi2 * (0.015085 * 3 + phi4 * (-0.044475 * 7 + 0.028874 * 9 * phi2 - 0.005916 * 11 * phi4)))
    phi -= delta
    if (Math.abs(delta) < 1e-9) break
  }
  const phi2 = phi * phi
  return [x / (0.8707 + phi2 * (-0.131979 + phi2 * (-0.013791 + phi2 * phi2 * phi2 * (0.003971 - 0.001529 * phi2)))), phi]
}

const RAD = Math.PI / 180
// Marge ajoutée aux ponts (cm) : le contrôle de découpe mesure au demi-millimètre près
const SAFETY = 0.1

// Rond découpé (centre et rayon en cm)
const dot = (cx, cy, r) => `M${fmt(cx - r)} ${fmt(cy)}a${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(2 * r)} 0a${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(-2 * r)} 0Z`

// Fente horizontale aux bouts arrondis
function slot(x0, x1, cy, h) {
  const r = h / 2
  const a = x0 + r
  const b = Math.max(a, x1 - r)
  return `M${fmt(a)} ${fmt(cy - r)}H${fmt(b)}a${fmt(r)} ${fmt(r)} 0 0 1 0 ${fmt(h)}H${fmt(a)}a${fmt(r)} ${fmt(r)} 0 0 1 0 ${fmt(-h)}Z`
}

export const worldMap = {
  id: 'worldmap',
  label: 'Carte du monde',
  category: 'cartes',
  layout: 'panel',
  description: 'Les vrais continents (données Natural Earth), en points ou en lignes lumineuses.',
  params: [
    {
      key: 'style', label: 'Style', type: 'choice', default: 'dots',
      options: [['dots', 'Points'], ['hex', 'Points en quinconce'], ['lines', 'Lignes']],
    },
    { key: 'pitch', label: 'Finesse', min: 6, max: 20, step: 0.5, unit: ' mm', default: 9 },
    { key: 'size', label: 'Taille des points', min: 0.3, max: 0.9, step: 0.05, default: 0.65 },
    {
      key: 'center', label: 'Centre', type: 'choice', default: 'europe',
      options: [['europe', 'Europe, Afrique'], ['pacific', 'Pacifique'], ['americas', 'Amériques']],
    },
    { key: 'antarctica', label: 'Antarctique', type: 'toggle', default: false },
    { key: 'bridge', label: 'Ponts de matière', min: 3, max: 8, step: 0.5, unit: ' mm', default: 3 },
  ],
  generate({ params, inner, keepOut }) {
    const [x0, y0, x1, y1] = inner
    const pitch = params.pitch / 10
    const bridge = params.bridge / 10
    const lon0 = { europe: 10, pacific: 150, americas: -90 }[params.center] ?? 10
    const latMin = params.antarctica ? -90 : -57
    const latMax = 84
    // Étendue projetée de la carte, ajustée dans le panneau en gardant ses proportions
    const xMax = project(Math.PI, 0)[0]
    const yTop = project(0, latMax * RAD)[1]
    const yBottom = project(0, latMin * RAD)[1]
    const k = Math.min((x1 - x0) / (2 * xMax), (y1 - y0) / (yTop - yBottom))
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2 + ((yTop + yBottom) / 2) * k
    const yPole = project(0, Math.PI / 2)[1]
    const landAt = (px, py) => {
      const yp = (cy - py) / k
      // Au-delà des pôles, l'inverse de la projection n'a pas de sens
      if (Math.abs(yp) >= yPole) return false
      const [lambda, phi] = invert((px - cx) / k, yp)
      const lat = phi / RAD
      if (Math.abs(lambda) > Math.PI || lat < latMin || lat > latMax) return false
      return isLand(lambda / RAD + lon0, lat)
    }
    const blocked = (px, py, r) => keepOut.some(z => Math.hypot(px - z.x, py - z.y) < z.r + r + bridge)

    const paths = []
    if (params.style === 'lines') {
      // Une fente par traversée de terre sur chaque ligne ; la matière entre deux lignes = un pont
      const h = Math.max(0.08, pitch - bridge - SAFETY)
      const step = 0.05
      for (let py = y0 + pitch / 2; py <= y1 - pitch / 2 + 1e-6; py += pitch) {
        const runs = []
        let start = null
        for (let px = x0; px <= x1 + step; px += step) {
          const on = px <= x1 && landAt(px, py)
          if (on && start === null) start = px
          if (!on && start !== null) { runs.push([start, px]); start = null }
        }
        // Deux traits trop proches sur une même ligne laisseraient un pont trop fin : on les relie
        const merged = []
        for (const r of runs) {
          const last = merged[merged.length - 1]
          if (last && r[0] - last[1] < bridge + SAFETY) last[1] = r[1]
          else merged.push([...r])
        }
        for (const [a, b] of merged) {
          // Les fixations coupent le trait ; chaque morceau doit rester assez long
          const pieces = [[a, b]]
          for (const z of keepOut) {
            const dy = Math.abs(py - z.y)
            const reach = z.r + bridge + h / 2
            if (dy >= reach) continue
            const half = Math.sqrt(reach * reach - dy * dy)
            for (let i = pieces.length - 1; i >= 0; i--) {
              const [p0, p1] = pieces[i]
              if (p1 <= z.x - half || p0 >= z.x + half) continue
              pieces.splice(i, 1, ...[[p0, z.x - half], [z.x + half, p1]].filter(([u, v]) => v > u))
            }
          }
          for (const [p0, p1] of pieces) if (p1 - p0 >= h * 0.9) paths.push(slot(p0, p1, py, h))
        }
      }
      return paths
    }
    // Points : grille carrée ou en quinconce ; diamètre limité pour garder un pont entre deux points
    const r = Math.min(pitch * params.size, pitch - bridge - SAFETY) / 2
    const rowStep = params.style === 'hex' ? pitch * Math.sqrt(3) / 2 : pitch
    let row = 0
    for (let py = y0 + rowStep / 2; py <= y1 - rowStep / 2 + 1e-6; py += rowStep, row++) {
      const shift = params.style === 'hex' && row % 2 ? pitch / 2 : 0
      for (let px = x0 + pitch / 2 + shift; px <= x1 - pitch / 2 + 1e-6; px += pitch) {
        if (landAt(px, py) && !blocked(px, py, r)) paths.push(dot(px, py, r))
      }
    }
    return paths
  },
}
