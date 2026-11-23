// Montants en euros à la française : « 89 € », « 79,99 € », « 1 029,50 € »
const WHOLE = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const CENTS = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })

// cents : toujours deux décimales (totaux), sinon seulement si le montant n'est pas rond
export function formatEuros(amount, { cents = false } = {}) {
  const value = Math.round((Number(amount) || 0) * 100) / 100
  return (cents || !Number.isInteger(value) ? CENTS : WHOLE).format(value)
}

// Supplément d'un choix : « Inclus » ou « +12,50 € »
export function formatSurcharge(amount) {
  return amount ? `+${formatEuros(amount)}` : 'Inclus'
}
