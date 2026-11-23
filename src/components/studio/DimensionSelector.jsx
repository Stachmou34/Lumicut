import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useConfiguratorStore } from '../../store/configuratorStore'
import { SIZE_BASE, computePrice } from '../../lib/computePrice'
import { SIZE_PRESETS, CUSTOM_LIMITS } from '../../lib/sizes'
import { formatEuros } from '../../lib/formatEuros'
import { OptionCard } from './StepUI'
import SizeComparator from './SizeComparator'

// Rectangle à l'échelle du format (le plus grand sur-mesure remplit la case) : on compare les tailles d'un coup d'œil
function SizeIcon({ width, height, active }) {
  const scale = 52 / CUSTOM_LIMITS.width[1]
  return (
    <span className="w-14 h-8 flex-shrink-0 grid place-items-center">
      <span
        className={`block rounded-[3px] border ${active ? 'border-amber-300 bg-amber-300/20' : 'border-slate-400 bg-slate-400/10'}`}
        style={{ width: Math.max(8, width * scale), height: Math.max(5, height * scale) }}
      />
    </span>
  )
}

// Champ de dimension : saisie libre, puis ramenée dans les limites en quittant le champ (ou Entrée)
function NumberField({ label, value, min, max, onCommit }) {
  const [draft, setDraft] = useState(String(value))
  // Valeur changée ailleurs (format choisi, lien partagé) : le champ suit
  useEffect(() => { setDraft(String(value)) }, [value])
  const commit = () => {
    // Champ vidé : on garde la valeur précédente
    if (draft.trim() !== '') onCommit(draft)
    setDraft(String(value))
  }
  const outOfRange = draft !== '' && (Number(draft) < min || Number(draft) > max)
  return (
    <label className="flex-1 flex flex-col gap-1">
      <span className="text-sm text-slate-400">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
        aria-invalid={outOfRange}
        className={`w-full bg-slate-800 text-slate-100 text-base lg:text-sm rounded-xl px-3 py-2.5 border focus:outline-none ${outOfRange ? 'border-amber-500' : 'border-slate-600 focus:border-amber-400'}`}
      />
      <span className={`text-xs ${outOfRange ? 'text-amber-400' : 'text-slate-500'}`}>De {min} à {max} cm</span>
    </label>
  )
}

// Étape « Format » : quatre formats standard ou sur-mesure, et comparaison avec une silhouette
export default function DimensionSelector() {
  const state = useConfiguratorStore()
  const { sizePreset, width, height, setSizePreset, setCustomSize } = state
  const [showComparator, setShowComparator] = useState(false)
  const custom = sizePreset === 'custom'

  return (
    <div className="flex flex-col gap-3">
      {SIZE_PRESETS.map(p => (
        <OptionCard
          key={p.id}
          active={sizePreset === p.id}
          onClick={() => setSizePreset(p.id, p.width, p.height)}
          leading={<SizeIcon width={p.width} height={p.height} active={sizePreset === p.id} />}
          title={`${p.id} · ${p.width} × ${p.height} cm`}
          subtitle={p.hint}
          aside={formatEuros(SIZE_BASE[p.id])}
        />
      ))}

      <OptionCard
        active={custom}
        onClick={() => setSizePreset('custom', width, height)}
        leading={<SizeIcon width={custom ? width : 100} height={custom ? height : 45} active={custom} />}
        title="Sur mesure"
        subtitle={`Jusqu’à ${CUSTOM_LIMITS.width[1]} × ${CUSTOM_LIMITS.height[1]} cm, prix selon la surface`}
        aside={custom ? formatEuros(computePrice(state).base) : null}
      />

      {custom && (
        <div className="flex gap-3">
          <NumberField label="Largeur (cm)" value={width} min={CUSTOM_LIMITS.width[0]} max={CUSTOM_LIMITS.width[1]} onCommit={v => setCustomSize(v, height)} />
          <NumberField label="Hauteur (cm)" value={height} min={CUSTOM_LIMITS.height[0]} max={CUSTOM_LIMITS.height[1]} onCommit={v => setCustomSize(width, v)} />
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowComparator(v => !v)}
        aria-expanded={showComparator}
        className="self-start mt-2 text-sm text-amber-400 hover:text-amber-300 hover:underline"
      >
        Comparer avec une silhouette {showComparator ? '▴' : '▾'}
      </button>
      <AnimatePresence initial={false}>
        {showComparator && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <SizeComparator />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
