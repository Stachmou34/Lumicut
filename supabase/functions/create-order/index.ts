// Fonction serveur « create-order » : crée (ou met à jour) la commande et son paiement Stripe.
// Le navigateur n'envoie que les configurations des panneaux et les coordonnées : le prix est recalculé ici.
// Déploiement : supabase functions deploy create-order --no-verify-jwt
// Secrets : STRIPE_SECRET_KEY (SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis par Supabase)

import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'
import { createOrUpdateOrder } from '../_shared/orderService.js'
import { supabaseOrderStore } from '../_shared/orderStore.js'
import { corsHeaders, json, clientKey, underRateLimit } from '../_shared/http.js'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  try {
    // 20 passages en caisse par tranche de 10 minutes et par adresse IP
    if (!(await underRateLimit(supabase, `order:${await clientKey(req)}`, 20, 600))) {
      return json({ error: 'Trop de tentatives : réessayez dans quelques minutes.' }, 429)
    }
    const input = await req.json().catch(() => null)
    const result = await createOrUpdateOrder(input, { db: supabaseOrderStore(supabase), stripe })
    return json(result)
  } catch (err) {
    if (err?.name === 'OrderError') {
      return json({ error: err.message, code: err.code ?? 'invalid' }, err.code === 'already_paid' ? 409 : 400)
    }
    console.error('create-order :', err)
    return json({ error: 'Impossible de créer la commande pour le moment. Réessayez dans un instant.' }, 500)
  }
})
