// Serveur local pour le développement : simule les fonctions serveur Supabase avec exactement le même code
// (supabase/functions/_shared). Utilisé uniquement en développement, jamais déployé.
// Lancer : node dev-server.js, et dans .env : VITE_API_BASE=http://localhost:3001 (puis relancer Vite)
// Paiements en local : stripe listen --forward-to localhost:3001/functions/v1/stripe-webhook

import 'dotenv/config'
import express from 'express'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createOrUpdateOrder } from './supabase/functions/_shared/orderService.js'
import { supabaseOrderStore } from './supabase/functions/_shared/orderStore.js'
import { handleStripeEvent } from './supabase/functions/_shared/stripeEvents.js'
import { supabaseStripeStore } from './supabase/functions/_shared/stripeEventStore.js'
import { askAdvisor, AdvisorInputError } from './supabase/functions/_shared/advisor.js'

const app  = express()
const port = 3001

// Clé secrète Stripe (mode test) : sans elle, ni commande ni webhook en local
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
const MISSING_STRIPE = { error: 'STRIPE_SECRET_KEY manquant dans .env' }
// Base Supabase avec la clé de service (comme les fonctions en ligne) : commandes enregistrées pour de vrai
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null

// CORS pour Vite (localhost:5173)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// Webhook Stripe : corps brut, nécessaire pour vérifier la signature (déclaré avant express.json)
app.post('/functions/v1/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(500).json(MISSING_STRIPE)
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET ?? '')
  } catch (err) {
    console.error('Signature webhook invalide :', err.message)
    return res.status(400).json({ error: 'Signature invalide' })
  }
  if (!supabase) return res.status(500).json({ error: 'SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquants dans .env' })
  try {
    const result = await handleStripeEvent(event, {
      db: supabaseStripeStore(supabase),
      // En local, pas d'email ni de fichier : on l'indique seulement
      notify: { orderPaid: async orderId => console.log(`Commande ${orderId} payée (email et fichier non envoyés en local)`) },
    })
    console.log(`${event.type} ${event.id} → ${result}`)
    res.json({ received: true, result })
  } catch (err) {
    console.error(`Erreur sur ${event.type} :`, err)
    res.status(500).json({ error: 'Traitement impossible pour le moment' })
  }
})

app.use(express.json({ limit: '200kb' }))

// Passage en caisse : même calcul de prix et mêmes contrôles que la fonction create-order
app.post('/functions/v1/create-order', async (req, res) => {
  if (!stripe) return res.status(500).json(MISSING_STRIPE)
  if (!supabase) return res.status(500).json({ error: 'SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquants dans .env' })
  try {
    res.json(await createOrUpdateOrder(req.body, { db: supabaseOrderStore(supabase), stripe }))
  } catch (err) {
    if (err?.name === 'OrderError') {
      return res.status(err.code === 'already_paid' ? 409 : 400).json({ error: err.message, code: err.code ?? 'invalid' })
    }
    console.error(err)
    res.status(500).json({ error: 'Impossible de créer la commande pour le moment.' })
  }
})

// Conseiller : facultatif en local (SDK Anthropic à installer soi-même, clé dans .env)
app.post('/functions/v1/ai-advisor', async (req, res) => {
  let Anthropic
  try {
    ({ default: Anthropic } = await import('@anthropic-ai/sdk'))
  } catch {
    return res.status(501).json({
      error: 'Conseiller en local : installez le SDK (npm install -D @anthropic-ai/sdk) et renseignez ANTHROPIC_API_KEY dans .env.',
    })
  }
  try {
    const reply = await askAdvisor(req.body?.messages, { client: new Anthropic() })
    res.json({ reply })
  } catch (err) {
    if (err instanceof AdvisorInputError) return res.status(400).json({ error: err.message })
    console.error(err)
    res.status(502).json({ error: 'Le conseiller est indisponible pour le moment.' })
  }
})

app.listen(port, () => {
  console.log(`Fonctions serveur locales prêtes sur http://localhost:${port}`)
  if (!stripe) console.log('Attention : STRIPE_SECRET_KEY absent, aucun paiement possible en local.')
  if (!supabase) console.log('Attention : SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absents, les commandes ne peuvent pas être enregistrées.')
})
