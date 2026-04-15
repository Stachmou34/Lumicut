import { useState } from 'react'
import { motion } from 'framer-motion'
import { useConfiguratorStore, LED_PRESETS } from '../../store/configuratorStore'

export default function LedColorPicker() {
  const { ledPreset, ledColor, setLedPreset, setLedColor } = useConfiguratorStore()
  const [showCustom, setShowCustom] = useState(ledPreset === 'custom')

  const handlePreset = (p) => {
    setLedPreset(p.id)
    setShowCustom(p.id === 'custom')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Couleur LED</div>

      {/* Swatch grid */}
      <div className="grid grid-cols-4 gap-2">
        {LED_PRESETS.filter(p => p.id !== 'custom').map(p => (
          <motion.button
            key={p.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => handlePreset(p)}
            title={p.label}
            className={`relative w-full aspect-square rounded-lg border-2 transition-all overflow-hidden ${ledPreset === p.id ? 'border-white scale-105' : 'border-transparent hover:border-slate-500'}`}
            style={{ background: p.color }}
          >
            {ledPreset === p.id && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white shadow-lg" />
              </div>
            )}
            {/* Glow effect on swatch */}
            <div
              className="absolute inset-0 opacity-60"
              style={{ boxShadow: `inset 0 0 8px ${p.color}` }}
            />
          </motion.button>
        ))}
      </div>

      {/* Color labels row */}
      <div className="text-xs text-slate-500 text-center">
        {LED_PRESETS.find(p => p.id === ledPreset)?.label || 'Personnalisé'}
      </div>

      {/* Custom color picker */}
      <button
        onClick={() => { setShowCustom(!showCustom); if (!showCustom) setLedPreset('custom') }}
        className={`text-xs transition-colors ${showCustom || ledPreset === 'custom' ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
      >
        🎨 Couleur personnalisée...
      </button>

      {(showCustom || ledPreset === 'custom') && (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={ledColor}
            onChange={e => setLedColor(e.target.value)}
            className="w-10 h-10 rounded-lg border border-slate-600 bg-transparent cursor-pointer"
          />
          <div className="flex-1">
            <input
              type="text"
              value={ledColor}
              onChange={e => {
                const v = e.target.value
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setLedColor(v)
              }}
              className="w-full bg-slate-700 text-slate-200 text-xs font-mono rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-amber-400"
              placeholder="#ffffff"
            />
          </div>
          {/* Live glow preview */}
          <div
            className="w-8 h-8 rounded-full flex-shrink-0"
            style={{
              background: ledColor,
              boxShadow: `0 0 12px 3px ${ledColor}`,
            }}
          />
        </div>
      )}
    </div>
  )
}
