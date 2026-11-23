// Traitement des événements Stripe reçus par le webhook :
// - une commande ne passe « payée » que si le montant encaissé est exactement celui calculé à la commande ;
// - un événement rejoué par Stripe n'est traité qu'une fois (table stripe_events) ;
// - échecs de paiement et remboursements mis à jour, chaque changement noté dans l'historique.
// Indépendant de l'environnement (Deno, Node, tests) : la base et les notifications sont passées en paramètre.

const PAYABLE = ['pending', 'failed']
const REFUNDABLE = ['pending', 'failed', 'paid', 'in_production', 'shipped', 'delivered']

const euros = cents => `${(cents / 100).toFixed(2).replace('.', ',')} €`

// Commande visée par un paiement : celle indiquée par le serveur à la création, sinon par numéro de paiement
async function orderOf(intent, db) {
  const orderId = intent?.metadata?.orderId
  if (orderId) {
    const order = await db.getOrder(orderId)
    if (order) return order
  }
  return intent?.id ? db.findOrderByPaymentIntent(intent.id) : null
}

async function paymentSucceeded(intent, { db, notify }) {
  const order = await orderOf(intent, db)
  if (!order) return 'order_not_found'

  const expected = Math.round(Number(order.price_ttc) * 100)
  const received = intent.amount_received ?? intent.amount
  if (received !== expected || intent.currency !== 'eur') {
    // Jamais « payée » sur un montant différent : l'atelier ne produit pas, l'admin vérifie
    await db.orderEvent(order.id, {
      note: `Paiement de ${euros(received)} (${intent.currency}) reçu pour ${euros(expected)} attendus`,
      issue: 'Montant encaissé différent du montant de la commande : vérifier avant de produire',
      paymentIntentId: intent.id,
    })
    return 'amount_mismatch'
  }

  const updated = await db.orderEvent(order.id, {
    to: 'paid',
    from: PAYABLE,
    note: `Paiement reçu : ${euros(received)}`,
    paymentIntentId: intent.id,
  })
  // Déjà payée (événement rejoué ou reçu en double) : ni email ni fichier une seconde fois
  if (!updated) return 'already_paid'
  await notify.orderPaid(order.id)
  return 'paid'
}

async function paymentFailed(intent, { db }) {
  const order = await orderOf(intent, db)
  if (!order) return 'order_not_found'
  const reason = intent.last_payment_error?.message
  const updated = await db.orderEvent(order.id, {
    to: 'failed',
    from: ['pending'],
    note: reason ? `Paiement refusé : ${reason}` : 'Paiement refusé',
  })
  return updated ? 'failed' : 'ignored'
}

async function chargeRefunded(charge, { db }) {
  const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
  const order = intentId ? await db.findOrderByPaymentIntent(intentId) : null
  if (!order) return 'order_not_found'
  const full = charge.refunded === true || charge.amount_refunded >= charge.amount
  if (full) {
    const updated = await db.orderEvent(order.id, {
      to: 'cancelled',
      from: REFUNDABLE,
      note: `Remboursée : ${euros(charge.amount_refunded)}`,
    })
    return updated ? 'refunded' : 'ignored'
  }
  await db.orderEvent(order.id, { note: `Remboursement partiel : ${euros(charge.amount_refunded)}` })
  return 'partial_refund'
}

const HANDLERS = {
  'payment_intent.succeeded': (e, deps) => paymentSucceeded(e.data.object, deps),
  'payment_intent.payment_failed': (e, deps) => paymentFailed(e.data.object, deps),
  'charge.refunded': (e, deps) => chargeRefunded(e.data.object, deps),
}

// Point d'entrée du webhook (signature déjà vérifiée). Renvoie le résultat du traitement.
// Une erreur levée ici fait répondre 500 : Stripe renverra l'événement plus tard.
export async function handleStripeEvent(event, { db, notify }) {
  const handler = HANDLERS[event.type]
  if (!handler) return 'ignored'
  // Événement déjà traité : Stripe le renvoie parfois (réseau, délai), on ne refait rien
  const claim = await db.claimEvent(event.id, event.type)
  if (claim === 'done') return 'duplicate'
  const result = await handler(event, { db, notify })
  await db.markEventProcessed(event.id, result)
  return result
}
