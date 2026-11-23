// Calcul des frais de livraison (utilisé par le site et par le serveur : voir orderPricing.js)

const BASE_RATES = { FR: 8, BE: 12, LU: 12, MC: 8, CH: 18 }
// Livraison offerte en France à partir de ce montant
export const FREE_SHIPPING_FR = 89
// Supplément grand format : un panneau dont un côté atteint 80 cm (dimensions en cm)
const LARGE_FORMAT_CM = 80
const LARGE_FORMAT_SUPPLEMENT = 5

export function calculateShipping(items, country, total) {
  if (country === 'FR' && total >= FREE_SHIPPING_FR) return 0

  const maxDim = Math.max(0, ...items.flatMap(i => [
    i.config?.width ?? 0,
    i.config?.height ?? 0,
  ]))
  const sizeSupplement = maxDim >= LARGE_FORMAT_CM ? LARGE_FORMAT_SUPPLEMENT : 0

  return (BASE_RATES[country] ?? 20) + sizeSupplement
}

export function shippingLabel(amount) {
  return amount === 0 ? 'Offerte' : `${amount.toFixed(2)} €`
}
