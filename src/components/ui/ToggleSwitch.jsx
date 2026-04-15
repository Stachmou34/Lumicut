import { motion } from 'framer-motion'
import { useConfiguratorStore } from '../../store/configuratorStore'

export default function LightToggle() {
  const { lightOn, toggleLight } = useConfiguratorStore()

  return (
    <motion.button
      onClick={toggleLight}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-full border-2 transition-all font-semibold text-sm ${
        lightOn
          ? 'border-amber-400 bg-amber-400/10 text-amber-400'
          : 'border-slate-600 bg-slate-800 text-slate-400'
      }`}
      whileTap={{ scale: 0.95 }}
    >
      {/* Toggle pill */}
      <div
        className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${
          lightOn ? 'bg-amber-400' : 'bg-slate-600'
        }`}
      >
        <motion.div
          layout
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
          animate={{ left: lightOn ? '1.25rem' : '0.125rem' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
      <span>{lightOn ? '💡 Allumé' : '○ Éteint'}</span>
    </motion.button>
  )
}
