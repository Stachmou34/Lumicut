import { supabase } from './supabaseClient'
import { callFunction } from './serverApi'

// Envoi d'un email transactionnel depuis l'admin, via la fonction serveur send-order-email.
// La fonction n'accepte que les administrateurs connectés (et les autres fonctions serveur).
/**
 * @param {string} orderId
 * @param {'confirmation'|'production'|'shipped'|'review_request'|'referral_reward'} type
 * @param {object} extraData — données supplémentaires selon le type (ex: tracking pour "shipped")
 */
export async function sendOrderEmail(orderId, type, extraData = {}) {
  const { data } = (await supabase?.auth.getSession()) ?? { data: null }
  const token = data?.session?.access_token
  if (!token) throw new Error('Connectez-vous à l\'admin pour envoyer un email.')
  return callFunction('send-order-email', { orderId, type, extraData }, { token })
}
