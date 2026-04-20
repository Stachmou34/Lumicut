// Edge Function Supabase — Création d'un PaymentIntent Stripe
// Déploiement : supabase functions deploy create-payment-intent

import Stripe from 'https://esm.sh/stripe@14?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Pré-vol CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, currency = 'eur', metadata = {} } = await req.json()

    if (!amount || typeof amount !== 'number' || amount < 50) {
      return new Response(
        JSON.stringify({ error: 'Montant invalide (minimum 0,50 €)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    })

    return new Response(
      JSON.stringify({
        clientSecret:    paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('create-payment-intent error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
