import { useEffect, useState } from 'react'
import { useConfiguratorStore } from '../../store/configuratorStore'
import { PLACEMENTS } from '../../lib/rooms'
import {
  STANDOFF_DEPTHS_MM, POWER_OPTIONS, HOLE_INSET_CM,
  getFixing, fixingsForPlacement, computeFixingPoints, clearanceRadiusCm, describePoint, describeKit,
} from '../../lib/fixings'
import { designFromState } from '../../lib/panelDesign'
import { findHoleConflicts } from '../../lib/cutMask'

// Pastille de finition de chaque fixation
const SWATCH = {
  'standoff-steel': 'bg-zinc-300',
  'standoff-black': 'bg-zinc-800',
  'standoff-brass': 'bg-amber-600',
  hidden: 'bg-slate-600 border-dashed',
  cables: 'bg-zinc-400',
}

// Trous dont le capuchon ou la zone de serrage touche une découpe du motif ou du texte
function useHoleConflicts(state) {
  const design = designFromState(state)
  const key = JSON.stringify(design)
  const [conflicts, setConflicts] = useState([])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      findHoleConflicts(design, design.holes, clearanceRadiusCm(state.mounting))
        .then(list => { if (!cancelled) setConflicts(list) })
        .catch(() => { if (!cancelled) setConflicts([]) })
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return conflicts
}

function SectionTitle({ children }) {
  return <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{children}</div>
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
      {options.map(o => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${value === o.id ? 'bg-amber-400 text-black' : 'text-slate-400 hover:text-slate-200'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function FixingSelector() {
  const state = useConfiguratorStore()
  const {
    placement, setPlacement, mounting, setMounting, standoffDepth, setStandoffDepth,
    powerCable, setPowerCable, exploded, setExploded, width, height,
  } = state
  const fixing = getFixing(mounting)
  const points = computeFixingPoints(width || 60, height || 30)
  const conflicts = useHoleConflicts(state)

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Pose</SectionTitle>
      <Segmented options={PLACEMENTS} value={placement} onChange={setPlacement} />

      <SectionTitle>Fixation</SectionTitle>
      <div className="flex flex-col gap-2">
        {fixingsForPlacement(placement).map(f => (
          <button
            key={f.id}
            onClick={() => setMounting(f.id)}
            className={`flex items-start gap-3 p-2.5 rounded-lg border-2 text-left transition-all ${mounting === f.id ? 'border-amber-400 bg-amber-400/5' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'}`}
          >
            <span className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 border border-slate-500 ${SWATCH[f.id] ?? 'bg-slate-500'}`} />
            <span className="flex-1">
              <span className={`block text-sm font-medium ${mounting === f.id ? 'text-amber-400' : 'text-slate-200'}`}>{f.label}</span>
              <span className="block text-xs text-slate-500 mt-0.5 leading-snug">{f.description}</span>
            </span>
            <span className="text-xs text-slate-400">incl.</span>
          </button>
        ))}
      </div>

      {fixing.kind !== 'cable' && (
        <div className="flex flex-col gap-2">
          <SectionTitle>Déport (distance au support)</SectionTitle>
          <Segmented
            options={STANDOFF_DEPTHS_MM.map(mm => ({ id: mm, label: `${mm} mm` }))}
            value={standoffDepth}
            onChange={setStandoffDepth}
          />
          <p className="text-xs text-slate-500">Plus le panneau est décollé, plus le halo lumineux s'étale.</p>
        </div>
      )}

      {/* Perçage et contenu du kit : ce que l'atelier découpe et ce que le client reçoit */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 flex flex-col gap-1.5 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">Perçage</span>
          <span className="text-slate-300 text-right">
            {fixing.holeDiameterMm
              ? `${points.length} trous Ø ${fixing.holeDiameterMm} mm à ${HOLE_INSET_CM} cm des bords`
              : 'Aucun trou en façade'}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">Kit fourni</span>
          <span className="text-slate-300 text-right">{describeKit(mounting, points.length, standoffDepth)}</span>
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="bg-amber-900/30 border border-amber-700/40 text-amber-300 text-xs rounded-lg px-3 py-2 flex flex-col gap-1">
          {conflicts.map(c => (
            <p key={`${c.x}${c.y}`}>⚠️ La fixation {describePoint(c)} touche le motif ou le texte.</p>
          ))}
          <p className="text-amber-400/80">Réduisez ou décalez le motif (onglet Ajuster), ou choisissez la fixation invisible.</p>
        </div>
      )}

      <SectionTitle>Alimentation</SectionTitle>
      {placement === 'wall' ? (
        <>
          <Segmented options={POWER_OPTIONS} value={powerCable} onChange={setPowerCable} />
          <p className="text-xs text-slate-500">{POWER_OPTIONS.find(o => o.id === powerCable)?.description}</p>
        </>
      ) : (
        <p className="text-xs text-slate-500">Raccordement au point lumineux du plafond (boîte DCL), caché par le panneau.</p>
      )}

      {placement !== 'pendant' && (
        <button
          onClick={() => setExploded(!exploded)}
          className={`w-full py-2 rounded-lg text-xs font-medium border transition-colors ${exploded ? 'bg-amber-400 text-black border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-400'}`}
        >
          {exploded ? '✓ Vue éclatée (cliquez pour remonter)' : '🔍 Vue éclatée : voir comment tout s’assemble'}
        </button>
      )}
    </div>
  )
}
