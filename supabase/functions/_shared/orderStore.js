// Accès à la table orders pour orderService, avec un client Supabase utilisant la clé de service
import { OPEN_STATUSES } from './orderService.js'

const RETURNING = 'id, status, payment_intent_id'

export function supabaseOrderStore(supabase) {
  return {
    async findByCheckoutId(checkoutId) {
      const { data, error } = await supabase.from('orders').select(RETURNING).eq('checkout_id', checkoutId).maybeSingle()
      if (error) throw error
      return data
    },
    // null si une requête simultanée a déjà créé la commande de ce passage en caisse
    async insert(row) {
      const { data, error } = await supabase.from('orders').insert(row).select(RETURNING).single()
      if (error?.code === '23505') return null
      if (error) throw error
      return data
    },
    // Modifie la commande seulement si elle n'est pas payée ; null sinon
    async updateIfOpen(id, patch) {
      const { data, error } = await supabase
        .from('orders')
        .update(patch)
        .eq('id', id)
        .in('status', OPEN_STATUSES)
        .select(RETURNING)
        .maybeSingle()
      if (error) throw error
      return data
    },
  }
}
