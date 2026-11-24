// Tracé du ruban dans le creux : même tour que le calcul de longueur, départ à l'encoche,
// couleurs du dégradé le long du ruban
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

// Modules du site regroupés à la volée (leurs imports n'ont pas d'extension, illisibles tels quels par Node)
const root = fileURLToPath(new URL('..', import.meta.url))
const bundle = await build({
  stdin: {
    contents: [
      "export * from './src/lib/stripLayout.js'",
      "export { lightingFor, stripRunCm, stripSection, stripInsetCm } from './src/lib/lighting/lightingCatalog.js'",
      "export { gradientAt } from './src/lib/lighting/colorTemperature.js'",
    ].join('\n'),
    resolveDir: root,
  },
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: false,
  logLevel: 'silent',
})
const lib = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)

test('le tour du ruban a la longueur utilisée pour le prix et la coupe', () => {
  const l = lib.lightingFor({ lightModel: 'hue-flux', width: 60, height: 30, material: 'acrylic-black' })
  const loop = lib.stripLoop(60, 30, l.insetCm, lib.STRIP_START_MM / 10)
  assert.ok(Math.abs(loop.length - lib.stripRunCm(60, 30, l.insetCm)) < 1e-9)
  assert.equal(loop.segments.length, lib.LOOP_SIDES)
})

test('départ juste à côté de l\'encoche, vers la gauche le long du bas (vu de face)', () => {
  const loop = lib.stripLoop(60, 30, 1.125, 0.8)
  assert.deepEqual(loop.segments[0].from, [-0.8, -15 + 1.125])
  assert.ok(loop.segments[0].to[0] < loop.segments[0].from[0])
  // Le tour se referme au départ
  assert.deepEqual(loop.segments.at(-1).to, loop.segments[0].from)
})

test('ruban coupé avant la fin : le reste tombe sur le dernier tronçon, vers l\'encoche', () => {
  const l = lib.lightingFor({ lightModel: 'hue-flux', width: 60, height: 30, material: 'acrylic-black' })
  const loop = lib.stripLoop(60, 30, lib.stripInsetCm('hue-flux', 'acrylic-black'), 0.8)
  const pieces = lib.loopPieces(loop, 0, l.cutCm)
  assert.equal(pieces.length, 5)
  const laid = pieces.reduce((s, p) => s + p.length, 0)
  assert.ok(Math.abs(laid - l.cutCm) < 1e-9)
  // Fin du ruban sur le bas, à droite de l'encoche (vu de face), à « reste » du départ
  const end = lib.loopPoint(loop, l.cutCm)
  assert.ok(end.x > 0.8)
  assert.ok(Math.abs(end.x - (-0.8 + (l.runCm - l.cutCm))) < 0.11)
})

test('échantillons le long du ruban : position 0 → 1, sur le tour', () => {
  const loop = lib.stripLoop(40, 20, 1.1, 0.8)
  const samples = lib.stripSamples(loop, loop.length, 8)
  assert.equal(samples.length, 8)
  assert.ok(samples.every((s, i) => i === 0 || s.f > samples[i - 1].f))
  assert.ok(samples.every(s => Math.abs(Math.abs(s.x) - 18.9) < 1e-9 || Math.abs(Math.abs(s.y) - 8.9) < 1e-9))
})

test('dégradé le long du ruban : couleurs de départ, du milieu et de fin', () => {
  const colors = ['#ff0000', '#00ff00', '#0000ff']
  assert.equal(lib.gradientAt(colors, 0), '#ff0000')
  assert.equal(lib.gradientAt(colors, 0.5), '#00ff00')
  assert.equal(lib.gradientAt(colors, 1), '#0000ff')
  assert.equal(lib.gradientAt(colors, 0.25), '#808000')
  assert.equal(lib.gradientAt(['#123456'], 0.7), '#123456')
})

test('section du ruban : cotes publiées, sinon hypothèse signalée', () => {
  assert.deepEqual(lib.stripSection('hue-flux'), { widthMm: 14.5, heightMm: 6, known: true })
  assert.equal(lib.stripSection('hue-flux-ultra').known, false)
  assert.equal(lib.stripSection('standard').widthMm, 15)
})
