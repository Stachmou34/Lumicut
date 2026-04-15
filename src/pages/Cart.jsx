import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCartStore } from '../store/cartStore'
import { motifs } from '../motifs/index'

export default function Cart() {
  const { items, removeItem } = useCartStore()
  const total = items.reduce((s, i) => s + i.price, 0)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="text-amber-400 font-bold text-xl">
            LumiCut
          </Link>
          <Link
            to="/studio"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Continuer
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-6">Votre panier</h1>

        {items.length === 0 ? (
          <div className="text-center py-24 text-slate-500">
            <div className="text-5xl mb-4">🛒</div>
            <p>Votre panier est vide</p>
            <Link to="/studio" className="inline-block mt-6 text-amber-400 hover:text-amber-300">
              Créer un panneau →
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 mb-8">
              {items.map(item => {
                const motif = motifs.find(m => m.id === item.motifId)
                return (
                  <motion.div
                    key={item.id}
                    layout
                    className="flex gap-4 bg-slate-800 rounded-xl p-4 border border-slate-700"
                  >
                    <div
                      className="w-16 h-16 bg-white rounded-lg flex-shrink-0 overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: motif?.svg || '' }}
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-200">
                        {motif?.name || item.motifId}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {item.sizePreset !== 'custom' ? item.sizePreset + ' — ' : ''}
                        {item.width}×{item.height} cm • {item.material} • LED {item.ledType}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-bold text-white">{item.price.toFixed(2)}€</span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-400">Total</span>
                <span className="text-2xl font-bold">{total.toFixed(2)}€</span>
              </div>
              {total >= 89 && (
                <div className="text-xs text-emerald-400 mb-4">✓ Livraison offerte</div>
              )}
              <Link
                to="/checkout"
                className="block w-full py-3 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-lg text-center transition-colors"
              >
                Commander →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
