// Calcul des frais de livraison

const BASE_RATES = { FR: 8, BE: 12, LU: 12, MC: 8, CH: 18 }

export function calculateShipping(items, country, total) {
  if (country === 'FR' && total >= 89) return 0

  const maxDim = Math.max(...items.flatMap(i => [
    i.config?.width ?? 0,
    i.config?.height ?? 0,
  ]))
  const sizeSupplement = maxDim >= 800 ? 5 : 0

  return (BASE_RATES[country] ?? 20) + sizeSupplement
}

export function shippingLabel(amount) {
  return amount === 0 ? 'Offerte' : `${amount.toFixed(2)} €`
}
