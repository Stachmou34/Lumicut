import { loadStripe } from '@stripe/stripe-js'

// Instance Stripe partagée (null si la clé publique n'est pas configurée)
const KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
export const stripePromise = KEY ? loadStripe(KEY) : Promise.resolve(null)
