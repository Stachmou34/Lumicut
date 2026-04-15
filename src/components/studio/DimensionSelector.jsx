import { useConfiguratorStore } from '../../store/configuratorStore'
import { motion } from 'framer-motion'

const PRESETS = [
  { id: 'S',  label: 'S',  w: 40,  h: 20, price: 59 },
  { id: 'M',  label: 'M',  w: 60,  h: 30, price: 89,  popular: true },
  { id: 'L',  label: 'L',  w: 80,  h: 40, price: 129 },
  { id: 'XL', label: 'XL', w: 120, h: 60, price: 189 },
]

export default function DimensionSelector() {
  const { sizePreset, width, height, setSizePreset, setCustomSize } = useConfiguratorStore()

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dimensions</div>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map(p => (
          <motion.button
            key={p.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSizePreset(p.id, p.w, p.h)}
            className={`relative p-3 rounded-lg border-2 text-left transition-all ${
              sizePreset === p.id
                ? 'border-amber-400 bg-amber-400/5'
                : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'
            }`}
          >
            {p.popular && (
              <span className="absolute -top-2 right-2 bg-amber-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                Populaire
              </span>
            )}
            <div
              className={`text-lg font-bold ${
                sizePreset === p.id ? 'text-amber-400' : 'text-slate-200'
              }`}
            >
              {p.id}
            </div>
            <div className="text-xs text-slate-400">
              {p.w}×{p.h} cm
            </div>
            <div className="text-xs text-slate-300 mt-1">dès {p.price}€</div>
          </motion.button>
        ))}
      </div>

      {/* Custom size toggle */}
      <button
        onClick={() => setSizePreset('custom', width, height)}
        className={`p-2.5 rounded-lg border-2 text-left text-xs transition-all ${
          sizePreset === 'custom'
            ? 'border-amber-400 bg-amber-400/5'
            : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'
        }`}
      >
        <span
          className={sizePreset === 'custom' ? 'text-amber-400 font-semibold' : 'text-slate-400'}
        >
          Sur mesure (max 150×80 cm)
        </span>
      </button>

      {sizePreset === 'custom' && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-slate-400 block mb-1">Largeur (cm)</label>
            <input
              type="number"
              min={20}
              max={150}
              value={width}
              onChange={e => setCustomSize(Number(e.target.value), height)}
              className="w-full bg-slate-700 text-slate-200 text-sm rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-400 block mb-1">Hauteur (cm)</label>
            <input
              type="number"
              min={10}
              max={80}
              value={height}
              onChange={e => setCustomSize(width, Number(e.target.value))}
              className="w-full bg-slate-700 text-slate-200 text-sm rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      )}
    </div>
  )
}
