import { Link } from 'react-router-dom'

export default function Checkout() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/" className="text-amber-400 font-bold text-xl block mb-8">
          LumiCut
        </Link>
        <h1 className="text-2xl font-bold mb-2">Finaliser la commande</h1>
        <p className="text-slate-400 mb-8 text-sm">
          Le paiement Stripe sera disponible prochainement.
        </p>
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center text-slate-400">
          <div className="text-5xl mb-4">🔒</div>
          <p>Intégration Stripe en cours de déploiement.</p>
          <Link
            to="/cart"
            className="inline-block mt-6 text-amber-400 hover:text-amber-300 text-sm"
          >
            ← Retour au panier
          </Link>
        </div>
      </div>
    </div>
  )
}
