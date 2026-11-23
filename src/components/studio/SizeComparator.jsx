import { motion } from 'framer-motion'
import { useConfiguratorStore } from '../../store/configuratorStore'
import { getSizePreset } from '../../lib/sizes'
import HumanSilhouette from '../ui/HumanSilhouette'

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
          <span className="block opacity-60" style={{ width: humanW, height: HUMAN_PX }}>
            <HumanSilhouette className="w-full h-full" />
          </span>
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
