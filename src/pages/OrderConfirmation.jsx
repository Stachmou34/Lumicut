import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function OrderConfirmation() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-lg"
      >
        <div className="text-7xl mb-6">✨</div>
        <h1 className="text-3xl font-bold mb-4">Commande confirmée !</h1>
        <p className="text-slate-400 mb-2">Merci pour votre commande. Nous l'avons bien reçue.</p>
        <p className="text-slate-400 mb-8">
          Livraison estimée sous{' '}
          <span className="text-amber-400 font-semibold">7 jours ouvrables</span>.
        </p>
        <Link
          to="/"
          className="inline-block bg-amber-400 hover:bg-amber-300 text-black font-bold px-8 py-3 rounded-full transition-colors"
        >
          Retour à l'accueil
        </Link>
      </motion.div>
    </div>
  )
}
