import { useMemo } from 'react'
import { useConfiguratorStore } from '../../store/configuratorStore'
import {
  GENERATORS, getGenerator, defaultSpec, randomSeed, generateMotif, resolveParams,
} from '../../lib/generators'
import { getPanelMaterial } from '../../lib/panelMaterials'
import MotifThumb from './MotifThumb'

// Réglage d'un paramètre de générateur : curseur, interrupteur ou choix
function ParamControl({ param, value, min, onChange }) {
  if (param.type === 'toggle') {
    return (
      <button
        onClick={() => onChange(!value)}
        className="flex items-center justify-between gap-3 text-xs text-slate-300"
      >
        <span>{param.label}</span>
        <span className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${value ? 'bg-amber-500 justify-end' : 'bg-slate-600 justify-start'}`}>
          <span className="w-4 h-4 rounded-full bg-white shadow" />
        </span>
      </button>
    )
  }
  if (param.type === 'choice') {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-slate-400">{param.label}</span>
        <div className="grid grid-cols-2 gap-1">
          {param.options.map(([id, label]) => (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`py-1.5 rounded text-xs transition-colors ${value === id ? 'bg-amber-400 text-black font-semibold' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    )
  }
  const display = Number.isInteger(param.step) ? value : Number(value).toFixed(param.step < 0.1 ? 2 : 1)
  return (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between text-xs">
        <span className="text-slate-400">{param.label}</span>
        <span className="text-amber-400 font-mono">{display}{param.unit ?? ''}</span>
      </span>
      <input
        type="range"
        min={min}
        max={param.max}
        step={param.step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  )
}

// Onglet « Créer » : choix d'un style de générateur, variantes et réglages
export default function GeneratorPanel() {
  const {
    generator, motifId, generatorName, material,
    setGenerator, setGeneratorParam, setGeneratorSeed,
  } = useConfiguratorStore()
  const active = motifId === 'generated' && generator ? generator : null
  const gen = active ? getGenerator(active.type) : null
  const minBridge = getPanelMaterial(material).minBridgeMm
  const params = gen ? resolveParams(gen, active.params, minBridge) : null

  // Vignettes des styles, calculées une fois
  const styles = useMemo(() => GENERATORS.map(g => ({
    g,
    svg: generateMotif(defaultSpec(g.id, 1), { widthCm: 60, heightCm: 30, motifScale: 90, minBridgeMm: 2.5 }).svg,
  })), [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-400 leading-relaxed">
        Choisissez un style : chaque variante est unique et toujours prête pour la découpe.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {styles.map(({ g, svg }) => (
          <button
            key={g.id}
            onClick={() => setGenerator(defaultSpec(g.id, randomSeed()))}
            className={`rounded-lg overflow-hidden border-2 text-left transition-all ${active?.type === g.id ? 'border-amber-400' : 'border-slate-700 hover:border-slate-500'}`}
          >
            <MotifThumb svg={svg} />
            <div className="px-2 py-1.5 text-xs font-medium text-slate-200 bg-slate-800">{g.label}</div>
          </button>
        ))}
      </div>

      {gen && (
        <div className="flex flex-col gap-3 border-t border-slate-700 pt-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-amber-400">{generatorName || gen.label}</div>
              <div className="text-[11px] text-slate-500">Variante n° {active.seed}</div>
            </div>
            <button
              onClick={() => setGeneratorSeed(randomSeed())}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium"
            >
              🎲 Autre variante
            </button>
          </div>
          <p className="text-xs text-slate-500">{gen.description}</p>
          {gen.params.map(p => (
            <ParamControl
              key={p.key}
              param={p}
              value={params[p.key]}
              min={p.key === 'bridge' ? Math.max(p.min, minBridge) : p.min}
              onChange={v => setGeneratorParam(p.key, v)}
            />
          ))}
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Les ponts de matière ne descendent jamais sous {minBridge} mm, le minimum pour ce matériau.
          </p>
        </div>
      )}
    </div>
  )
}
