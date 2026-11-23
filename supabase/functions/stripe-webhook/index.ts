// Fonction serveur « stripe-webhook » : reçoit les événements de paiement envoyés par Stripe.
// Déploiement : supabase functions deploy stripe-webhook --no-verify-jwt (Stripe n'a pas de jeton Supabase :
// l'authenticité de chaque appel est vérifiée par la signature Stripe).
// Événements à cocher dans Stripe : payment_intent.succeeded, payment_intent.payment_failed, charge.refunded
// Secrets : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'
import { handleStripeEvent } from '../_shared/stripeEvents.js'
import { supabaseStripeStore } from '../_shared/stripeEventStore.js'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// Appel d'une autre fonction serveur, authentifié par la clé de service
function callFunction(name: string, body: unknown) {
  return fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify(body),
  })
    .then(async (res) => {
      if (!res.ok) console.error(`${name} : ${res.status} ${await res.text()}`)
    })
    .catch((err) => console.error(`${name} :`, err))
}

// Travail poursuivi après la réponse à Stripe : la fonction reste active jusqu'à la fin
function inBackground(promise: Promise<unknown>) {
  // deno-lint-ignore no-explicit-any
  const runtime = (globalThis as any).EdgeRuntime
  if (runtime?.waitUntil) runtime.waitUntil(promise)
}

const notify = {
  // Commande payée : email de confirmation et fichier de découpe (l'email n'est envoyé qu'une fois par type)
  orderPaid(orderId: string) {
    inBackground(Promise.all([
      callFunction('send-order-email', { orderId, type: 'confirmation' }),
      callFunction('generate-order-dxf', { orderId }),
    ]))
  },
}

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature') ?? ''
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '')
  } catch (err) {
    console.error('Signature webhook invalide :', err)
    return Response.json({ error: 'Signature invalide' }, { status: 400 })
  }

  try {
    const result = await handleStripeEvent(event, { db: supabaseStripeStore(supabase), notify })
    console.log(`${event.type} ${event.id} → ${result}`)
    return Response.json({ received: true, result })
  } catch (err) {
    // Réponse 500 : Stripe renverra l'événement plus tard
    console.error(`Erreur sur ${event.type} ${event.id} :`, err)
    return Response.json({ error: 'Traitement impossible pour le moment' }, { status: 500 })
  }
})
