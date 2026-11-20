import { useConfiguratorStore } from '../../store/configuratorStore'
import { CUT_STYLES, STYLE_PARAMS, styleParams } from '../../lib/library/cutStyles'
import { isLibraryMotif } from '../../lib/library/libraryClient'

// Pictogramme de chaque style, sur une même feuille : on voit d'un coup d'œil où passe la lumière
const LEAF = 'M14 3C7 7 4 12 5 20c3 3 9 4 14 0 3-6 1-12-5-17Z'
function StyleIcon({ id }) {
  return (
    <svg viewBox="0 0 28 26" className="w-7 h-7" aria-hidden="true">
      <defs>
        <clipPath id={`leaf-${id}`}><path d={LEAF} /></clipPath>
      </defs>
      {id === 'silhouette' && <path d={LEAF} fill="currentColor" />}
      {id === 'contour' && <path d={LEAF} fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="9 2.5" />}
      {id === 'echo' && (
        <>
          <path d={LEAF} fill="none" stroke="currentColor" strokeWidth="1.3" strokeDasharray="8 2.5" />
          <path d={LEAF} fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="5 2" transform="translate(14 13) scale(0.62) translate(-14 -13)" />
        </>
      )}
      {id === 'lines' && (
        <g clipPath={`url(#leaf-${id})`} stroke="currentColor" strokeWidth="1.3">
          {[4, 7.5, 11, 14.5, 18, 21.5].map(y => <line key={y} x1="0" x2="28" y1={y} y2={y} />)}
        </g>
      )}
      {id === 'dots' && (
        <g clipPath={`url(#leaf-${id})`} fill="currentColor">
          {[5, 9, 13, 17, 21].flatMap((y, r) => [4, 8, 12, 16, 20, 24].map(x => (
            <circle key={`${x}-${y}`} cx={x + (r % 2 ? 2 : 0)} cy={y} r={1.1} />
          )))}
        </g>
      )}
    </svg>
  )
}

function Param({ param, value, onChange }) {
  if (param.type === 'choice') {
    return (
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-400">{param.label}</span>
        <div className="flex gap-1">
          {param.options.map(([v, label]) => (
            <button
              key={v}
              onClick={() => onChange(v)}
              className={`w-7 h-6 rounded text-xs font-mono ${value === v ? 'bg-amber-400 text-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{param.label}</span>
        <span className="text-amber-400 font-mono">{Number(value).toFixed(param.step < 1 ? 1 : 0)}{param.unit}</span>
      </div>
      <input
        type="range" min={param.min} max={param.max} step={param.step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  )
}

// Style de découpe du motif de la bibliothèque : comment la lumière dessine le motif
export default function CutStylePicker() {
  const motifId = useConfiguratorStore(s => s.motifId)
  const libraryStyles = useConfiguratorStore(s => s.libraryStyles)
  const cutStyle = useConfiguratorStore(s => s.cutStyle)
  const cutStyleParams = useConfiguratorStore(s => s.cutStyleParams)
  const setCutStyle = useConfiguratorStore(s => s.setCutStyle)
  const setCutStyleParam = useConfiguratorStore(s => s.setCutStyleParam)
  const pushEditHistory = useConfiguratorStore(s => s.pushEditHistory)

  if (!isLibraryMotif(motifId) || libraryStyles === false) return null
  const active = CUT_STYLES.find(s => s.id === cutStyle) ?? CUT_STYLES[1]
  const params = STYLE_PARAMS[active.id] ?? []
  const values = styleParams(active.id, cutStyleParams?.[active.id])

  return (
    <div className="flex flex-col gap-2.5 bg-slate-900/60 rounded-lg p-3 border border-slate-700">
      <div className="text-xs font-semibold text-slate-300">Style de découpe</div>
      <div className="grid grid-cols-5 gap-1">
        {CUT_STYLES.map(s => (
          <button
            key={s.id}
            title={s.hint}
            onClick={() => { if (s.id !== cutStyle) { pushEditHistory(); setCutStyle(s.id) } }}
            className={`flex flex-col items-center gap-0.5 rounded-md py-1.5 transition-colors ${s.id === active.id ? 'bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/50' : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'}`}
          >
            <StyleIcon id={s.id} />
            <span className="text-[9px] leading-tight text-center">{s.label}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">{active.hint}</p>
      {params.map(p => (
        <Param key={p.key} param={p} value={values[p.key]} onChange={v => setCutStyleParam(p.key, v)} />
      ))}
    </div>
  )
}
