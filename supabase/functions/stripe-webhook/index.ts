// Edge Function Supabase — Webhook Stripe
// Déploiement : supabase functions deploy stripe-webhook
// Événements Stripe à configurer : payment_intent.succeeded, payment_intent.payment_failed

import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body      = await req.text()
  const secret    = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature ?? '', secret)
  } catch (err) {
    console.error('Signature webhook invalide:', err)
    return new Response(JSON.stringify({ error: 'Signature invalide' }), { status: 400 })
  }

  switch (event.type) {

    case 'payment_intent.succeeded': {
      const pi      = event.data.object as Stripe.PaymentIntent
      const orderId = pi.metadata?.orderId

      if (!orderId) {
        console.warn('payment_intent.succeeded sans orderId dans metadata')
        break
      }

      // 1. Mettre à jour le statut de la commande
      const { error } = await supabase
        .from('orders')
        .update({
          status:             'paid',
          paid_at:            new Date().toISOString(),
          stripe_payment_id:  pi.id,
        })
        .eq('id', orderId)

      if (error) {
        console.error('Erreur MAJ commande:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      }

      console.log(`Commande ${orderId} marquée comme payée`)

      // 2. Email de confirmation (fire-and-forget)
      fetch(`${SUPABASE_URL}/functions/v1/send-order-email`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
        body:    JSON.stringify({ orderId, type: 'confirmation' }),
      }).catch(err => console.error('Erreur envoi email confirmation:', err))

      // 3. Génération DXF (fire-and-forget)
      fetch(`${SUPABASE_URL}/functions/v1/generate-order-dxf`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
        body:    JSON.stringify({ orderId }),
      }).catch(err => console.error('Erreur génération DXF:', err))

      break
    }

    case 'payment_intent.payment_failed': {
      const pi      = event.data.object as Stripe.PaymentIntent
      const orderId = pi.metadata?.orderId

      if (orderId) {
        await supabase
          .from('orders')
          .update({ status: 'failed' })
          .eq('id', orderId)
        console.log(`Commande ${orderId} marquée comme échouée`)
      }
      break
    }

    default:
      console.log(`Événement ignoré : ${event.type}`)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
