// Webhook Stripe : montant vérifié, événements rejoués, échecs et remboursements
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handleStripeEvent } from '../supabase/functions/_shared/stripeEvents.js'
import { memoryWebhookDb } from './helpers.mjs'

const ORDER_ID = '7d0b8a52-4d3e-4c7a-9a55-2b8f1e0c9a11'
const order = (patch = {}) => ({ id: ORDER_ID, status: 'pending', price_ttc: 168.99, payment_intent_id: 'pi_1', customer_email: 'a@b.fr', ...patch })
const succeeded = (amount = 16899, extra = {}) => ({
  id: `evt_${Math.random()}`,
  type: 'payment_intent.succeeded',
  data: { object: { id: 'pi_1', amount, amount_received: amount, currency: 'eur', metadata: { orderId: ORDER_ID }, ...extra } },
})
const notifier = () => {
  const paid = []
  return { paid, orderPaid: async id => { paid.push(id) } }
}

test('paiement du bon montant : commande payée, une confirmation', async () => {
  const db = memoryWebhookDb([order()])
  const notify = notifier()
  assert.equal(await handleStripeEvent(succeeded(), { db, notify }), 'paid')
  assert.equal(db.orders[0].status, 'paid')
  assert.deepEqual(notify.paid, [ORDER_ID])
})

test('événement rejoué : traité une seule fois', async () => {
  const db = memoryWebhookDb([order()])
  const notify = notifier()
  const event = succeeded()
  await handleStripeEvent(event, { db, notify })
  assert.equal(await handleStripeEvent(event, { db, notify }), 'duplicate')
  assert.equal(notify.paid.length, 1)
})

test('deux événements de réussite différents pour la même commande : un seul email', async () => {
  const db = memoryWebhookDb([order()])
  const notify = notifier()
  await handleStripeEvent(succeeded(), { db, notify })
  assert.equal(await handleStripeEvent(succeeded(), { db, notify }), 'already_paid')
  assert.equal(notify.paid.length, 1)
})

test('montant encaissé différent : jamais « payée », alerte pour l\'admin', async () => {
  const db = memoryWebhookDb([order()])
  const notify = notifier()
  assert.equal(await handleStripeEvent(succeeded(50), { db, notify }), 'amount_mismatch')
  assert.equal(db.orders[0].status, 'pending')
  assert.match(db.orders[0].payment_issue, /Montant encaissé différent/)
  assert.equal(notify.paid.length, 0)
  // Mauvaise devise : même traitement
  const db2 = memoryWebhookDb([order()])
  assert.equal(await handleStripeEvent(succeeded(16899, { currency: 'usd' }), { db: db2, notify }), 'amount_mismatch')
})

test('paiement refusé puis réussi : la commande finit payée', async () => {
  const db = memoryWebhookDb([order()])
  const notify = notifier()
  const failed = { id: 'evt_f', type: 'payment_intent.payment_failed', data: { object: { id: 'pi_1', metadata: { orderId: ORDER_ID }, last_payment_error: { message: 'Carte refusée' } } } }
  assert.equal(await handleStripeEvent(failed, { db, notify }), 'failed')
  assert.equal(db.orders[0].status, 'failed')
  assert.equal(await handleStripeEvent(succeeded(), { db, notify }), 'paid')
  assert.equal(db.orders[0].status, 'paid')
})

test('un échec arrivé après la réussite ne repasse pas la commande en échec', async () => {
  const db = memoryWebhookDb([order({ status: 'paid' })])
  const failed = { id: 'evt_f2', type: 'payment_intent.payment_failed', data: { object: { id: 'pi_1', metadata: { orderId: ORDER_ID } } } }
  assert.equal(await handleStripeEvent(failed, { db, notify: notifier() }), 'ignored')
  assert.equal(db.orders[0].status, 'paid')
})

test('remboursement total : annulée ; partiel : noté dans l\'historique', async () => {
  const db = memoryWebhookDb([order({ status: 'paid' })])
  const partial = { id: 'evt_r1', type: 'charge.refunded', data: { object: { payment_intent: 'pi_1', amount: 16899, amount_refunded: 2000, refunded: false } } }
  assert.equal(await handleStripeEvent(partial, { db, notify: notifier() }), 'partial_refund')
  assert.equal(db.orders[0].status, 'paid')
  assert.match(db.history.at(-1).note, /partiel : 20,00 €/)
  const full = { id: 'evt_r2', type: 'charge.refunded', data: { object: { payment_intent: 'pi_1', amount: 16899, amount_refunded: 16899, refunded: true } } }
  assert.equal(await handleStripeEvent(full, { db, notify: notifier() }), 'refunded')
  assert.equal(db.orders[0].status, 'cancelled')
})

test('événements sans commande ou non gérés : ignorés sans erreur', async () => {
  const db = memoryWebhookDb([])
  const unknown = succeeded()
  unknown.data.object.metadata = { orderId: 'inconnue' }
  assert.equal(await handleStripeEvent(unknown, { db, notify: notifier() }), 'order_not_found')
  assert.equal(await handleStripeEvent({ id: 'evt_x', type: 'customer.created', data: { object: {} } }, { db, notify: notifier() }), 'ignored')
})
