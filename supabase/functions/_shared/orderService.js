// Création d'une commande et de son paiement, sans faire confiance au navigateur :
// - le prix de chaque panneau et la livraison sont recalculés à partir des configurations ;
// - tous les articles du panier sont enregistrés ;
// - un même passage en caisse (checkoutId) ne crée qu'une commande et qu'un paiement Stripe,
//   même après des allers-retours entre le récapitulatif et le paiement.
// Indépendant de l'environnement : la fonction Supabase (Deno) et dev-server.js (Node) lui passent
// leur accès à la base (db) et leur client Stripe ; les tests lui passent des doublures.
import { quoteOrder, workshopItem, OrderError, COUNTRIES } from './lumicut.js'

const CHECKOUT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/
const PHONE = /^[0-9+().\s-]{6,25}$/
// Statuts où la commande peut encore être modifiée puis payée
export const OPEN_STATUSES = ['pending', 'failed']

function orderError(message, code = 'invalid') {
  const err = new OrderError(message)
  err.code = code
  return err
}

// Texte saisi par le client : espaces normalisés, caractères de contrôle retirés, longueur bornée
function field(value, label, { min = 0, max = 120 } = {}) {
  const text = typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim() : ''
  if (text.length < min) throw orderError(`${label} manquant ou trop court`)
  if (text.length > max) throw orderError(`${label} trop long (${max} caractères au maximum)`)
  return text
}

// Coordonnées du client, vérifiées comme le formulaire du site
export function validateCustomer(c) {
  if (!c || typeof c !== 'object') throw orderError('Coordonnées manquantes')
  const customer = {
    firstName: field(c.firstName, 'Prénom', { min: 2, max: 60 }),
    lastName: field(c.lastName, 'Nom', { min: 2, max: 60 }),
    email: field(c.email, 'Email', { min: 6, max: 254 }).toLowerCase(),
    phone: field(c.phone, 'Téléphone', { max: 25 }),
    address1: field(c.address1, 'Adresse', { min: 5, max: 120 }),
    address2: field(c.address2, 'Complément d\'adresse', { max: 120 }),
    postalCode: field(c.postalCode, 'Code postal', { min: 4, max: 12 }),
    city: field(c.city, 'Ville', { min: 2, max: 80 }),
    country: field(c.country, 'Pays', { min: 2, max: 5 }).toUpperCase(),
  }
  if (!EMAIL.test(customer.email)) throw orderError('Email invalide')
  if (customer.phone && !PHONE.test(customer.phone)) throw orderError('Téléphone invalide')
  if (!COUNTRIES.includes(customer.country)) throw orderError('Pays de livraison non desservi')
  return customer
}

// Ligne de la table orders : tous les articles, plus un résumé du premier au format lu par l'admin
export function buildOrderRow({ checkoutId, customer, quote, items }) {
  const lines = quote.lines.map((line, i) => workshopItem(line, items[i]?.motifName))
  const first = lines[0]
  return {
    checkout_id: checkoutId,
    customer_name: `${customer.firstName} ${customer.lastName}`,
    customer_email: customer.email,
    customer_phone: customer.phone || null,
    customer_address: {
      line1: customer.address1,
      line2: customer.address2,
      postal_code: customer.postalCode,
      city: customer.city,
      country: customer.country,
    },
    items: lines,
    config: {
      motif: first.motifId,
      motif_name: first.motifName,
      size: `${first.width}×${first.height} cm`,
      material: first.material,
      led: first.design.ledColor ?? null,
      lighting: first.lighting,
      dimmer: first.options.dimmer,
      gift_wrap: first.options.giftWrap,
      engraving: first.options.engraving,
      design: first.design,
      items_count: lines.reduce((n, l) => n + l.quantity, 0),
    },
    subtotal: quote.subtotal,
    shipping_cost: quote.shipping,
    price_ttc: quote.total,
    price_ht: quote.priceHt,
    currency: 'EUR',
  }
}

// Petite empreinte (FNV-1a) pour la clé d'idempotence Stripe, sans y mettre l'email en clair
function fingerprint(text) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16)
}

// Point d'entrée : input = { checkoutId, customer, items: [{ design, quantity, motifName }] }.
// Renvoie de quoi afficher et payer : numéro de commande, montant calculé ici, secret du paiement Stripe.
export async function createOrUpdateOrder(input, { db, stripe, now = () => new Date() }) {
  const checkoutId = input?.checkoutId
  if (typeof checkoutId !== 'string' || !CHECKOUT_ID.test(checkoutId)) {
    throw orderError('Session de paiement invalide : rechargez la page')
  }
  const customer = validateCustomer(input?.customer)
  const items = Array.isArray(input?.items) ? input.items : []
  const quote = quoteOrder({ items, country: customer.country })
  const row = buildOrderRow({ checkoutId, customer, quote, items })

  // Une seule commande par passage en caisse : on la met à jour tant qu'elle n'est pas payée
  let order = await db.findByCheckoutId(checkoutId)
  if (!order) {
    order = await db.insert({ ...row, status: 'pending', status_history: [{ status: 'pending', timestamp: now().toISOString() }] })
    // Requête concurrente (double clic) : la commande vient d'être créée par l'autre requête
    if (!order) order = await db.findByCheckoutId(checkoutId)
  }
  if (!order) throw new Error('Commande introuvable après création')
  if (!OPEN_STATUSES.includes(order.status)) throw orderError('Cette commande est déjà payée.', 'already_paid')
  // Mise à jour seulement si elle n'a pas été payée entre-temps (condition vérifiée par la base)
  order = await db.updateIfOpen(order.id, { ...row, status: 'pending' })
  if (!order) throw orderError('Cette commande est déjà payée.', 'already_paid')

  // Un seul paiement Stripe par commande, toujours au montant calculé ici
  const metadata = { orderId: order.id, checkoutId }
  let intent = null
  if (order.payment_intent_id) {
    intent = await stripe.paymentIntents.retrieve(order.payment_intent_id)
    if (intent.status === 'succeeded' || intent.status === 'processing') {
      throw orderError('Cette commande est déjà payée.', 'already_paid')
    }
    if (intent.status === 'canceled') {
      intent = null
    } else if (intent.amount !== quote.totalCents || intent.currency !== 'eur') {
      intent = await stripe.paymentIntents.update(intent.id, { amount: quote.totalCents, metadata, receipt_email: customer.email })
    }
  }
  if (!intent) {
    intent = await stripe.paymentIntents.create(
      {
        amount: quote.totalCents,
        currency: 'eur',
        metadata,
        receipt_email: customer.email,
        description: `Commande LumiCut ${order.id.slice(0, 8).toUpperCase()}`,
        automatic_payment_methods: { enabled: true },
      },
      // Même commande, même montant, même email ⇒ même paiement, même en cas de requêtes simultanées
      { idempotencyKey: `lumicut-${order.id}-${quote.totalCents}-${fingerprint(customer.email)}` },
    )
    order = await db.updateIfOpen(order.id, { payment_intent_id: intent.id })
    if (!order) throw orderError('Cette commande est déjà payée.', 'already_paid')
  }

  return {
    orderId: order.id,
    clientSecret: intent.client_secret,
    amountCents: quote.totalCents,
    currency: 'eur',
    subtotal: quote.subtotal,
    shipping: quote.shipping,
    total: quote.total,
    items: row.items.map(i => ({
      motifName: i.motifName,
      sizePreset: i.sizePreset,
      width: i.width,
      height: i.height,
      material: i.material,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    })),
  }
}
