import { useState, useMemo, forwardRef } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '../store/cartStore'
import { shippingLabel } from '../lib/shippingCalc'
import { quoteOrder } from '../lib/orderPricing'
import { materialLabel } from '../lib/materials'
import { createOrder, orderItemsFromCart, rememberOrder, resetCheckoutId } from '../lib/createOrder'
import { stripePromise } from '../lib/stripeClient'
import Header from '../components/shared/Header'

// ─── Validation Zod ────────────────────────────────────────────────────────
const addressSchema = z.object({
  firstName:  z.string().min(2, 'Prénom requis'),
  lastName:   z.string().min(2, 'Nom requis'),
  email:      z.string().email('Email invalide'),
  phone:      z.string().optional().or(z.literal('')),
  address1:   z.string().min(5, 'Adresse requise'),
  address2:   z.string().optional().or(z.literal('')),
  postalCode: z.string().min(4, 'Code postal requis'),
  city:       z.string().min(2, 'Ville requise'),
  country:    z.string().min(2, 'Pays requis'),
})

// ─── Indicateur d'étapes ────────────────────────────────────────────────────
const STEPS = ['Coordonnées', 'Récapitulatif', 'Paiement']

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((label, i) => {
        const step = i + 1
        const done    = step < current
        const active  = step === current
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                  done   ? 'bg-emerald-500 text-white' :
                  active ? 'bg-amber-400 text-black'   :
                           'bg-slate-700 text-slate-400',
                ].join(' ')}
              >
                {done ? '✓' : step}
              </div>
              <span className={[
                'text-[11px] mt-1 whitespace-nowrap',
                active ? 'text-white' : 'text-slate-500',
              ].join(' ')}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={[
                'w-16 h-px mb-5 mx-1',
                done ? 'bg-emerald-500' : 'bg-slate-700',
              ].join(' ')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Champ formulaire réutilisable ──────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

// ─── Champ input avec ref forwarding (requis pour react-hook-form) ──────────
const Input = forwardRef(function Input({ className = '', ...props }, ref) {
  return (
    <input
      ref={ref}
      className={[
        'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white',
        'placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors',
        className,
      ].join(' ')}
      {...props}
    />
  )
})

// ─── Étape 1 : Coordonnées ──────────────────────────────────────────────────
function StepAddress({ onNext }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      firstName: '', lastName: '', email: '', phone: '',
      address1: '', address2: '', postalCode: '', city: '', country: 'FR',
    },
  })

  return (
    <motion.form
      key="step-address"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onSubmit={handleSubmit(onNext)}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Prénom *" error={errors.firstName?.message}>
          <Input placeholder="Jean" {...register('firstName')} />
        </Field>
        <Field label="Nom *" error={errors.lastName?.message}>
          <Input placeholder="Dupont" {...register('lastName')} />
        </Field>
      </div>

      <Field label="Email *" error={errors.email?.message}>
        <Input type="email" placeholder="jean@exemple.fr" {...register('email')} />
      </Field>

      <Field label="Téléphone" error={errors.phone?.message}>
        <Input type="tel" placeholder="+33 6 12 34 56 78" {...register('phone')} />
      </Field>

      <Field label="Adresse *" error={errors.address1?.message}>
        <Input placeholder="12 rue de la Paix" {...register('address1')} />
      </Field>

      <Field label="Complément d'adresse" error={errors.address2?.message}>
        <Input placeholder="Appartement, étage…" {...register('address2')} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Code postal *" error={errors.postalCode?.message}>
          <Input placeholder="75001" {...register('postalCode')} />
        </Field>
        <Field label="Ville *" error={errors.city?.message}>
          <Input placeholder="Paris" {...register('city')} />
        </Field>
      </div>

      <Field label="Pays *" error={errors.country?.message}>
        <select
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
          {...register('country')}
          defaultValue="FR"
        >
          <option value="FR">France</option>
          <option value="BE">Belgique</option>
          <option value="LU">Luxembourg</option>
          <option value="MC">Monaco</option>
          <option value="CH">Suisse</option>
          <option value="OTHER">Autre pays</option>
        </select>
      </Field>

      <button
        type="submit"
        className="mt-2 w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-xl transition-colors"
      >
        Continuer →
      </button>
    </motion.form>
  )
}

// ─── Étape 2 : Récapitulatif + frais de port ────────────────────────────────
// Les prix affichés sont recalculés avec le même code que le serveur ; c'est le serveur qui fixe le montant payé.
function StepRecap({ customer, onBack, onNext }) {
  const items     = useCartStore(s => s.items)
  const clearCart = useCartStore(s => s.clearCart)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const { quote, quoteError } = useMemo(() => {
    try {
      return { quote: quoteOrder({ items: orderItemsFromCart(items), country: customer.country }), quoteError: null }
    } catch (err) {
      return { quote: null, quoteError: err.message }
    }
  }, [items, customer.country])

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      const order = await createOrder({ customer, items })
      onNext(order)
    } catch (err) {
      if (err.code === 'already_paid') {
        // Paiement déjà abouti (autre onglet, retour arrière) : la commande est enregistrée
        clearCart()
        resetCheckoutId()
        setError('Cette commande a déjà été payée : vous allez recevoir un email de confirmation.')
      } else {
        setError(err.message ?? 'Erreur lors de la création de la commande')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      key="step-recap"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-6"
    >
      {/* Adresse de livraison */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-semibold text-slate-200">
              {customer.firstName} {customer.lastName}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {customer.address1}{customer.address2 ? `, ${customer.address2}` : ''}
            </p>
            <p className="text-xs text-slate-400">
              {customer.postalCode} {customer.city} — {customer.country}
            </p>
            <p className="text-xs text-slate-400">{customer.email}</p>
          </div>
          <button
            onClick={onBack}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            Modifier
          </button>
        </div>
      </div>

      {/* Articles */}
      <div className="flex flex-col gap-2">
        {items.map((item, i) => {
          const line = quote?.lines[i]
          return (
            <div
              key={item.id}
              className="flex justify-between items-center bg-slate-800/40 rounded-lg px-4 py-3 border border-slate-700/60"
            >
              <div>
                <p className="text-sm text-slate-200">
                  {item.config.motif?.name ?? 'Panneau personnalisé'}
                </p>
                <p className="text-xs text-slate-500">
                  {line ? `${line.panel.width}×${line.panel.height} cm` : `${item.config.width}×${item.config.height} cm`} ·{' '}
                  {materialLabel(item.config.material)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  {line ? `${line.lineTotal.toFixed(2)} €` : '—'}
                </p>
                {item.quantity > 1 && (
                  <p className="text-xs text-slate-500">×{item.quantity}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Totaux */}
      {quote && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Sous-total</span>
            <span className="text-slate-200">{quote.subtotal.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm text-slate-400">
            <span>Livraison</span>
            <span className={quote.shipping === 0 ? 'text-emerald-400 font-medium' : 'text-slate-200'}>
              {shippingLabel(quote.shipping)}
            </span>
          </div>
          <div className="border-t border-slate-700 pt-3 flex justify-between">
            <span className="font-semibold">Total TTC</span>
            <span className="text-xl font-bold">{quote.total.toFixed(2)} €</span>
          </div>
        </div>
      )}

      {quoteError && (
        <div className="text-amber-300 text-sm bg-amber-400/10 border border-amber-400/20 rounded-lg p-3">
          {quoteError}{' '}
          <Link to="/cart" className="underline">Revoir le panier</Link>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm text-center bg-red-400/10 rounded-lg p-3">{error}</p>
      )}

      <button
        onClick={handleConfirm}
        disabled={loading || !quote}
        className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-bold rounded-xl transition-colors"
      >
        {loading ? 'Création de la commande…' : 'Procéder au paiement →'}
      </button>

      <button
        onClick={onBack}
        className="text-center text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        ← Modifier mes coordonnées
      </button>
    </motion.div>
  )
}

// ─── Formulaire Stripe (interne à <Elements>) ───────────────────────────────
function PaymentForm({ order, email }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  async function handlePay(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    // Résumé pour la page de confirmation (le panier n'est vidé qu'une fois le paiement confirmé)
    rememberOrder({ orderId: order.orderId, total: order.total, email })

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order-confirmation?order_id=${order.orderId}`,
      },
    })

    // On n'arrive ici qu'en cas d'erreur immédiate (carte refusée, champ invalide…) : sinon, redirection
    setError(confirmError?.message ?? 'Le paiement n\'a pas pu aboutir.')
    setLoading(false)
  }

  return (
    <form onSubmit={handlePay} className="flex flex-col gap-5">
      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <p className="text-red-400 text-sm bg-red-400/10 rounded-lg p-3">{error}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            Paiement en cours…
          </>
        ) : (
          `🔒 Payer ${order.total.toFixed(2)} €`
        )}
      </button>

      <p className="text-center text-xs text-slate-600">
        Paiement sécurisé par Stripe. Vos données bancaires ne transitent pas par LumiCut.
      </p>
    </form>
  )
}

// ─── Étape 3 : Paiement Stripe ──────────────────────────────────────────────
// Montant et paiement viennent du serveur (fonction create-order) : rien n'est calculé ici.
function StepPayment({ order, email, onBack }) {
  const stripeOptions = {
    clientSecret: order.clientSecret,
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary:    '#fbbf24',
        colorBackground: '#1e293b',
        colorText:       '#f8fafc',
        borderRadius:    '8px',
      },
    },
  }

  return (
    <motion.div
      key="step-payment"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-6"
    >
      {/* Montant à payer */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">Montant total</span>
          <span className="text-2xl font-bold text-white">{order.total.toFixed(2)} €</span>
        </div>
        <p className="text-xs text-slate-500">
          Commande n° {order.orderId.slice(0, 8).toUpperCase()} · dont livraison {shippingLabel(order.shipping)}
        </p>
      </div>

      <Elements key={order.clientSecret} stripe={stripePromise} options={stripeOptions}>
        <PaymentForm order={order} email={email} />
      </Elements>

      <button
        onClick={onBack}
        className="text-center text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        ← Retour au récapitulatif
      </button>
    </motion.div>
  )
}

// ─── Page Checkout ──────────────────────────────────────────────────────────
export default function Checkout() {
  const items       = useCartStore(s => s.items)
  const [step, setStep]         = useState(1)
  const [customer, setCustomer] = useState(null)
  const [order, setOrder]       = useState(null)

  // Panier vide → retour au panier
  if (items.length === 0 && step === 1) {
    return <Navigate to="/cart" replace />
  }

  function handleAddressNext(data) {
    setCustomer(data)
    setStep(2)
  }

  function handleRecapNext(createdOrder) {
    setOrder(createdOrder)
    setStep(3)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />

      <div className="max-w-xl mx-auto px-6 pt-28 pb-20">
        {/* Logo / Titre */}
        <div className="mb-8 text-center">
          <Link to="/" className="text-amber-400 font-black text-xl tracking-tight">
            LumiCut
          </Link>
          <h1 className="text-2xl font-bold mt-2">Finaliser la commande</h1>
        </div>

        <StepIndicator current={step} />

        <AnimatePresence mode="wait">
          {step === 1 && (
            <StepAddress key="step-1" onNext={handleAddressNext} />
          )}
          {step === 2 && customer && (
            <StepRecap
              key="step-2"
              customer={customer}
              onBack={() => setStep(1)}
              onNext={handleRecapNext}
            />
          )}
          {step === 3 && order && (
            <StepPayment
              key="step-3"
              order={order}
              email={customer?.email}
              onBack={() => setStep(2)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
