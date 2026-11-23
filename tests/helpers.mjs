// Doublures pour tester les fonctions serveur sans Supabase ni Stripe
import { randomUUID } from 'node:crypto'

// Design encodé comme le fait le studio (base64 du JSON en UTF-8)
export const design = data => Buffer.from(JSON.stringify(data), 'utf8').toString('base64')

export const PANEL_M = { sizePreset: 'M', width: 60, height: 30, material: 'acrylic-black', lightModel: 'standard', ledPreset: 'warm', motifId: 'lib:coq', textContent: 'Léa', showText: true }
export const PANEL_XL_HUE = { sizePreset: 'XL', width: 120, height: 60, material: 'birch-plywood', lightModel: 'hue-omniglow', ledMode: 'gradient', giftWrap: true }

export const CUSTOMER = {
  firstName: 'Léa', lastName: 'Martin', email: 'Lea.Martin@example.fr', phone: '06 12 34 56 78',
  address1: '12 rue des Lilas', address2: '', postalCode: '34000', city: 'Montpellier', country: 'FR',
}

// Table orders en mémoire, avec les mêmes garanties que la base (checkout unique, mise à jour si non payée)
export function memoryOrders() {
  const rows = []
  const pick = r => ({ id: r.id, status: r.status, payment_intent_id: r.payment_intent_id ?? null })
  return {
    rows,
    async findByCheckoutId(id) {
      const r = rows.find(x => x.checkout_id === id)
      return r ? pick(r) : null
    },
    async insert(row) {
      if (rows.some(x => x.checkout_id === row.checkout_id)) return null
      const r = { id: randomUUID(), created_at: new Date().toISOString(), ...row }
      rows.push(r)
      return pick(r)
    },
    async updateIfOpen(id, patch) {
      const r = rows.find(x => x.id === id)
      if (!r || !['pending', 'failed'].includes(r.status)) return null
      Object.assign(r, patch)
      return pick(r)
    },
  }
}

// Stripe en mémoire : paiements créés, relus, modifiés
export function fakeStripe() {
  const intents = new Map()
  const calls = []
  let n = 0
  return {
    intents,
    calls,
    paymentIntents: {
      async create(params, options) {
        calls.push({ op: 'create', params, options })
        const id = `pi_test_${++n}`
        const intent = { id, client_secret: `${id}_secret_x`, status: 'requires_payment_method', ...params }
        intents.set(id, intent)
        return { ...intent }
      },
      async retrieve(id) {
        calls.push({ op: 'retrieve', id })
        return { ...intents.get(id) }
      },
      async update(id, params) {
        calls.push({ op: 'update', id, params })
        Object.assign(intents.get(id), params)
        return { ...intents.get(id) }
      },
    },
  }
}

// Base du webhook en mémoire : événements traités, commandes, transitions de statut
export function memoryWebhookDb(orders = []) {
  const events = new Map()
  const history = []
  const db = {
    orders,
    events,
    history,
    async claimEvent(id, type) {
      const e = events.get(id)
      if (!e) {
        events.set(id, { type, processed: false })
        return 'new'
      }
      return e.processed ? 'done' : 'retry'
    },
    async markEventProcessed(id, result) {
      Object.assign(events.get(id), { processed: true, result })
    },
    async getOrder(id) {
      return orders.find(o => o.id === id) ?? null
    },
    async findOrderByPaymentIntent(pi) {
      return orders.find(o => o.payment_intent_id === pi) ?? null
    },
    async orderEvent(orderId, { to = null, from = null, note = null, issue = null, paymentIntentId = null }) {
      const o = orders.find(x => x.id === orderId)
      if (!o || (from && !from.includes(o.status))) return null
      if (to) o.status = to
      if (issue) o.payment_issue = issue
      if (paymentIntentId) o.payment_intent_id = paymentIntentId
      history.push({ orderId, status: o.status, note })
      return { ...o }
    },
  }
  return db
}
