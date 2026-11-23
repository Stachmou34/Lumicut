// Edge Function Supabase — Envoi en batch des demandes d'avis J+10
// Déploiement : supabase functions deploy send-review-requests --no-verify-jwt (l'accès est vérifié ici)
// Appelée chaque jour par pg_cron avec la clé de service (voir la fin de supabase/schema.sql) :
// la clé publique du site ne suffit pas, personne d'autre ne peut déclencher l'envoi.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'
import { sameSecret } from '../_shared/http.js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

Deno.serve(async (req) => {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!sameSecret(token, SERVICE_KEY)) {
    return Response.json({ error: 'Accès refusé' }, { status: 401 })
  }

  try {
    // Commandes livrées depuis 10 jours sans demande d'avis encore envoyée
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, customer_email')
      .eq('status', 'delivered')
      .lte('updated_at', tenDaysAgo)

    if (error) throw error

    if (!orders?.length) {
      return Response.json({ sent: 0, message: 'Aucune commande éligible' })
    }

    // Filtrer celles qui n'ont pas encore reçu la demande d'avis
    const { data: alreadySent } = await supabase
      .from('email_logs')
      .select('order_id')
      .eq('email_type', 'review_request')
      .in('order_id', orders.map(o => o.id))

    const sentIds = new Set((alreadySent ?? []).map((r: any) => r.order_id))
    const eligible = orders.filter(o => !sentIds.has(o.id))

    let sent = 0
    for (const order of eligible) {
      await fetch(`${SUPABASE_URL}/functions/v1/send-order-email`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ orderId: order.id, type: 'review_request' }),
      })
      sent++
    }

    console.log(`Demandes d'avis envoyées : ${sent}/${orders.length}`)
    return Response.json({ sent, total: orders.length })

  } catch (err) {
    console.error('send-review-requests error:', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Erreur' }, { status: 500 })
  }
})
