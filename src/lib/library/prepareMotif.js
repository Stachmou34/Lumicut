// Préparation d'un dessin réel (SVG) pour la découpe laser.
// Convention : le noir est découpé (la lumière passe), le blanc reste en matière.
// Étapes : fusion des formes noires, mise au repère 200, suppression des poussières,
// puis traitement des îlots (blanc entièrement entouré de noir, qui tomberait à la découpe) :
// petit îlot → rempli ; sinon → tenu par des ponts de matière, comme un pochoir.
import paper from 'paper'
import { distanceTransform, floodFill, components } from '../cutAnalysis'

export const VIEW = 200
// Taille de référence du motif : format M (60 × 30 cm) à 90 %, soit 27 cm de côté
export const REFERENCE_SIDE_MM = 270

const DEFAULTS = {
  padding: 4, // marge autour du dessin, en unités du repère 200
  bridgeMm: 3.75, // largeur des ponts à la taille de référence (3 mm minimum en bois + marge)
  minHoleMm2: 4, // îlot plus petit : rempli (trop petit pour être tenu par un pont)
  minSpeckMm2: 1.2, // découpe plus petite : supprimée (poussière)
  maxBridgeMm: 30, // pont plus long : on remplit plutôt l'îlot
  secondBridgeMm: 70, // îlot dont le contour dépasse cette longueur : deux ponts
  fill: false, // vrai : silhouette pleine, tous les îlots sont remplis
  minMaterialMm: 3, // épaisseur minimale de matière visée (bois, MDF) à la taille de référence
  fix: true, // faux : dessin seulement fusionné et mis au repère (pour comparer avant / après)
}

let scope = null
function freshScope() {
  if (!scope) {
    scope = new paper.PaperScope()
    scope.setup(new scope.Size(VIEW, VIEW))
  }
  scope.activate()
  scope.project.clear()
  return scope
}

// Couleur de remplissage sombre (noir, currentColor) : la forme est découpée
function isDark(color) {
  if (!color) return false
  if ((color.alpha ?? 1) < 0.1) return false
  return color.lightness < 0.5
}

// Contours fermés d'une forme (un chemin simple ou les sous-chemins d'un chemin composé)
function contoursOf(item) {
  if (!item) return []
  const list = item instanceof scope.CompoundPath ? item.children.slice() : [item]
  return list.filter(p => p.segments && p.segments.length > 2)
}

// Profondeur d'imbrication de chaque contour : pair = découpe, impair = îlot de matière
function nestContours(item) {
  const cs = contoursOf(item).map(p => ({ p, area: Math.abs(p.area), pt: p.interiorPoint }))
  for (const c of cs) {
    const containers = cs.filter(o => o !== c && o.area > c.area && o.p.contains(c.pt))
    c.depth = containers.length
    c.parent = containers.reduce((best, o) => (!best || o.area < best.area ? o : best), null)
  }
  for (const c of cs) c.children = cs.filter(o => o.parent === c)
  return cs
}

function descendants(c) {
  return c.children.flatMap(k => [k, ...descendants(k)])
}

// Ponts possibles entre un îlot et le contour qui l'entoure : pour chaque point de l'îlot,
// le point le plus proche du contour parent (le segment reste dans la découpe)
function bridgeCandidates(hole, parent) {
  const L = hole.p.length
  const n = Math.max(48, Math.min(400, Math.round(L / 0.6)))
  const out = []
  for (let i = 0; i < n; i++) {
    const offset = (L * i) / n
    const a = hole.p.getPointAt(offset)
    const b = parent.p.getNearestPoint(a)
    if (a && b) out.push({ offset, a, b, d: a.getDistance(b) })
  }
  return out
}

// Rectangle orienté qui coupe la découpe de part en part (dépasse un peu de chaque côté)
function bridgeShape(a, b, width) {
  const dir = b.subtract(a)
  const len = dir.length || 1
  const u = dir.divide(len)
  const nrm = new scope.Point(-u.y, u.x).multiply(width / 2)
  const from = a.subtract(u.multiply(0.6))
  const to = b.add(u.multiply(0.6))
  return new scope.Path({
    segments: [from.add(nrm), to.add(nrm), to.subtract(nrm), from.subtract(nrm)],
    closed: true,
    insert: false,
  })
}

// Assemble les formes sombres d'un SVG (dans l'ordre de peinture : une forme claire
// posée par-dessus efface la découpe en dessous)
function mergeDarkShapes(svgString) {
  const svg = svgString.replace(/currentColor/g, '#000000')
  const root = scope.project.importSVG(svg, { expandShapes: true, insert: true })
  const leaves = root.getItems({
    recursive: true,
    match: it => (it instanceof scope.Path || it instanceof scope.CompoundPath)
      && !(it.parent instanceof scope.CompoundPath)
      && !it.clipMask,
  })
  let merged = null
  let ignoredStrokes = 0
  for (const leaf of leaves) {
    const filled = leaf.fillColor && (leaf.fillColor.alpha ?? 1) >= 0.1
    if (!filled) {
      if (leaf.strokeColor) ignoredStrokes++
      continue
    }
    let shape = leaf.clone({ insert: false })
    if (shape.resolveCrossings) shape = shape.resolveCrossings()
    shape.reorient(leaf.fillRule !== 'evenodd', true)
    if (isDark(leaf.fillColor)) merged = merged ? merged.unite(shape, { insert: false }) : shape
    else if (merged) merged = merged.subtract(shape, { insert: false })
  }
  root.remove()
  return { merged, ignoredStrokes }
}

/**
 * Prépare un SVG pour la découpe. Renvoie le chemin final (repère 200) et le détail des corrections.
 * options : voir DEFAULTS (dimensions en mm à la taille de référence)
 */
export function prepareMotif(svgString, options = {}) {
  const o = { ...DEFAULTS, ...options }
  freshScope()
  const { merged, ignoredStrokes } = mergeDarkShapes(svgString)
  if (!merged || !contoursOf(merged).length) throw new Error('Aucune forme pleine dans ce dessin')

  merged.fitBounds(new scope.Rectangle(o.padding, o.padding, VIEW - 2 * o.padding, VIEW - 2 * o.padding))
  let shape = merged instanceof scope.CompoundPath ? merged : new scope.CompoundPath({ children: [merged], insert: false })

  const mmPerUnit = REFERENCE_SIDE_MM / VIEW
  const mm2PerUnit2 = mmPerUnit * mmPerUnit
  const report = { ignoredStrokes, specks: 0, filled: 0, bridged: 0, bridges: [] }
  if (!o.fix) {
    const d = shape.getPathData(null, 2)
    return { d, svg: motifSvg(d), report }
  }

  // 1) Poussières : découpes minuscules, impossibles à réussir proprement
  for (const c of nestContours(shape)) {
    if (c.depth % 2 === 0 && c.area * mm2PerUnit2 < o.minSpeckMm2 && c.p.parent) {
      for (const k of [c, ...descendants(c)]) k.p.remove()
      report.specks++
    }
  }

  // 2) Îlots : remplis s'ils sont petits (ou en mode silhouette), sinon tenus par des ponts
  const cs = nestContours(shape)
  const holes = cs.filter(c => c.depth % 2 === 1 && c.parent)
  const bridges = []
  const removed = new Set()
  for (const hole of holes) {
    if (removed.has(hole)) continue
    const fill = () => {
      for (const k of [hole, ...descendants(hole)]) { removed.add(k); k.p.remove() }
      report.filled++
    }
    if (o.fill || hole.area * mm2PerUnit2 < o.minHoleMm2) { fill(); continue }

    const cands = bridgeCandidates(hole, hole.parent)
    if (!cands.length) { fill(); continue }
    const best = cands.reduce((m, c) => (c.d < m.d ? c : m))
    if (best.d * mmPerUnit > o.maxBridgeMm) { fill(); continue }
    const chosen = [best]
    // Grand îlot : un second pont, loin du premier sur le contour
    const L = hole.p.length
    if (L * mmPerUnit > o.secondBridgeMm) {
      const far = cands.filter(c => {
        const gap = Math.abs(c.offset - best.offset)
        return Math.min(gap, L - gap) > L * 0.3
      })
      if (far.length) {
        const second = far.reduce((m, c) => (c.d < m.d ? c : m))
        if (second.d * mmPerUnit <= o.maxBridgeMm) chosen.push(second)
      }
    }
    for (const c of chosen) {
      bridges.push(bridgeShape(c.a, c.b, o.bridgeMm / mmPerUnit))
      report.bridges.push({ x1: c.a.x, y1: c.a.y, x2: c.b.x, y2: c.b.y })
    }
    report.bridged++
  }

  if (bridges.length) {
    const all = bridges.reduce((acc, b) => acc.unite(b, { insert: false }))
    shape = shape.subtract(all, { insert: false })
  }

  // 3) Seconde passe au pixel (0,25 mm à la taille de référence) : îlots que le tracé ne montre pas
  // (formes qui se touchent presque) et parties tenues par un passage plus étroit que le minimum
  // de matière. Chacune reçoit un pont vers la matière solide ; une miette sans épaisseur est découpée.
  for (let pass = 0; pass < 4; pass++) {
    const weak = rasterWeakParts(shape, o)
    if (!weak.length) break
    for (const part of weak) {
      if (!part.bridges.length) {
        const dot = new scope.Path.Circle({ center: part.center, radius: part.radius + 0.4, insert: false })
        shape = shape.unite(dot, { insert: false })
        report.filled++
        continue
      }
      for (const [a, b] of part.bridges) {
        shape = shape.subtract(bridgeShape(a, b, o.bridgeMm / mmPerUnit), { insert: false })
        report.bridges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, raster: true })
      }
      report.bridged++
    }
    report.rasterPasses = pass + 1
  }

  const d = shape.getPathData(null, 2)
  return { d, svg: motifSvg(d), report }
}

// Parties faibles vues au pixel (0,25 mm à la taille de référence).
// « Cœur » = matière à plus d'un demi-minimum de toute découpe. Le cœur principal est celui du panneau
// (relié au bord). Tout autre cœur ne tient que par un passage trop étroit, ou pas du tout : il lui faut
// un pont, tracé de son cœur jusqu'au cœur principal par le plus court chemin. Une matière flottante
// sans cœur (filet plus fin que le minimum) ne peut pas être tenue : elle est découpée.
function rasterWeakParts(shape, o) {
  const mmPerPx = 0.25
  const mmPerUnit = REFERENCE_SIDE_MM / VIEW
  const pxPerUnit = mmPerUnit / mmPerPx
  const margin = 24
  const N = Math.round(VIEW * pxPerUnit) + 2 * margin
  const canvas = document.createElement('canvas')
  canvas.width = N
  canvas.height = N
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, N, N)
  ctx.translate(margin, margin)
  ctx.scale(pxPerUnit, pxPerUnit)
  ctx.fillStyle = '#000'
  ctx.fill(new Path2D(shape.getPathData(null, 3)), 'evenodd')
  const rgba = ctx.getImageData(0, 0, N, N).data
  const n = N * N
  const material = new Uint8Array(n)
  for (let i = 0; i < n; i++) material[i] = rgba[i * 4] >= 128 ? 1 : 0

  const border = []
  for (let x = 0; x < N; x++) border.push(x, (N - 1) * N + x)
  for (let y = 1; y < N - 1; y++) border.push(y * N, y * N + N - 1)

  // Matière tenue : reliée au bord par un passage d'au moins 1 mm (un fil plus fin brûle à la découpe).
  // Ouverture morphologique : on relie par la matière « pleine » (à plus de 0,5 mm d'une découpe),
  // puis on rend la bordure de 0,5 mm qui l'entoure.
  const dist = distanceTransform(N, N, i => !material[i], false)
  const half = 0.5 / mmPerPx
  const solid = new Uint8Array(n)
  for (let i = 0; i < n; i++) solid[i] = material[i] && dist[i] > half * half ? 1 : 0
  const solidAttached = new Int32Array(n)
  floodFill(solid, N, N, border, solidAttached, 1)
  const toSolid = distanceTransform(N, N, i => solidAttached[i] > 0, false)
  const attached = new Uint8Array(n)
  for (let i = 0; i < n; i++) attached[i] = material[i] && toSolid[i] <= (half + 1.5) * (half + 1.5) ? 1 : 0

  // Cœurs : matière à plus de r de la découpe (r = demi-minimum de matière)
  const r = o.minMaterialMm / 2 / mmPerPx
  const core = new Uint8Array(n)
  for (let i = 0; i < n; i++) core[i] = material[i] && dist[i] > r * r ? 1 : 0
  const mainCore = new Int32Array(n)
  floodFill(core, N, N, border, mainCore, 1)

  const toUnits = i => new scope.Point(((i % N) - margin) / pxPerUnit, (Math.floor(i / N) - margin) / pxPerUnit)
  const queue = new Int32Array(n)
  // Plus court chemin depuis des pixels de départ jusqu'au cœur principal (à travers tout le reste)
  const pathToMain = (sources) => {
    const from = new Int32Array(n).fill(-1)
    let head = 0
    let tail = 0
    for (const i of sources) { from[i] = i; queue[tail++] = i }
    while (head < tail) {
      const i = queue[head++]
      const x = i % N
      const nb = [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, i - N, i + N]
      for (const j of nb) {
        if (j < 0 || j >= n || from[j] !== -1) continue
        from[j] = from[i]
        if (mainCore[j]) return [toUnits(from[i]), toUnits(j)]
        queue[tail++] = j
      }
    }
    return null
  }

  const parts = []
  // a) Cœurs secondaires (îlots épais ou parties fragiles) : un pont, deux pour les grands
  const secondary = new Uint8Array(n)
  for (let i = 0; i < n; i++) secondary[i] = core[i] && !mainCore[i] ? 1 : 0
  const sec = components(secondary, N, N)
  const minCorePx = 2 / (mmPerPx * mmPerPx)
  for (const c of sec.list) {
    if (c.count < minCorePx) continue
    const px = []
    for (let i = 0; i < n; i++) if (sec.labels[i] === c.label) px.push(i)
    const first = pathToMain(px)
    if (!first) continue
    const bridges = [first]
    const spanMm = Math.sqrt(c.count) * mmPerPx * 2
    if (spanMm > o.secondBridgeMm / 2) {
      const far = px.filter(i => toUnits(i).getDistance(first[0]) * mmPerUnit > spanMm * 0.45)
      const second = far.length ? pathToMain(far) : null
      if (second) bridges.push(second)
    }
    parts.push({ bridges, center: toUnits(px[Math.floor(px.length / 2)]), radius: 0 })
  }

  // b) Matière flottante sans cœur (trop fine pour être tenue) : découpée
  const floating = new Uint8Array(n)
  for (let i = 0; i < n; i++) floating[i] = material[i] && !attached[i] && !core[i] ? 1 : 0
  // On ne garde que les morceaux flottants qui ne touchent aucun cœur secondaire (déjà tenu par un pont)
  const fl = components(floating, N, N)
  const nearCore = new Set()
  for (let i = 0; i < n; i++) {
    if (!fl.labels[i]) continue
    const x = i % N
    const nb = [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, i - N, i + N]
    for (const j of nb) if (j >= 0 && j < n && secondary[j]) nearCore.add(fl.labels[i])
  }
  for (const c of fl.list) {
    if (nearCore.has(c.label) || c.count * mmPerPx * mmPerPx < 0.2) continue
    parts.push({
      bridges: [],
      center: new scope.Point((c.cx - margin) / pxPerUnit, (c.cy - margin) / pxPerUnit),
      radius: Math.sqrt(c.count / Math.PI) / pxPerUnit,
    })
  }
  return parts
}

// SVG standard d'un motif de la bibliothèque (repère 200, découpe en noir)
export function motifSvg(d) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}"><path fill="black" fill-rule="evenodd" d="${d}"/></svg>`
}
