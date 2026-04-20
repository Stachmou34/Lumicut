import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '../store/cartStore'
import Header from '../components/shared/Header'
import Footer from '../components/shared/Footer'

function CartItem({ item, onRemove, onQuantity }) {
  const { config, price, quantity, previewSVG } = item
  const label = [
    config.sizePreset !== 'custom' ? config.sizePreset : null,
    `${config.width}×${config.height} cm`,
    config.material?.replace(/-/g, ' '),
  ].filter(Boolean).join(' · ')

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex gap-4 bg-slate-800/60 border border-slate-700 rounded-xl p-4"
    >
      {/* Thumbnail */}
      <div className="w-20 h-12 bg-slate-900 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center border border-slate-700">
        {previewSVG ? (
          <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: previewSVG }} />
        ) : (
          <span className="text-2xl">✨</span>
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-200 text-sm truncate">
          {config.motif?.name ?? 'Panneau personnalisé'}
        </div>
        <div className="text-xs text-slate-500 mt-0.5 truncate">{label}</div>
        <div className="flex items-center gap-1 mt-2">
          <button
            onClick={() => onQuantity(item.id, quantity - 1)}
            className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
          >−</button>
          <span className="w-6 text-center text-sm text-slate-200">{quantity}</span>
          <button
            onClick={() => onQuantity(item.id, quantity + 1)}
            className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
          >+</button>
        </div>
      </div>

      {/* Prix + supprimer */}
      <div className="flex flex-col items-end justify-between flex-shrink-0">
        <span className="font-bold text-white">{(price * quantity).toFixed(2)} €</span>
        <button
          onClick={() => onRemove(item.id)}
          className="text-xs text-slate-600 hover:text-red-400 transition-colors"
        >
          Supprimer
        </button>
      </div>
    </motion.div>
  )
}

export default function Cart() {
  const { items, removeItem, updateQuantity, getTotal } = useCartStore()
  const total = getTotal()

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />

      <div className="max-w-2xl mx-auto px-6 pt-28 pb-20">
        <h1 className="text-2xl font-bold mb-8">Votre panier</h1>

        {items.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-slate-400 mb-6">Votre panier est vide</p>
            <Link
              to="/studio"
              className="inline-block bg-amber-400 hover:bg-amber-300 text-black font-bold px-8 py-3 rounded-full transition-colors"
            >
              Créer mon panneau →
            </Link>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="flex flex-col gap-3 mb-8">
              <AnimatePresence>
                {items.map(item => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onRemove={removeItem}
                    onQuantity={updateQuantity}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Résumé */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 flex flex-col gap-4">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Sous-total</span>
                <span className="text-slate-200">{total.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>Livraison</span>
                <span className={total >= 89 ? 'text-emerald-400 font-medium' : 'text-slate-200'}>
                  {total >= 89 ? 'Offerte 🎉' : 'Calculée au checkout'}
                </span>
              </div>
              {total < 89 && (
                <div className="text-xs text-slate-500 bg-slate-700/40 rounded-lg px-3 py-2">
                  Livraison offerte dès 89 € — il vous manque{' '}
                  <span className="text-amber-400 font-semibold">{(89 - total).toFixed(2)} €</span>
                </div>
              )}
              <div className="border-t border-slate-700 pt-4 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-bold">{total.toFixed(2)} €</span>
              </div>
              <Link
                to="/checkout"
                className="block w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-xl text-center transition-all hover:scale-[1.01]"
              >
                Passer commande →
              </Link>
              <Link to="/studio" className="text-center text-xs text-slate-500 hover:text-slate-300 transition-colors">
                ← Continuer mes achats
              </Link>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}
