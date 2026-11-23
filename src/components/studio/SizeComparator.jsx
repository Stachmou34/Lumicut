import { motion } from 'framer-motion'
import { useConfiguratorStore } from '../../store/configuratorStore'
import { getSizePreset } from '../../lib/sizes'

// Silhouette de référence : 170 cm de haut, 48 cm de large
const HUMAN_HEIGHT_CM = 170
const HUMAN_WIDTH_CM = 48
// Hauteur d'affichage de la silhouette ; panneau et silhouette partagent la même échelle
const HUMAN_PX = 200

// Le panneau à côté d'une personne, à la même échelle
export default function SizeComparator() {
  const { width, height, sizePreset } = useConfiguratorStore()
  const scale = HUMAN_PX / HUMAN_HEIGHT_CM // pixels par centimètre

  const panelW = width * scale
  const panelH = height * scale
  const humanW = HUMAN_WIDTH_CM * scale
  const hint = getSizePreset(sizePreset)?.hint

  return (
    <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-5 text-center">
      <div className="flex items-end justify-center gap-8 mb-3 min-h-[220px]">
        <div className="flex flex-col items-center gap-1">
          <svg width={humanW} height={HUMAN_PX} viewBox="0 0 48 170" className="opacity-60" aria-hidden="true">
            <ellipse cx="24" cy="14" rx="10" ry="13" fill="#64748b" />
            <path d="M10,30 Q8,60 10,90 H38 Q40,60 38,30 Q31,26 24,26 Q17,26 10,30Z" fill="#64748b" />
            <path d="M10,35 Q2,55 4,75 Q7,77 10,75 Q11,60 14,42Z" fill="#64748b" />
            <path d="M38,35 Q46,55 44,75 Q41,77 38,75 Q37,60 34,42Z" fill="#64748b" />
            <path d="M14,88 Q12,115 12,140 Q14,145 18,144 Q20,120 20,92Z" fill="#64748b" />
            <path d="M34,88 Q36,115 36,140 Q34,145 30,144 Q28,120 28,92Z" fill="#64748b" />
            <ellipse cx="15" cy="146" rx="6" ry="4" fill="#64748b" />
            <ellipse cx="33" cy="146" rx="6" ry="4" fill="#64748b" />
          </svg>
          <span className="text-[11px] text-slate-500">170 cm</span>
        </div>

        {/* Panneau, à hauteur d'yeux comme au mur */}
        <div className="flex flex-col items-center gap-1 self-start mt-6">
          <motion.div
            className="rounded-sm bg-slate-800 border border-amber-400/60 shadow-[0_0_18px_rgba(251,191,36,0.25)]"
            animate={{ width: panelW, height: panelH }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          />
          <span className="text-[11px] text-slate-400 font-mono">{width} × {height} cm</span>
        </div>
      </div>

      <p className="text-sm text-slate-400">
        Le panneau {sizePreset !== 'custom' ? sizePreset : 'sur mesure'} fait {width} × {height} cm
        {hint && <span className="text-amber-300"> · {hint}</span>}
      </p>
    </div>
  )
}
