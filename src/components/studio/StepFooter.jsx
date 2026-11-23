import { motion, AnimatePresence } from 'framer-motion'
import { useConfiguratorStore } from '../../store/configuratorStore'
import { computePrice } from '../../lib/computePrice'
import { nextStep, prevStep } from '../../lib/studioSteps'
import { formatEuros } from '../../lib/formatEuros'
import { useAddToCart } from '../../lib/useAddToCart'

// Bas du panneau, toujours visible : prix à jour, retour, étape suivante ou ajout au panier
export default function StepFooter({ step, onStep }) {
  const config = useConfiguratorStore()
  const { total, freeShipping } = computePrice(config)
  const next = nextStep(step)
  const prev = prevStep(step)
  const addToCart = useAddToCart()

  return (
    <div className="flex-shrink-0 border-t border-slate-800 bg-slate-900 px-4 lg:px-7 py-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={total}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 6, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-xl font-semibold tabular-nums text-white whitespace-nowrap"
            >
              {formatEuros(total, { cents: true })}
            </motion.span>
          </AnimatePresence>
          <span className="text-xs text-slate-400">TTC</span>
        </div>
        <div className="text-xs text-slate-400 truncate">
          {freeShipping ? 'Port offert en France' : 'Hors frais de port'}
        </div>
      </div>

      {prev && (
        <button
          type="button"
          onClick={() => onStep(prev.id)}
          aria-label={`Étape précédente : ${prev.label}`}
          title={`Étape précédente : ${prev.label}`}
          className="w-11 h-11 flex-shrink-0 rounded-full border border-slate-600 text-slate-200 text-lg hover:border-slate-400 hover:bg-slate-800 transition-colors"
        >
          ‹
        </button>
      )}

      {next ? (
        <button
          type="button"
          onClick={() => onStep(next.id)}
          className="h-11 flex-shrink-0 px-5 rounded-full bg-amber-400 hover:bg-amber-300 text-black text-sm font-semibold transition-colors"
        >
          Suivant<span className="hidden sm:inline"> : {next.label}</span> ›
        </button>
      ) : (
        <button
          type="button"
          onClick={addToCart}
          className="h-11 flex-shrink-0 px-5 rounded-full bg-amber-400 hover:bg-amber-300 text-black text-sm font-semibold transition-colors"
        >
          Ajouter au panier
        </button>
      )}
    </div>
  )
}
