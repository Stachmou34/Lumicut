// Serveur Express local pour le dev — simule l'Edge Function Supabase
// Utilisé uniquement en développement, jamais déployé en prod
// Lancer avec : node dev-server.js

import 'dotenv/config'
import express from 'express'
import Stripe from 'stripe'

const app  = express()
const port = 3001

app.use(express.json())

// CORS pour Vite (localhost:5173)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

app.post('/functions/v1/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'eur', metadata = {} } = req.body

    if (!amount || amount < 50) {
      return res.status(400).json({ error: 'Montant invalide' })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    })

    res.json({
      clientSecret:    paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.listen(port, () => {
  console.log(`Dev server Stripe prêt sur http://localhost:${port}`)
})
