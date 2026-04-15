import { useProjectStore } from '../store/projectStore'
import { MATERIALS } from '../lib/estimateCost'

function Slider({ label, value, min, max, step, unit, tooltip, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center text-sm">
        <span className="text-slate-300 flex items-center gap-1">
          {label}
          {tooltip && (
            <span className="group relative cursor-help">
              <span className="text-slate-500 text-xs">ⓘ</span>
              <span className="absolute left-0 bottom-5 z-10 hidden group-hover:block bg-slate-700 text-slate-200 text-xs rounded p-2 w-48 shadow-lg">
                {tooltip}
              </span>
            </span>
          )}
        </span>
        <span className="text-sky-400 font-mono text-xs">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
      <input
        type="number" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full bg-slate-700 text-slate-200 text-xs rounded px-2 py-1 border border-slate-600 focus:outline-none focus:border-sky-500"
      />
    </div>
  )
}

export default function ConfigPanel() {
  const { template, params, setParam } = useProjectStore()
  const set = (key) => (val) => setParam(key, val)

  const tooltips = {
    kerf: "Le kerf compense l'épaisseur du trait laser. Demandez cette valeur à votre atelier. Typiquement 0.1–0.3mm.",
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {template.name}
      </div>

      {/* Material */}
      <div className="flex flex-col gap-2">
        <span className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Matériau</span>
        <select
          value={params.material || 'plywood_3'}
          onChange={e => setParam('material', e.target.value)}
          className="bg-slate-700 text-slate-200 text-sm rounded px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-sky-500"
        >
          {MATERIALS.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <div className="flex gap-1 flex-wrap">
          {[3,4,6,8].map(v => (
            <button
              key={v}
              onClick={() => setParam('thickness', v)}
              className={`px-2 py-1 rounded text-xs font-mono transition-colors ${params.thickness === v ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
            >
              {v}mm
            </button>
          ))}
        </div>
      </div>

      {/* Finger joints toggle */}
      {'fingerJoints' in params && (
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setParam('fingerJoints', !params.fingerJoints)}
            className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${params.fingerJoints ? 'bg-sky-600' : 'bg-slate-600'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${params.fingerJoints ? 'translate-x-5' : ''}`} />
          </div>
          <span className="text-slate-300 text-sm">Encoches (finger joints)</span>
        </label>
      )}

      {/* Template-specific sliders */}
      <div className="flex flex-col gap-3">
        {template.paramSchema.map(s => (
          <Slider
            key={s.key}
            label={s.label}
            value={params[s.key] ?? s.min}
            min={s.min}
            max={s.max}
            step={s.step}
            unit={s.unit}
            tooltip={tooltips[s.key]}
            onChange={set(s.key)}
          />
        ))}
      </div>
    </div>
  )
}
