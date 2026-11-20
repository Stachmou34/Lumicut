import { useConfiguratorStore } from '../../store/configuratorStore'
import { resolveMotifSvg } from '../../lib/panelDesign'

function Slider({ label, value, min, max, step, unit, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-amber-400 font-mono">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} className="w-full" />
    </div>
  )
}

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ajustement motif</span>
        {!fullPanel && (
          <button onClick={resetMotifTransform} className="text-xs text-slate-500 hover:text-amber-400 transition-colors">
            Centrer ↺
          </button>
        )}
      </div>

      {fullPanel ? (
        <p className="text-xs text-slate-400 leading-relaxed bg-slate-800/60 rounded-lg p-3 border border-slate-700">
          Ce motif couvre tout le panneau et s’adapte à ses dimensions. Pour le modifier
          (densité, taille, variante…), ouvrez Motif › ✨ Créer.
        </p>
      ) : (
        <>
          <Slider label="Échelle" value={motifScale} min={40} max={100} step={1} unit="%" onChange={set('motifScale')} />
          <Slider label="Position X" value={motifX} min={-30} max={30} step={1} unit="" onChange={set('motifX')} />
          <Slider label="Position Y" value={motifY} min={-30} max={30} step={1} unit="" onChange={set('motifY')} />
          <Slider label="Rotation" value={motifRotation} min={0} max={360} step={15} unit="°" onChange={set('motifRotation')} />
        </>
      )}

      {/* Mirror toggles */}
      <div className="flex gap-2">
        <button
          onClick={() => setMotifTransform({ motifMirrorH: !motifMirrorH })}
          className={`flex-1 py-1.5 text-xs rounded transition-colors ${motifMirrorH ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
        >
          ↔ Miroir H
        </button>
        <button
          onClick={() => setMotifTransform({ motifMirrorV: !motifMirrorV })}
          className={`flex-1 py-1.5 text-xs rounded transition-colors ${motifMirrorV ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
        >
          ↕ Miroir V
        </button>
      </div>

      {/* Direction pad (inutile pour un motif pleine surface) */}
      <div className={`flex flex-col items-center gap-1 ${fullPanel ? 'hidden' : ''}`}>
        <button
          onClick={() => setMotifTransform({ motifY: motifY - 2 })}
          className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm transition-colors"
        >▲</button>
        <div className="flex gap-1">
          <button onClick={() => setMotifTransform({ motifX: motifX - 2 })} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm transition-colors">◀</button>
          <button onClick={() => resetMotifTransform()} className="w-8 h-8 bg-slate-700 hover:bg-amber-400/20 rounded text-slate-300 text-xs transition-colors">⊙</button>
          <button onClick={() => setMotifTransform({ motifX: motifX + 2 })} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm transition-colors">▶</button>
        </div>
        <button
          onClick={() => setMotifTransform({ motifY: motifY + 2 })}
          className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm transition-colors"
        >▼</button>
      </div>
    </div>
  )
}
