import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'

// Délai max d'attente du statut "paid" : 30 s
const POLL_INTERVAL  = 2500
const POLL_MAX_TRIES = 12

export default function OrderConfirmation() {
  const [params]    = useSearchParams()
  const orderId     = params.get('order_id')
  const [status, setStatus]   = useState('loading') // loading | paid | pending | error
  const [order, setOrder]     = useState(null)

  useEffect(() => {
    if (!orderId || !supabase) {
      // Pas de Supabase ou pas d'ID → on affiche quand même la confirmation
      setStatus('paid')
      return
    }

    let tries = 0

    async function poll() {
      tries++
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, status, customer_name, customer_email, price_ttc, created_at')
          .eq('id', orderId)
          .single()

        if (error) throw error

        setOrder(data)

        if (data.status === 'paid') {
          setStatus('paid')
          return
        }

        // Toujours en "pending" : on continue à poller
        if (tries < POLL_MAX_TRIES) {
          setTimeout(poll, POLL_INTERVAL)
        } else {
          // Timeout : on affiche quand même la page de succès (le webhook peut arriver après)
          setStatus('pending')
        }
      } catch {
        setStatus('error')
      }
    }

    poll()
  }, [orderId])

  // Affichage conditionnel selon statut
  const isSuccess = status === 'paid' || status === 'pending'

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      {status === 'loading' ? (
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="w-10 h-10 border-2 border-slate-600 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-sm">Confirmation en cours…</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="text-center max-w-lg w-full"
        >
          {status === 'error' ? (
            <>
              <div className="text-6xl mb-6">⚠️</div>
              <h1 className="text-2xl font-bold mb-3">Une erreur est survenue</h1>
              <p className="text-slate-400 mb-8 text-sm">
                Impossible de vérifier le statut de votre commande.
                Si vous avez été débité, contactez-nous.
              </p>
            </>
          ) : (
            <>
              {/* Halo animé */}
              <div className="relative inline-flex mb-8">
                <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-2xl scale-150" />
                <div className="relative w-24 h-24 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-5xl">
                  ✨
                </div>
              </div>

              <h1 className="text-3xl font-bold mb-3">
                {status === 'paid' ? 'Commande confirmée !' : 'Commande reçue !'}
              </h1>

              {order && (
                <p className="text-slate-400 text-sm mb-2">
                  Commande #{order.id?.slice(0, 8).toUpperCase()} ·{' '}
                  <span className="text-white font-semibold">
                    {Number(order.price_ttc).toFixed(2)} €
                  </span>
                </p>
              )}

              <p className="text-slate-400 mb-2 text-sm">
                Merci pour votre commande. Un email de confirmation a été envoyé.
              </p>
              <p className="text-slate-400 mb-8 text-sm">
                Livraison estimée sous{' '}
                <span className="text-amber-400 font-semibold">7 jours ouvrables</span>.
              </p>

              {status === 'pending' && (
                <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-3 mb-6 text-xs text-amber-300">
                  Le paiement est en cours de traitement. Vous recevrez une confirmation par email.
                </div>
              )}
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-block bg-amber-400 hover:bg-amber-300 text-black font-bold px-8 py-3 rounded-full transition-colors"
            >
              Retour à l'accueil
            </Link>
            <Link
              to="/studio"
              className="inline-block border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-medium px-8 py-3 rounded-full transition-colors"
            >
              Créer un autre panneau
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  )
}
