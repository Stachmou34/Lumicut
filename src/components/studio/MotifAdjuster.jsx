import { useConfiguratorStore } from '../../store/configuratorStore'
import { resolveMotifSvg } from '../../lib/panelDesign'
import { SCALE_LIMITS, motifOffsetRange, nudge } from '../../lib/panelEditing'

function Slider({ label, value, min, max, step, unit, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="text-amber-300 font-mono">{Math.round(value)}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} disabled={min >= max}
        onChange={e => onChange(Number(e.target.value))} className="w-full disabled:opacity-40" />
    </div>
  )
}

// Bornes entières d'un curseur, élargies si la valeur actuelle en sort (motif déjà en débord)
const sliderBounds = ([a, b], v) => [Math.min(Math.ceil(a), Math.round(v)), Math.max(Math.floor(b), Math.round(v))]

export default function MotifAdjuster() {
  const state = useConfiguratorStore()
  const {
    motifScale, motifX, motifY, motifRotation,
    motifMirrorH, motifMirrorV,
    setMotifTransform, resetMotifTransform
  } = state
  // Les motifs générés pleine surface s'adaptent au panneau : seuls les miroirs s'appliquent
  const fullPanel = resolveMotifSvg(state, state.width || 60, state.height || 30).fullPanel

  const set = (key) => (v) => setMotifTransform({ [key]: v })
  // Les positions possibles dépendent du format, de l'échelle et de la rotation :
  // le motif reste sur le panneau, comme lorsqu'on le déplace à la souris
  const range = motifOffsetRange(state)
  const [xMin, xMax] = sliderBounds(range.x, motifX)
  const [yMin, yMax] = sliderBounds(range.y, motifY)
  const move = (dx, dy) => setMotifTransform(nudge('motif', state, dx, dy))

  return (
    <div className="flex flex-col gap-4">
      {!fullPanel && (
        <div className="flex justify-end -mt-1">
          <button onClick={resetMotifTransform} className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
            Recentrer ↺
          </button>
        </div>
      )}

      {fullPanel ? (
        <p className="text-xs text-slate-400 leading-relaxed bg-slate-800/60 rounded-lg p-3 border border-slate-700">
          Ce motif couvre tout le panneau et s’adapte à ses dimensions. Pour le modifier
          (densité, taille, variante…), revenez à l’étape Motif, onglet ✨ Créer.
        </p>
      ) : (
        <>
          <Slider label="Échelle" value={motifScale} min={SCALE_LIMITS.motif[0]} max={SCALE_LIMITS.motif[1]} step={1} unit="%" onChange={set('motifScale')} />
          <Slider label="Position X" value={motifX} min={xMin} max={xMax} step={1} unit="" onChange={set('motifX')} />
          <Slider label="Position Y" value={motifY} min={yMin} max={yMax} step={1} unit="" onChange={set('motifY')} />
          <Slider label="Rotation" value={motifRotation} min={0} max={360} step={15} unit="°" onChange={set('motifRotation')} />
        </>
      )}

      {/* Mirror toggles */}
      <div className="flex gap-2">
        <button
          onClick={() => setMotifTransform({ motifMirrorH: !motifMirrorH })}
          className={`flex-1 py-2 text-sm rounded-full border transition-colors ${motifMirrorH ? 'bg-amber-400/15 text-amber-300 border-amber-400/50' : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-500'}`}
        >
          ↔ Miroir H
        </button>
        <button
          onClick={() => setMotifTransform({ motifMirrorV: !motifMirrorV })}
          className={`flex-1 py-2 text-sm rounded-full border transition-colors ${motifMirrorV ? 'bg-amber-400/15 text-amber-300 border-amber-400/50' : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-500'}`}
        >
          ↕ Miroir V
        </button>
      </div>

      {/* Direction pad (inutile pour un motif pleine surface) */}
      <div className={`flex flex-col items-center gap-1 ${fullPanel ? 'hidden' : ''}`}>
        <button
          onClick={() => move(0, -2)}
          className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm transition-colors"
        >▲</button>
        <div className="flex gap-1">
          <button onClick={() => move(-2, 0)} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm transition-colors">◀</button>
          <button onClick={() => resetMotifTransform()} className="w-8 h-8 bg-slate-700 hover:bg-amber-400/20 rounded text-slate-300 text-xs transition-colors">⊙</button>
          <button onClick={() => move(2, 0)} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm transition-colors">▶</button>
        </div>
        <button
          onClick={() => move(0, 2)}
          className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm transition-colors"
        >▼</button>
      </div>
    </div>
  )
}
