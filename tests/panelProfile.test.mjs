// Plaque en U de 2 cm : le ruban, livré non posé, se colle au fond du creux, contre le bord
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { quoteOrder, workshopItem } from '../supabase/functions/_shared/lumicut.js'
import { design, PANEL_M } from './helpers.mjs'

const line = panel => quoteOrder({ items: [{ design: design(panel) }], country: 'FR' }).lines[0]
const hue = (lightModel, extra = {}) => ({ ...PANEL_M, lightModel, ledMode: 'color', ledColor: '#ff4444', ...extra })

test('Hue Flux en format M : ruban de 3 m gardé à 166 cm, centré à 1,1 cm du bord', () => {
  const l = line(hue('hue-flux'))
  const bom = workshopItem(l).lighting
  assert.equal(bom.lengthM, 3)
  assert.equal(bom.cutCm, 166) // 10 repères de 16,6 cm ; le reste tombe à l'encoche du câble
  assert.equal(bom.insetCm, 1.1) // bord de 4 mm + demi-largeur du ruban (7,25 mm)
})

test('façade bois de 6 mm : bords de 6 mm, le ruban s\'écarte d\'autant du bord', () => {
  assert.equal(workshopItem(line(hue('hue-flux', { material: 'birch-plywood' }))).lighting.insetCm, 1.3)
})

test('ruban blanc : il fait tout le tour du creux, contre le bord', () => {
  const bom = workshopItem(line(PANEL_M)).lighting
  assert.equal(bom.cutCm, 170.8) // 2 × (60 + 30) − 8 × 1,15 cm
  assert.equal(bom.insetCm, 1.2)
})

test('formats standard : le profil en U ne change pas le prix des rubans Hue', () => {
  const cases = [
    [{ sizePreset: 'S', width: 40, height: 20 }, 'hue-essential', 118.99],
    [{}, 'hue-flux', 168.99],
    [{ sizePreset: 'L', width: 80, height: 40 }, 'hue-flux-ultra', 228.99],
    [{ sizePreset: 'XL', width: 120, height: 60 }, 'hue-flux', 273.99],
    [{ sizePreset: 'XL', width: 120, height: 60 }, 'hue-flux-ultra', 348.99],
    [{ sizePreset: 'XL', width: 120, height: 60, material: 'birch-plywood' }, 'hue-omniglow', 393.99],
  ]
  for (const [size, model, price] of cases) assert.equal(line(hue(model, size)).unitPrice, price, `${model} ${size.sizePreset ?? 'M'}`)
})

test('collé contre le bord, le ruban laisse au plus un intervalle de coupe à l\'encoche', () => {
  for (const [w, h] of [[40, 20], [60, 30], [100, 60], [120, 60], [150, 80]]) {
    for (const model of ['hue-flux', 'hue-omniglow']) {
      const bom = workshopItem(line(hue(model, { sizePreset: 'custom', width: w, height: h }))).lighting
      const run = 2 * ((w - 2 * bom.insetCm) + (h - 2 * bom.insetCm))
      assert.ok(run - bom.cutCm <= 17.5, `${model} ${w}×${h} : reste ${run - bom.cutCm} cm`)
      assert.ok(bom.cutCm <= bom.lengthM * 100)
    }
  }
})
