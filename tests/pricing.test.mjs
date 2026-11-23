// Prix calculés par le serveur (copie générée de src/lib) : formats, bornes, éclairage, livraison
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { quoteOrder, OrderError } from '../supabase/functions/_shared/lumicut.js'
import { design, PANEL_M, PANEL_XL_HUE } from './helpers.mjs'

test('panneau M standard : 89 €, livraison offerte en France', () => {
  const q = quoteOrder({ items: [{ design: design(PANEL_M) }], country: 'FR' })
  assert.equal(q.lines[0].unitPrice, 89)
  assert.equal(q.shipping, 0)
  assert.equal(q.total, 89)
  assert.equal(q.totalCents, 8900)
})

test('XL bouleau + OmniGlow 5 m + emballage cadeau, quantité 2', () => {
  const q = quoteOrder({ items: [{ design: design(PANEL_XL_HUE), quantity: 2 }], country: 'FR' })
  // 189 (XL) + 5 (bouleau) + 199,99 (OmniGlow 5 m) + 8 (cadeau)
  assert.equal(q.lines[0].unitPrice, 401.99)
  assert.equal(q.subtotal, 803.98)
  assert.equal(q.total, 803.98)
})

test('un format standard est fabriqué et facturé à ses dimensions, quelles que soient celles envoyées', () => {
  const q = quoteOrder({ items: [{ design: design({ ...PANEL_M, sizePreset: 'S', width: 150, height: 80 }) }], country: 'FR' })
  assert.equal(q.lines[0].panel.width, 40)
  assert.equal(q.lines[0].panel.height, 20)
  assert.equal(q.lines[0].unitPrice, 59)
})

test('sur-mesure hors limites refusé, petit sur-mesure au prix plancher', () => {
  assert.throws(() => quoteOrder({ items: [{ design: design({ ...PANEL_M, sizePreset: 'custom', width: 1, height: 1 }) }], country: 'FR' }), OrderError)
  assert.throws(() => quoteOrder({ items: [{ design: design({ ...PANEL_M, sizePreset: 'custom', width: 200, height: 60 }) }], country: 'FR' }), OrderError)
  const q = quoteOrder({ items: [{ design: design({ ...PANEL_M, sizePreset: 'custom', width: 20, height: 10 }) }], country: 'FR' })
  assert.equal(q.lines[0].unitPrice, 59)
})

test('matériau, format ou pays inconnus, quantité et texte hors bornes : refusés', () => {
  const bad = [
    { items: [{ design: design({ ...PANEL_M, material: 'or-massif' }) }], country: 'FR' },
    { items: [{ design: design({ ...PANEL_M, sizePreset: 'XXL' }) }], country: 'FR' },
    { items: [{ design: design(PANEL_M) }], country: 'US' },
    { items: [{ design: design(PANEL_M), quantity: 0 }], country: 'FR' },
    { items: [{ design: design(PANEL_M), quantity: 2.5 }], country: 'FR' },
    { items: [{ design: design({ ...PANEL_M, textContent: 'x'.repeat(31) }) }], country: 'FR' },
    { items: [{ design: 'pas-un-design' }], country: 'FR' },
    { items: [], country: 'FR' },
  ]
  for (const input of bad) assert.throws(() => quoteOrder(input), OrderError)
})

test('livraison : Belgique 12 €, supplément grand format à partir de 80 cm', () => {
  assert.equal(quoteOrder({ items: [{ design: design(PANEL_M) }], country: 'BE' }).shipping, 12)
  assert.equal(quoteOrder({ items: [{ design: design({ ...PANEL_M, sizePreset: 'L' }) }], country: 'BE' }).shipping, 17)
})

test('un design d\'avant Philips Hue en couleur est facturé avec un ruban Hue Flux', () => {
  const old = { sizePreset: 'M', width: 60, height: 30, material: 'acrylic-black', ledPreset: 'violet', ledColor: '#bf7fff' }
  const q = quoteOrder({ items: [{ design: design(old) }], country: 'FR' })
  assert.equal(q.lines[0].panel.lightModel, 'hue-flux')
  assert.equal(q.lines[0].unitPrice, 168.99)
})
