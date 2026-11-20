import { Delaunay } from 'd3-delaunay'
import {
  clipPolygonToRect, clipHalfPlane, insetConvexPolygon, roundedPolygonPath, polygonArea, pointPolygonDistance,
} from './geometry'

function centroid(poly) {
  let x = 0
  let y = 0
  for (const p of poly) { x += p[0]; y += p[1] }
  return [x / poly.length, y / poly.length]
}

// Transforme des cellules (polygones convexes qui pavent le panneau) en découpes :
// chaque cellule devient un trou, séparé de ses voisines par un pont de matière de largeur constante.
// La matière forme un réseau continu relié au cadre : aucun îlot possible.
export function cellsToPaths(cells, { inner, bridgeCm, roundness, keepOut, minAreaCm2 = 0.2 }) {
  const paths = []
  for (const cell of cells) {
    let poly = clipPolygonToRect(cell, inner)
    if (poly.length < 3) continue
    // Fixations : la cellule est rognée par une droite tangente à la zone protégée (elle reste convexe)
    for (const k of keepOut) {
      const R = k.r + bridgeCm / 2
      if (pointPolygonDistance(k.x, k.y, poly) > R) continue
      const [cx, cy] = centroid(poly)
      const d = Math.hypot(cx - k.x, cy - k.y) || 1
      const ux = (cx - k.x) / d
      const uy = (cy - k.y) / d
      poly = clipHalfPlane(poly, p => (p[0] - k.x) * ux + (p[1] - k.y) * uy - R)
      if (poly.length < 3) break
    }
    if (poly.length < 3) continue
    const inset = insetConvexPolygon(poly, bridgeCm / 2)
    if (!inset) continue
    const area = Math.abs(polygonArea(inset))
    if (area < minAreaCm2) continue
    paths.push(roundedPolygonPath(inset, roundness * Math.sqrt(area) * 0.5))
  }
  return paths
}

// Cellules organiques : diagramme de Voronoï de points répartis sur une grille perturbée
export const organic = {
  id: 'organic',
  label: 'Organique',
  category: 'geometrique',
  layout: 'panel',
  description: 'Cellules irrégulières, entre nid d’abeille naturel et galets.',
  params: [
    { key: 'cell', label: 'Taille des cellules', min: 2, max: 10, step: 0.5, unit: ' cm', default: 4.5 },
    { key: 'irregular', label: 'Désordre', min: 0, max: 1, step: 0.05, default: 0.8 },
    { key: 'round', label: 'Arrondi', min: 0, max: 1, step: 0.05, default: 0.55 },
    { key: 'bridge', label: 'Ponts de matière', min: 3, max: 12, step: 0.5, unit: ' mm', default: 5 },
  ],
  generate({ rng, params, inner, keepOut }) {
    const s = params.cell
    const dy = (s * Math.sqrt(3)) / 2
    const jitter = params.irregular * s * 0.5
    const pts = []
    let row = 0
    for (let y = inner[1] - dy; y <= inner[3] + dy; y += dy, row++) {
      for (let x = inner[0] - s + (row % 2 ? s / 2 : 0); x <= inner[2] + s; x += s) {
        pts.push([x + rng.range(-jitter, jitter), y + rng.range(-jitter, jitter)])
      }
    }
    const voronoi = Delaunay.from(pts).voronoi([inner[0] - s, inner[1] - s, inner[2] + s, inner[3] + s])
    const cells = []
    for (let i = 0; i < pts.length; i++) {
      const poly = voronoi.cellPolygon(i)
      if (poly) cells.push(poly.slice(0, -1))
    }
    return cellsToPaths(cells, { inner, bridgeCm: params.bridge / 10, roundness: params.round, keepOut })
  },
}

// Pavages réguliers
function hexCells(inner, size) {
  const R = size / 2
  const w = 1.5 * R
  const h = Math.sqrt(3) * R
  const cells = []
  let col = 0
  for (let cx = inner[0] - R; cx <= inner[2] + R; cx += w, col++) {
    for (let cy = inner[1] - h + (col % 2 ? h / 2 : 0); cy <= inner[3] + h; cy += h) {
      const poly = []
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3
        poly.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R])
      }
      cells.push(poly)
    }
  }
  return cells
}

function diamondCells(inner, size) {
  const a = size
  const b = size * 1.5
  const cells = []
  let row = 0
  for (let cy = inner[1] - b; cy <= inner[3] + b; cy += b / 2, row++) {
    for (let cx = inner[0] - a + (row % 2 ? a / 2 : 0); cx <= inner[2] + a; cx += a) {
      cells.push([[cx - a / 2, cy], [cx, cy - b / 2], [cx + a / 2, cy], [cx, cy + b / 2]])
    }
  }
  return cells
}

function triangleCells(inner, size) {
  const t = size
  const h = (t * Math.sqrt(3)) / 2
  const cells = []
  let row = 0
  for (let y = inner[1] - h; y <= inner[3] + h; y += h, row++) {
    let i = 0
    for (let x = inner[0] - t; x <= inner[2] + t; x += t / 2, i++) {
      const up = (i + row) % 2 === 0
      cells.push(up
        ? [[x - t / 2, y + h], [x, y], [x + t / 2, y + h]]
        : [[x - t / 2, y], [x + t / 2, y], [x, y + h]])
    }
  }
  return cells
}

function brickCells(inner, size) {
  const w = size * 1.6
  const h = size * 0.8
  const cells = []
  let row = 0
  for (let y = inner[1] - h; y <= inner[3] + h; y += h, row++) {
    for (let x = inner[0] - w + (row % 2 ? w / 2 : 0); x <= inner[2] + w; x += w) {
      cells.push([[x, y], [x + w, y], [x + w, y + h], [x, y + h]])
    }
  }
  return cells
}

const LATTICES = { hex: hexCells, diamond: diamondCells, triangle: triangleCells, brick: brickCells }

export const lattice = {
  id: 'lattice',
  label: 'Géométrique',
  category: 'geometrique',
  layout: 'panel',
  description: 'Pavage régulier : hexagones, losanges, triangles ou briques.',
  params: [
    {
      key: 'shape', label: 'Forme', type: 'choice', default: 'hex',
      options: [['hex', 'Hexagones'], ['diamond', 'Losanges'], ['triangle', 'Triangles'], ['brick', 'Briques']],
    },
    { key: 'cell', label: 'Taille', min: 2, max: 10, step: 0.5, unit: ' cm', default: 4 },
    { key: 'round', label: 'Arrondi', min: 0, max: 1, step: 0.05, default: 0.2 },
    { key: 'bridge', label: 'Ponts de matière', min: 3, max: 12, step: 0.5, unit: ' mm', default: 5 },
  ],
  generate({ params, inner, keepOut }) {
    const build = LATTICES[params.shape] ?? hexCells
    return cellsToPaths(build(inner, params.cell), {
      inner, bridgeCm: params.bridge / 10, roundness: params.round, keepOut,
    })
  },
}
