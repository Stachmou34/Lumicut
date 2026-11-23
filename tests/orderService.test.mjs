// Création de commande côté serveur : prix recalculé, tous les articles, une seule commande et un seul paiement
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createOrUpdateOrder } from '../supabase/functions/_shared/orderService.js'
import { design, PANEL_M, PANEL_XL_HUE, CUSTOMER, memoryOrders, fakeStripe } from './helpers.mjs'

const input = (overrides = {}) => ({
  checkoutId: randomUUID(),
  customer: CUSTOMER,
  items: [
    { design: design(PANEL_M), quantity: 1, motifName: 'Coq', price: 0.5 },
    { design: design(PANEL_XL_HUE), quantity: 1, motifName: 'Cerf élaphe', price: 0.5 },
  ],
  ...overrides,
})

test('le montant payé est celui calculé par le serveur, pas celui envoyé', async () => {
  const db = memoryOrders()
  const stripe = fakeStripe()
  const res = await createOrUpdateOrder(input({ amount: 50 }), { db, stripe })
  assert.equal(res.total, 490.99) // 89 + 401,99
  assert.equal(res.amountCents, 49099)
  assert.equal(stripe.calls.filter(c => c.op === 'create').length, 1)
  const created = stripe.calls.find(c => c.op === 'create').params
  assert.equal(created.amount, 49099)
  assert.equal(created.metadata.orderId, res.orderId)
  assert.equal(created.currency, 'eur')
})

test('tous les articles sont enregistrés, avec leur éclairage et leurs options', async () => {
  const db = memoryOrders()
  const res = await createOrUpdateOrder(input(), { db, stripe: fakeStripe() })
  const row = db.rows[0]
  assert.equal(row.id, res.orderId)
  assert.equal(row.items.length, 2)
  assert.equal(row.items[1].motifName, 'Cerf élaphe')
  assert.equal(row.items[1].lighting.model, 'hue-omniglow')
  assert.equal(row.items[1].options.giftWrap, true)
  assert.equal(row.items[0].design.textContent, 'Léa')
  assert.equal(row.config.items_count, 2)
  assert.equal(row.subtotal, 490.99)
  assert.equal(row.price_ttc, 490.99)
  assert.equal(row.customer_email, 'lea.martin@example.fr')
  assert.equal(row.customer_address.postal_code, '34000')
  assert.equal(row.payment_intent_id, 'pi_test_1')
})

test('allers-retours entre récapitulatif et paiement : une seule commande, un seul paiement', async () => {
  const db = memoryOrders()
  const stripe = fakeStripe()
  const first = input()
  const a = await createOrUpdateOrder(first, { db, stripe })
  const b = await createOrUpdateOrder(first, { db, stripe })
  // Panier modifié avant de payer : même commande, montant du paiement mis à jour
  const c = await createOrUpdateOrder({ ...first, items: [{ design: design(PANEL_M), quantity: 2 }] }, { db, stripe })
  assert.equal(db.rows.length, 1)
  assert.equal(a.orderId, b.orderId)
  assert.equal(a.orderId, c.orderId)
  assert.equal(stripe.intents.size, 1)
  assert.equal(c.amountCents, 17800)
  assert.equal(stripe.intents.get('pi_test_1').amount, 17800)
  assert.equal(db.rows[0].items.length, 1)
})

test('commande déjà payée : refus, sans nouveau paiement', async () => {
  const db = memoryOrders()
  const stripe = fakeStripe()
  const first = input()
  await createOrUpdateOrder(first, { db, stripe })
  db.rows[0].status = 'paid'
  await assert.rejects(createOrUpdateOrder(first, { db, stripe }), err => err.code === 'already_paid')
  assert.equal(stripe.intents.size, 1)
})

test('paiement déjà abouti chez Stripe : refus même si le webhook n\'est pas encore arrivé', async () => {
  const db = memoryOrders()
  const stripe = fakeStripe()
  const first = input()
  await createOrUpdateOrder(first, { db, stripe })
  stripe.intents.get('pi_test_1').status = 'succeeded'
  await assert.rejects(createOrUpdateOrder(first, { db, stripe }), err => err.code === 'already_paid')
})

test('paiement annulé chez Stripe : un nouveau paiement est créé pour la même commande', async () => {
  const db = memoryOrders()
  const stripe = fakeStripe()
  const first = input()
  await createOrUpdateOrder(first, { db, stripe })
  stripe.intents.get('pi_test_1').status = 'canceled'
  const res = await createOrUpdateOrder(first, { db, stripe })
  assert.equal(db.rows.length, 1)
  assert.equal(db.rows[0].payment_intent_id, 'pi_test_2')
  assert.equal(res.clientSecret, 'pi_test_2_secret_x')
})

test('coordonnées ou session invalides : refus clair', async () => {
  const deps = { db: memoryOrders(), stripe: fakeStripe() }
  await assert.rejects(createOrUpdateOrder(input({ checkoutId: '123' }), deps), /Session de paiement invalide/)
  await assert.rejects(createOrUpdateOrder(input({ customer: { ...CUSTOMER, email: 'pas-un-email' } }), deps), /Email invalide/)
  await assert.rejects(createOrUpdateOrder(input({ customer: { ...CUSTOMER, country: 'US' } }), deps), /Pays/)
  await assert.rejects(createOrUpdateOrder(input({ customer: { ...CUSTOMER, firstName: 'x'.repeat(61) } }), deps), /trop long/)
  assert.equal(deps.stripe.calls.length, 0)
})

test('double clic : la seconde requête retrouve la commande créée par la première', async () => {
  const db = memoryOrders()
  const stripe = fakeStripe()
  const first = input()
  const insert = db.insert
  // La première requête « gagne » pendant que la seconde vérifie
  let raced = false
  db.insert = async row => {
    if (!raced) {
      raced = true
      await insert({ ...row })
      return null
    }
    return insert(row)
  }
  const res = await createOrUpdateOrder(first, { db, stripe })
  assert.equal(db.rows.length, 1)
  assert.equal(res.orderId, db.rows[0].id)
})
