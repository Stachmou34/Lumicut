import { useConfiguratorStore } from '../../store/configuratorStore'
import { motion } from 'framer-motion'

const MATERIALS = [
  { id: 'acrylic-black',  label: 'Acrylique noir mat',  color: '#111',    surcharge: 0, popular: true },
  { id: 'acrylic-white',  label: 'Acrylique blanc',      color: '#f0f0f0', surcharge: 0 },
  { id: 'acrylic-smoked', label: 'Acrylique fumé',       color: '#1a1a3a', surcharge: 10 },
  { id: 'birch-plywood',  label: 'Contreplaqué bouleau', color: '#c8a97a', surcharge: 5 },
  { id: 'mdf-black',      label: 'MDF peint noir',       color: '#1a1a1a', surcharge: 5 },
]

export default function MaterialSelector() {
  const { material, setMaterial } = useConfiguratorStore()

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Matériau</div>
      <div className="flex flex-col gap-2">
        {MATERIALS.map(m => (
          <motion.button
            key={m.id}
            whileTap={{ scale: 0.99 }}
            onClick={() => setMaterial(m.id)}
            className={`flex items-center gap-3 p-2.5 rounded-lg border-2 transition-all ${
              material === m.id
                ? 'border-amber-400 bg-amber-400/5'
                : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
            }`}
          >
            <div
              className="w-8 h-8 rounded flex-shrink-0 border border-slate-600"
              style={{ background: m.color }}
            />
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-medium ${
                    material === m.id ? 'text-amber-400' : 'text-slate-200'
                  }`}
                >
                  {m.label}
                </span>
                {m.popular && (
                  <span className="text-[10px] bg-amber-400 text-black px-1.5 py-0.5 rounded-full font-bold">
                    ★
                  </span>
                )}
              </div>
            </div>
            <div className="text-xs text-slate-400">
              {m.surcharge > 0 ? `+${m.surcharge}€` : 'incl.'}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
