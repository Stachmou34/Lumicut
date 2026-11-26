// Étude « dos du panneau clair » : que gagne-t-on derrière le motif si le dos de la façade et l'intérieur
// des bords du U sont clairs (peinture blanche, film réflecteur) au lieu de la matière (acrylique noir) ?
// Simulation de la lumière dans le creux (src/lib/cavitySim.js), pour plusieurs dos, formats, déports,
// couleurs de mur et parts de façade découpée. Les résultats (JSON) sont écrits sur la sortie standard.
//   node scripts/etude-dos-clair.mjs > etude-dos-clair.json
//   node scripts/etude-dos-clair.mjs --photons 1000000   (plus rapide, plus de bruit)
import { simulateCavity, meanIrradiance, SURFACES } from '../src/lib/cavitySim.js'

const arg = name => {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}
const PHOTONS = Number(arg('--photons')) || 3_000_000

// Formats du site (m, src/lib/sizes.js), dos étudiés, murs (réflectance), ruban Hue Flux (section publiée 14,5 × 6 mm)
const FORMATS = { S: [0.4, 0.2], M: [0.6, 0.3], L: [0.8, 0.4], XL: [1.2, 0.6] }
const BACKS = {
  noir: SURFACES.blackAcrylic,
  bouleau: SURFACES.birch,
  blanc: SURFACES.whitePaint,
  film: SURFACES.whiteFilm,
  alu: SURFACES.aluminium,
}
const WALLS = { blanc: 0.8, beige: 0.55, sombre: 0.15 }
const STRIP = { stripW: 0.0145, stripH: 0.006 }

// Mesures sur le mur : centre du panneau, mi-chemin centre ↔ bord, sous le ruban, halo à 1, 3 et 5 cm,
// et profil sur la ligne verticale du milieu (mailles de 5 mm)
function measure(res) {
  const g = res.geometry
  const cy = g.hh - g.R - STRIP.stripW / 2
  const band = (y0, y1) => (meanIrradiance(res, { x0: -0.1, x1: 0.1, y0, y1 }) + meanIrradiance(res, { x0: -0.1, x1: 0.1, y0: -y1, y1: -y0 })) / 2
  const profile = []
  for (let y = -(g.hh + 0.1); y <= g.hh + 0.1 + 1e-9; y += 0.005) {
    profile.push([Math.round(y * 1000) / 10, meanIrradiance(res, { x0: -0.02, x1: 0.02, y0: y - 0.0025, y1: y + 0.0025 })])
  }
  return {
    centre: meanIrradiance(res, { x0: -0.02, x1: 0.02, y0: -0.02, y1: 0.02 }),
    miChemin: band(g.hh / 2 - 0.01, g.hh / 2 + 0.01),
    sousRuban: band(cy - 0.004, cy + 0.004),
    halo1: band(g.hh + 0.0075, g.hh + 0.0125),
    halo3: band(g.hh + 0.0275, g.hh + 0.0325),
    halo5: band(g.hh + 0.0475, g.hh + 0.0525),
    directCentre: meanIrradiance(res, { x0: -0.02, x1: 0.02, y0: -0.02, y1: 0.02 }, 'direct'),
    directSousRuban: (meanIrradiance(res, { x0: -0.1, x1: 0.1, y0: cy - 0.004, y1: cy + 0.004 }, 'direct')),
    bilan: res.share,
    profil: profile,
  }
}

function run(label, { format = 'M', back = 'noir', wall = 'blanc', gap = 0.03, open = 0.1, face = 0.004 }) {
  const [width, height] = FORMATS[format]
  const t0 = Date.now()
  const res = simulateCavity({ width, height, face, gap, ...STRIP }, {
    back: BACKS[back], wall: WALLS[wall], open, photons: PHOTONS, seed: 12345,
  })
  const m = measure(res)
  process.stderr.write(`${label.padEnd(34)} centre ${m.centre.toFixed(4)}  sous le ruban ${m.sousRuban.toFixed(3)}  (${((Date.now() - t0) / 1000).toFixed(1)} s)\n`)
  return { label, format, back, wall, gap, open, face, ...m }
}

const results = []
// 1. Les cinq dos, formats M et L, mur blanc, déport 30 mm, 10 % de façade découpée
for (const format of ['M', 'L']) {
  for (const back of Object.keys(BACKS)) results.push(run(`${format} · dos ${back}`, { format, back }))
}
// 2. Tous les formats : noir, blanc, film
for (const format of ['S', 'XL']) {
  for (const back of ['noir', 'blanc', 'film']) results.push(run(`${format} · dos ${back}`, { format, back }))
}
// 3. Couleur du mur (format M)
for (const wall of ['beige', 'sombre']) {
  for (const back of ['noir', 'blanc']) results.push(run(`M · mur ${wall} · dos ${back}`, { format: 'M', back, wall }))
}
// 4. Déport (format L)
for (const gap of [0.02, 0.04]) {
  for (const back of ['noir', 'blanc']) results.push(run(`L · déport ${gap * 1000} mm · dos ${back}`, { format: 'L', back, gap }))
}
// 5. Part de façade découpée (format L)
for (const back of ['noir', 'blanc']) results.push(run(`L · 30 % découpé · dos ${back}`, { format: 'L', back, open: 0.3 }))
// 6. Bouleau 6 mm : dos brut ou peint en blanc
for (const back of ['bouleau', 'blanc']) results.push(run(`M bouleau 6 mm · dos ${back}`, { format: 'M', back, face: 0.006 }))

process.stdout.write(JSON.stringify({ photons: PHOTONS, results }, null, 1))
