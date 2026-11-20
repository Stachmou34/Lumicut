// Constellations réelles : figures et étoiles du catalogue Hipparcos, via les données de d3-celestial
// (Olaf Frohn, licence BSD-3). Étoiles = trous ronds dont la taille suit l'éclat ; traits = fentes fines
// arrêtées avant chaque étoile, si bien que les figures fermées (corps d'Orion…) ne détachent aucun morceau.

const RAD = Math.PI / 180
const MM = 270 / 200 // mm par unité du repère 200, à la taille de référence (27 cm)

const toVec = ([lon, lat]) => [
  Math.cos(lat * RAD) * Math.cos(lon * RAD),
  Math.cos(lat * RAD) * Math.sin(lon * RAD),
  Math.sin(lat * RAD),
]

// data : { lines, stars } (constellations.lines.json et stars.6.json)
export function constellationSvg(data, iau) {
  const feature = data.lines.features.find(f => f.id === iau)
  if (!feature) throw new Error(`Constellation inconnue : ${iau}`)
  const polylines = feature.geometry.coordinates

  // Éclat d'une étoile du tracé : étoile du catalogue la plus proche
  const magAt = p => {
    let best = null
    let bd = Infinity
    for (const s of data.stars.features) {
      const [lon, lat] = s.geometry.coordinates
      const d = Math.abs(lon - p[0]) + Math.abs(lat - p[1])
      if (d < bd) { bd = d; best = s }
    }
    return bd < 0.08 ? best.properties.mag : 4.5
  }

  // Projection stéréographique centrée sur la figure, vue depuis la Terre (l'est à gauche)
  const v = polylines.flat().map(toVec).reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], [0, 0, 0])
  const lon0 = Math.atan2(v[1], v[0])
  const lat0 = Math.atan2(v[2], Math.hypot(v[0], v[1]))
  const project = ([lon, lat]) => {
    const l = lon * RAD
    const p = lat * RAD
    const k = 2 / (1 + Math.sin(lat0) * Math.sin(p) + Math.cos(lat0) * Math.cos(p) * Math.cos(l - lon0))
    return [
      -k * Math.cos(p) * Math.sin(l - lon0),
      -k * (Math.cos(lat0) * Math.sin(p) - Math.sin(lat0) * Math.cos(p) * Math.cos(l - lon0)),
    ]
  }

  const key = p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`
  const starMap = new Map()
  for (const pl of polylines) {
    for (const p of pl) if (!starMap.has(key(p))) starMap.set(key(p), { sky: p, mag: magAt(p) })
  }
  const stars = [...starMap.values()]
  for (const s of stars) s.xy = project(s.sky)

  // Mise à l'échelle dans le carré 200, avec une marge pour les plus grosses étoiles
  const xs = stars.map(s => s.xy[0])
  const ys = stars.map(s => s.xy[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const pad = 14
  const k = (200 - 2 * pad) / Math.max(maxX - minX, maxY - minY)
  const ox = 100 - ((minX + maxX) / 2) * k
  const oy = 100 - ((minY + maxY) / 2) * k
  for (const s of stars) s.p = [ox + s.xy[0] * k, oy + s.xy[1] * k]

  // Rayon (mm à la taille de référence) selon la magnitude : les plus brillantes sont les plus grosses
  const radius = mag => Math.max(2.0, Math.min(6.5, 6.2 - 0.95 * mag)) / MM
  const body = stars.map(s => `<circle cx="${s.p[0].toFixed(2)}" cy="${s.p[1].toFixed(2)}" r="${radius(s.mag).toFixed(2)}"/>`)

  // Traits : fente de 1,2 mm arrêtée à 3,4 mm du bord de chaque étoile (pont de matière)
  const slot = 1.2 / MM
  const gap = 3.4 / MM
  const done = new Set()
  for (const pl of polylines) {
    for (let i = 1; i < pl.length; i++) {
      const a = starMap.get(key(pl[i - 1]))
      const b = starMap.get(key(pl[i]))
      const id = [key(pl[i - 1]), key(pl[i])].sort().join('|')
      if (done.has(id) || a === b) continue
      done.add(id)
      const dx = b.p[0] - a.p[0]
      const dy = b.p[1] - a.p[1]
      const L = Math.hypot(dx, dy)
      const ux = dx / L
      const uy = dy / L
      const s0 = radius(a.mag) + gap
      const s1 = radius(b.mag) + gap
      if (L - s0 - s1 < 2.5 / MM) continue
      const x0 = a.p[0] + ux * s0
      const y0 = a.p[1] + uy * s0
      const x1 = b.p[0] - ux * s1
      const y1 = b.p[1] - uy * s1
      const nx = (-uy * slot) / 2
      const ny = (ux * slot) / 2
      const f = n => n.toFixed(2)
      body.push(`<path d="M${f(x0 + nx)} ${f(y0 + ny)}L${f(x1 + nx)} ${f(y1 + ny)}L${f(x1 - nx)} ${f(y1 - ny)}L${f(x0 - nx)} ${f(y0 - ny)}Z"/>`)
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="black">${body.join('')}</g></svg>`
}
