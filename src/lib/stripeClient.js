import { loadStripe } from '@stripe/stripe-js'

// Instance Stripe partagée (singleton)
export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? ''
)

// Crée un PaymentIntent via l'Edge Function Supabase (ou le dev-server local)
export async function createPaymentIntent({ amountCents, orderId }) {
  const base = import.meta.env.VITE_API_BASE ?? import.meta.env.VITE_SUPABASE_URL
  if (!base) throw new Error('VITE_SUPABASE_URL manquant')

  const res = await fetch(
    `${base}/functions/v1/create-payment-intent`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ amount: amountCents, currency: 'eur', metadata: { orderId } }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Erreur ${res.status}`)
  }

  return res.json() // { clientSecret, paymentIntentId }
}
