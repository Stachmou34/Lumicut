// Bande réservée au ruban le long des bords : largeur, cadre des motifs générés, réduction du motif
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

// Modules du site regroupés à la volée (leurs imports n'ont pas d'extension, illisibles tels quels par Node)
const root = fileURLToPath(new URL('..', import.meta.url))
const bundle = await build({
  stdin: {
    contents: [
      "export * from './src/lib/stripBand.js'",
      "export { FRAME_CM } from './src/lib/generators/index.js'",
    ].join('\n'),
    resolveDir: root,
  },
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  write: false,
  logLevel: 'silent',
})
const lib = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)

test('bande = bord du U + largeur du ruban + 2 mm de jeu', () => {
  assert.equal(lib.STRIP_BAND_CLEARANCE_MM, 2)
  assert.equal(lib.stripBandMm('hue-flux', 'acrylic-black'), 4 + 14.5 + 2)
  assert.equal(lib.stripBandMm('hue-omniglow', 'birch-plywood'), 6 + 17 + 2)
  assert.equal(lib.stripBandMm('hue-essential', 'acrylic-white'), 4 + 9.8 + 2)
  // Ruban sans largeur publiée : hypothèse prudente de 15 mm
  assert.equal(lib.stripBandMm('standard', 'acrylic-black'), 4 + 15 + 2)
})

test('les motifs générés laissent un cadre plein plus large que la plus large bande', () => {
  assert.equal(lib.maxStripBandMm(), 25)
  assert.ok(lib.FRAME_CM * 10 >= lib.maxStripBandMm())
})

test('réduction du motif : juste ce qu\'il faut pour sortir de la bande', () => {
  // Panneau 60 × 30, motif centré dont les découpes vont de 1 cm à 29 cm en hauteur
  const box = { x0: 16, y0: 1, x1: 44, y1: 29 }
  const scale = lib.scaleToClearBand({ width: 60, height: 30, motifScale: 90, box, bandCm: 2.05 })
  // Demi-hauteur 14 cm, place 15 - 2,05 = 12,95 cm : facteur 0,925, moins la marge de 3 %
  assert.equal(scale, Math.floor(90 * (12.95 / 14) * 0.97))
  // Déjà hors de la bande : échelle inchangée
  assert.equal(lib.scaleToClearBand({ width: 60, height: 30, motifScale: 90, box: { x0: 20, y0: 5, x1: 40, y1: 25 }, bandCm: 2.05 }), 90)
})

test('réduire ne suffit pas : centre du motif dans la bande, ou échelle trop petite', () => {
  const box = { x0: 0.5, y0: 10, x1: 8, y1: 20 }
  // Motif décalé tout à gauche : son centre est dans la bande
  assert.equal(lib.scaleToClearBand({ width: 60, height: 30, motifScale: 60, motifX: -195, box, bandCm: 2.5 }), null)
  // Il faudrait descendre sous 40 %
  assert.equal(lib.scaleToClearBand({ width: 60, height: 30, motifScale: 45, box: { x0: 15, y0: 0.2, x1: 45, y1: 29.8 }, bandCm: 2.5, minScale: 40 }), null)
})
