import { motion } from 'framer-motion'
import { useConfiguratorStore } from '../../store/configuratorStore'

// Human silhouette is ~170cm tall, ~50cm wide
const HUMAN_HEIGHT_CM = 170
const HUMAN_WIDTH_CM = 48

const SIZE_BADGES = {
  S: 'Idéal bureau',
  M: 'Parfait salon',
  L: 'Impact maximum',
  XL: 'Format statement',
}

export default function SizeComparator({ show, onClose }) {
  const { width, height, sizePreset } = useConfiguratorStore()

  // Scale everything relative to a 200px-tall human
  const HUMAN_PX = 200
  const scale = HUMAN_PX / HUMAN_HEIGHT_CM

  const panelW = width * 10 * scale   // cm to mm * scale
  const panelH = height * 10 * scale

  // Cap panel display for very large sizes
  const maxPanelW = 280
  const displayScale = panelW > maxPanelW ? maxPanelW / panelW : 1
  const displayPanelW = panelW * displayScale
  const displayPanelH = panelH * displayScale
  const displayHumanH = HUMAN_PX * displayScale
  const displayHumanW = HUMAN_WIDTH_CM * scale * displayScale

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-slate-900 rounded-2xl border border-slate-700 p-6 text-center"
    >
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Comparaison taille réelle
      </div>

      {/* Visual comparison */}
      <div className="flex items-end justify-center gap-8 mb-4" style={{ minHeight: Math.max(displayPanelH, displayHumanH) + 20 }}>
        {/* Human silhouette */}
        <div className="flex flex-col items-center gap-1">
          <svg
            width={displayHumanW}
            height={displayHumanH}
            viewBox="0 0 48 170"
            style={{ opacity: 0.6 }}
          >
            {/* Simple human silhouette */}
            <ellipse cx="24" cy="14" rx="10" ry="13" fill="#64748b"/>
            {/* Body */}
            <path d="M10,30 Q8,60 10,90 H38 Q40,60 38,30 Q31,26 24,26 Q17,26 10,30Z" fill="#64748b"/>
            {/* Left arm */}
            <path d="M10,35 Q2,55 4,75 Q7,77 10,75 Q11,60 14,42Z" fill="#64748b"/>
            {/* Right arm */}
            <path d="M38,35 Q46,55 44,75 Q41,77 38,75 Q37,60 34,42Z" fill="#64748b"/>
            {/* Left leg */}
            <path d="M14,88 Q12,115 12,140 Q14,145 18,144 Q20,120 20,92Z" fill="#64748b"/>
            {/* Right leg */}
            <path d="M34,88 Q36,115 36,140 Q34,145 30,144 Q28,120 28,92Z" fill="#64748b"/>
            {/* Feet */}
            <ellipse cx="15" cy="146" rx="6" ry="4" fill="#64748b"/>
            <ellipse cx="33" cy="146" rx="6" ry="4" fill="#64748b"/>
          </svg>
          <span className="text-[10px] text-slate-500">170 cm</span>
        </div>

        {/* Panel */}
        <div className="flex flex-col items-center gap-1">
          <motion.div
            layout
            className="rounded-sm bg-slate-800 border border-slate-600 flex items-center justify-center"
            style={{ width: displayPanelW, height: displayPanelH }}
            animate={{ width: displayPanelW, height: displayPanelH }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            <div className="text-[9px] text-slate-500 font-mono">{width}×{height}cm</div>
          </motion.div>
          {SIZE_BADGES[sizePreset] && (
            <span className="text-[10px] text-amber-400 font-medium">{SIZE_BADGES[sizePreset]}</span>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Le panneau {sizePreset !== 'custom' ? sizePreset : 'personnalisé'} fait {width}×{height} cm
        {sizePreset === 'L' && <span className="text-amber-400"> — le plus commandé ✓</span>}
      </p>
    </motion.div>
  )
}
