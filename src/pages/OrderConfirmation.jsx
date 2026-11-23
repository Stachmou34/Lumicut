import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCartStore } from '../store/cartStore'
import { stripePromise } from '../lib/stripeClient'
import { lastOrder, resetCheckoutId } from '../lib/createOrder'

// État réel du paiement, lu chez Stripe avec le secret transmis dans l'adresse de retour.
// Le panier n'est vidé que si le paiement a abouti (ou est en cours de traitement par la banque).
function paymentState(status) {
  if (status === 'succeeded') return 'succeeded'
  if (status === 'processing') return 'processing'
  if (status === 'requires_payment_method' || status === 'canceled') return 'failed'
  return 'incomplete'
}

const euros = v => `${Number(v).toFixed(2).replace('.', ',')} €`

function Halo({ children, tone = 'amber' }) {
  const ring = tone === 'red' ? 'bg-red-400/10 border-red-400/30' : 'bg-amber-400/10 border-amber-400/30'
  return (
    <div className="relative inline-flex mb-8">
      <div className={`absolute inset-0 rounded-full blur-2xl scale-150 ${tone === 'red' ? 'bg-red-400/20' : 'bg-amber-400/20'}`} />
      <div className={`relative w-24 h-24 rounded-full border flex items-center justify-center text-5xl ${ring}`}>
        {children}
      </div>
    </div>
  )
}

export default function OrderConfirmation() {
  const [params]   = useSearchParams()
  const orderId    = params.get('order_id')
  const secret     = params.get('payment_intent_client_secret')
  const [state, setState]   = useState(orderId && secret ? 'loading' : 'none')
  const [amount, setAmount] = useState(null)
  const clearCart  = useCartStore(s => s.clearCart)
  const summary    = orderId ? lastOrder(orderId) : null
  const shortId    = orderId?.slice(0, 8).toUpperCase()

  useEffect(() => {
    if (!orderId || !secret) return
    let cancelled = false
    ;(async () => {
      try {
        const stripe = await stripePromise
        if (!stripe) throw new Error('Stripe indisponible')
        const { paymentIntent, error } = await stripe.retrievePaymentIntent(secret)
        if (error || !paymentIntent) throw error ?? new Error('Paiement introuvable')
        if (cancelled) return
        const next = paymentState(paymentIntent.status)
        setAmount(paymentIntent.amount / 100)
        setState(next)
        if (next === 'succeeded' || next === 'processing') {
          clearCart()
          resetCheckoutId()
        }
      } catch {
        if (!cancelled) setState('error')
      }
    })()
    return () => { cancelled = true }
  }, [orderId, secret, clearCart])

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="w-10 h-10 border-2 border-slate-600 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-sm">Vérification du paiement…</p>
        </div>
      </div>
    )
  }

  const paid = state === 'succeeded' || state === 'processing'

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="text-center max-w-lg w-full"
      >
        {state === 'succeeded' && (
          <>
            <Halo>✨</Halo>
            <h1 className="text-3xl font-bold mb-3">Commande confirmée !</h1>
            <p className="text-slate-400 text-sm mb-2">
              Commande n° {shortId}
              {amount != null && <> · <span className="text-white font-semibold">{euros(amount)}</span> payés</>}
            </p>
            <p className="text-slate-400 mb-2 text-sm">
              Merci ! Un email de confirmation va vous être envoyé{summary?.email ? <> à <span className="text-slate-200">{summary.email}</span></> : null}.
            </p>
            <p className="text-slate-400 mb-8 text-sm">
              Livraison estimée sous <span className="text-amber-400 font-semibold">7 jours ouvrables</span>.
            </p>
          </>
        )}

        {state === 'processing' && (
          <>
            <Halo>⏳</Halo>
            <h1 className="text-3xl font-bold mb-3">Paiement en cours de traitement</h1>
            <p className="text-slate-400 text-sm mb-2">Commande n° {shortId}</p>
            <p className="text-slate-400 mb-8 text-sm">
              Votre banque finalise le paiement. Vous recevrez un email dès qu’il sera confirmé : inutile de repasser commande.
            </p>
          </>
        )}

        {(state === 'failed' || state === 'incomplete') && (
          <>
            <Halo tone="red">⚠️</Halo>
            <h1 className="text-3xl font-bold mb-3">
              {state === 'failed' ? 'Paiement refusé' : 'Paiement non terminé'}
            </h1>
            <p className="text-slate-400 mb-8 text-sm">
              Vous n’avez pas été débité. Votre panier est conservé : vous pouvez réessayer, avec la même carte ou une autre.
            </p>
          </>
        )}

        {state === 'error' && (
          <>
            <Halo tone="red">⚠️</Halo>
            <h1 className="text-2xl font-bold mb-3">Impossible de vérifier le paiement</h1>
            <p className="text-slate-400 mb-8 text-sm">
              Si le paiement a abouti, vous recevrez un email de confirmation{shortId ? ` pour la commande n° ${shortId}` : ''}.
              Sinon, votre panier est conservé et vous pouvez réessayer.
            </p>
          </>
        )}

        {state === 'none' && (
          <>
            <Halo>🛒</Halo>
            <h1 className="text-2xl font-bold mb-3">Aucune commande à afficher</h1>
            <p className="text-slate-400 mb-8 text-sm">
              Cette page s’affiche après un paiement. Votre panier vous attend si vous n’avez pas terminé votre commande.
            </p>
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {paid ? (
            <Link
              to="/"
              className="inline-block bg-amber-400 hover:bg-amber-300 text-black font-bold px-8 py-3 rounded-full transition-colors"
            >
              Retour à l'accueil
            </Link>
          ) : (
            <Link
              to={state === 'none' ? '/cart' : '/checkout'}
              className="inline-block bg-amber-400 hover:bg-amber-300 text-black font-bold px-8 py-3 rounded-full transition-colors"
            >
              {state === 'none' ? 'Voir mon panier' : 'Réessayer le paiement'}
            </Link>
          )}
          <Link
            to="/studio"
            className="inline-block border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-medium px-8 py-3 rounded-full transition-colors"
          >
            {paid ? 'Créer un autre panneau' : 'Retour au studio'}
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
