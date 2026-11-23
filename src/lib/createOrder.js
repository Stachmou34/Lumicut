import { callFunction } from './serverApi'

// Passage en caisse : identifiant gardé pendant la session, pour qu'un aller-retour entre le récapitulatif
// et le paiement retrouve la même commande et le même paiement au lieu d'en créer de nouveaux.
const CHECKOUT_KEY = 'lumicut_checkout_id'
const LAST_ORDER_KEY = 'lumicut_last_order'

function storage() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

// UUID v4 (crypto.randomUUID n'existe qu'en HTTPS ou sur localhost : repli sur getRandomValues)
function newUuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export function getCheckoutId() {
  const store = storage()
  let id = store?.getItem(CHECKOUT_KEY)
  if (!id) {
    id = newUuid()
    store?.setItem(CHECKOUT_KEY, id)
  }
  return id
}

// Après un paiement abouti : le prochain passage en caisse sera une nouvelle commande
export function resetCheckoutId() {
  storage()?.removeItem(CHECKOUT_KEY)
}

// Articles envoyés au serveur : seulement les configurations (jamais de prix, il les recalcule)
export function orderItemsFromCart(items) {
  return items.map(item => ({
    design: item.config?.design ?? null,
    quantity: item.quantity,
    motifName: item.config?.motif?.name ?? null,
  }))
}

// Crée ou met à jour la commande côté serveur ; renvoie numéro, montant calculé et secret de paiement Stripe
export async function createOrder({ customer, items }) {
  return callFunction('create-order', {
    checkoutId: getCheckoutId(),
    customer,
    items: orderItemsFromCart(items),
  })
}

// Résumé gardé pour la page de confirmation (même onglet), le temps du passage chez la banque
export function rememberOrder(summary) {
  storage()?.setItem(LAST_ORDER_KEY, JSON.stringify(summary))
}

export function lastOrder(orderId) {
  try {
    const data = JSON.parse(storage()?.getItem(LAST_ORDER_KEY) ?? 'null')
    return data?.orderId === orderId ? data : null
  } catch {
    return null
  }
}
