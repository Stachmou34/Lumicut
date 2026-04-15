import { useConfiguratorStore } from '../../store/configuratorStore'
import { motion } from 'framer-motion'

const INSPIRATIONS = [
  { motif: 'Arbre de vie + prénom en dessous', example: 'Arbre de vie + "Emma"', emoji: '🌳' },
  { motif: 'Mandala + date au centre',          example: 'Mandala + "14.02.2024"', emoji: '✨' },
  { motif: 'Cerf + citation en haut',           example: 'Cerf + "Vis l\'instant"', emoji: '🦌' },
]

export default function MotifTextComposer() {
  const {
    showText, setShowText, setTextContent, setTextPosition, setMotifId, textContent, textPosition
  } = useConfiguratorStore()

  const applyInspiration = (insp, i) => {
    const motifMap = { 0: 'arbre-de-vie', 1: 'mandala', 2: 'cerf' }
    const posMap   = { 0: 'bottom', 1: 'center', 2: 'top' }
    setMotifId(motifMap[i])
    setShowText(true)
    setTextPosition(posMap[i])
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Compositions suggérées</div>

      <div className="flex flex-col gap-2">
        {INSPIRATIONS.map((insp, i) => (
          <button
            key={i}
            onClick={() => applyInspiration(insp, i)}
            className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 hover:border-amber-400/30 text-left transition-all group"
          >
            <span className="text-2xl flex-shrink-0">{insp.emoji}</span>
            <div className="flex-1">
              <div className="text-xs text-slate-300 group-hover:text-amber-400 transition-colors font-medium">{insp.motif}</div>
              <div className="text-xs text-slate-500 mt-0.5 italic">ex: {insp.example}</div>
            </div>
            <span className="text-amber-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </button>
        ))}
      </div>

      {showText && textContent && (
        <div className="bg-slate-800/50 rounded-lg p-2.5 text-xs text-slate-400 flex items-center gap-2">
          <span className="text-emerald-400">✓</span>
          Texte "{textContent}" positionné en {textPosition === 'top' ? 'haut' : textPosition === 'bottom' ? 'bas' : 'centre'}
        </div>
      )}
    </div>
  )
}
