// Wrapper pour appeler l'Edge Function send-order-email depuis le dashboard admin

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Envoie un email transactionnel via l'Edge Function Supabase
 * @param {string} orderId
 * @param {'confirmation'|'production'|'shipped'|'review_request'|'referral_reward'} type
 * @param {object} extraData — données supplémentaires selon le type (ex: tracking pour "shipped")
 */
export async function sendOrderEmail(orderId, type, extraData = {}) {
  if (!SUPABASE_URL) throw new Error('VITE_SUPABASE_URL manquant')

  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-order-email`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ orderId, type, extraData }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`)
  return data
}
