import { motion } from 'framer-motion'
import { useConfiguratorStore } from '../../store/configuratorStore'

// Interrupteur de l'aperçu : panneau allumé ou éteint
export default function LightToggle() {
  const { lightOn, toggleLight } = useConfiguratorStore()

  return (
    <motion.button
      type="button"
      onClick={toggleLight}
      aria-pressed={lightOn}
      whileTap={{ scale: 0.95 }}
      className={`flex flex-shrink-0 items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border text-xs font-medium transition-colors ${
        lightOn
          ? 'border-amber-400/60 bg-amber-400/10 text-amber-300'
          : 'border-slate-700 bg-slate-800 text-slate-400'
      }`}
    >
      <span className={`relative w-8 h-4 rounded-full transition-colors duration-300 ${lightOn ? 'bg-amber-400' : 'bg-slate-600'}`}>
        <motion.span
          className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow"
          animate={{ left: lightOn ? '1.125rem' : '0.125rem' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </span>
      <span>{lightOn ? '💡 Allumé' : 'Éteint'}</span>
    </motion.button>
  )
}
