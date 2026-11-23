// Accès à la base pour le webhook Stripe (client Supabase avec la clé de service)
const ORDER_FIELDS = 'id, status, price_ttc, payment_intent_id, customer_email'

export function supabaseStripeStore(supabase) {
  return {
    // 'new' : premier passage ; 'retry' : déjà reçu mais pas terminé ; 'done' : déjà traité
    async claimEvent(id, type) {
      const { error } = await supabase.from('stripe_events').insert({ id, type })
      if (!error) return 'new'
      if (error.code !== '23505') throw error
      const { data, error: readError } = await supabase.from('stripe_events').select('processed_at').eq('id', id).single()
      if (readError) throw readError
      return data.processed_at ? 'done' : 'retry'
    },
    async markEventProcessed(id, result) {
      const { error } = await supabase
        .from('stripe_events')
        .update({ processed_at: new Date().toISOString(), result })
        .eq('id', id)
      if (error) throw error
    },
    async getOrder(id) {
      const { data, error } = await supabase.from('orders').select(ORDER_FIELDS).eq('id', id).maybeSingle()
      // Identifiant mal formé dans les métadonnées : pas de commande
      if (error?.code === '22P02') return null
      if (error) throw error
      return data
    },
    async findOrderByPaymentIntent(intentId) {
      const { data, error } = await supabase
        .from('orders')
        .select(ORDER_FIELDS)
        .eq('payment_intent_id', intentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
    // Changement de statut (seulement depuis les statuts « from »), note d'historique, alerte éventuelle.
    // Renvoie la commande modifiée, ou null si elle n'était pas dans un statut de départ autorisé.
    async orderEvent(orderId, { to = null, from = null, note = null, issue = null, paymentIntentId = null }) {
      const { data, error } = await supabase.rpc('order_event', {
        p_order_id: orderId,
        p_to: to,
        p_from: from,
        p_note: note,
        p_issue: issue,
        p_payment_intent: paymentIntentId,
      })
      if (error) throw error
      return Array.isArray(data) ? (data[0] ?? null) : data
    },
  }
}
