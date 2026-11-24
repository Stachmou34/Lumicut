import { useId } from 'react'

// Panneau en U vu de dos (format S, 40 × 20 cm, à l'échelle) pendant la pose du ruban.
// step : 'empty' (creux vide, encoche du câble), 'start' (départ à l'encoche), 'half' (pose en cours),
// 'done' (ruban posé, arrêté au dernier repère) ; cutMm : longueur gardée pour l'étape 'done'.
const W = 400
const H = 200
const S = 1.1
const BW = 4 // bords du U (mm)
const SW = 14.5 // largeur du ruban Flux (mm)
const D_STRIP = 10 // face lumineuse du ruban, depuis le dos du U (mm)
const D_FLOOR = 16 // fond du creux
const D_FRONT = 20 // face avant
const AX = S * Math.cos((40 * Math.PI) / 180)
const AY = S * Math.sin((40 * Math.PI) / 180)
const OX = 24
const OY = 40
const C = BW + SW / 2 // ligne médiane du ruban, depuis le bord
const START = W / 2 + 8 // départ du ruban, juste à droite de l'encoche

// Perspective cavalière : la profondeur part vers le haut à droite
const p = (x, y, d) => [OX + x * S + d * AX, OY + (H - y) * S - d * AY]
const pts = list => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
const at = (list, d) => list.map(([x, y]) => p(x, y, d))

// Motif d'exemple, vu de dos (inversé gauche-droite) : montagnes, lune, étoiles
const MOUNTAINS = [[45, 158], [115, 98], [150, 125], [205, 62], [262, 115], [292, 92], [355, 158]]
const STARS = [[80, 60, 2.6], [140, 46, 2], [172, 86, 1.6], [248, 44, 2.2], [345, 108, 1.7], [68, 104, 1.6]]
const back = (x, y) => p(W - x, H - y, D_FLOOR)

// Trajet du ruban depuis l'encoche, dans le sens de pose, coupé à la longueur L (mm)
function stripPath(L) {
  const loop = [[START, C], [W - C, C], [W - C, H - C], [C, H - C], [C, C], [START, C]]
  const out = [loop[0]]
  let left = L
  for (let i = 1; i < loop.length && left > 0; i++) {
    const [x0, y0] = loop[i - 1]
    const [x1, y1] = loop[i]
    const len = Math.hypot(x1 - x0, y1 - y0)
    if (len <= left) {
      out.push(loop[i])
      left -= len
    } else {
      const t = left / len
      out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t])
      left = 0
    }
  }
  return out
}

// Flèche pleine posée en (x, y), pointée selon l'angle a (écran)
function Chevron({ x, y, a }) {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const tip = [x + 10 * c, y + 10 * s]
  const l = [x - 4 * c - 7 * s, y - 4 * s + 7 * c]
  const r = [x - 4 * c + 7 * s, y - 4 * s - 7 * c]
  return <polygon points={pts([tip, l, r])} className="fill-amber-400 stroke-slate-950" strokeWidth="1" />
}

function Scissors({ x, y }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-20)`} className="stroke-amber-300 fill-none" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="-5" cy="7" r="3.4" />
      <circle cx="5" cy="7" r="3.4" />
      <line x1="-3" y1="4.5" x2="5" y2="-9" />
      <line x1="3" y1="4.5" x2="-5" y2="-9" />
    </g>
  )
}

export default function PanelBackView({ step = 'done', cutMm = 996, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const length = { empty: 0, start: 70, half: 560, done: cutMm }[step] ?? cutMm
  const path = length > 0 ? stripPath(length) : null
  const screen = path ? at(path, D_STRIP) : null
  const end = screen?.[screen.length - 1]
  const before = screen?.[screen.length - 2]
  const angle = end && before ? Math.atan2(end[1] - before[1], end[0] - before[0]) : 0
  const outer = [[0, 0], [W, 0], [W, H], [0, H]]
  const inner = [[BW, BW], [BW, H - BW], [W - BW, H - BW], [W - BW, BW]]
  const ring = d => `M${pts(at(outer, d)).replace(/ /g, ' L')} Z M${pts(at(inner, d)).replace(/ /g, ' L')} Z`
  const notch = p(W / 2, 2, 0)
  const startPt = p(START, C, D_STRIP)
  const endMm = path?.[path.length - 1]

  // Tranches extérieures visibles (dessus, droite) entre deux profondeurs
  const sides = (d0, d1, cls) => (
    <g className={cls} strokeWidth="0.8">
      <polygon points={pts([p(0, H, d0), p(W, H, d0), p(W, H, d1), p(0, H, d1)])} />
      <polygon points={pts([p(W, 0, d0), p(W, H, d0), p(W, H, d1), p(W, 0, d1)])} className="brightness-75" />
    </g>
  )

  return (
    <svg viewBox="0 0 500 305" className={className} role="img"
      aria-label={{
        empty: 'Panneau en U vu de dos, creux vide : le fond du creux et l’encoche du câble au milieu du bord du bas.',
        start: 'Le ruban part de l’encoche du câble et se colle contre le bord.',
        half: 'Le ruban est collé contre le bord, tout autour du creux, dans le sens de la flèche.',
        done: 'Ruban posé tout autour du creux, arrêté au dernier repère de coupe ; un petit espace reste près de l’encoche.',
      }[step]}>
      <defs>
        <clipPath id={`f-${uid}`}>
          <polygon points={pts(at([[BW, BW], [W - BW, BW], [W - BW, H - BW], [BW, H - BW]], D_FLOOR))} />
        </clipPath>
      </defs>

      {/* Tranches : bords du U, puis façade */}
      {sides(0, D_FLOOR, 'fill-slate-600 stroke-slate-500')}
      {sides(D_FLOOR, D_FRONT, 'fill-slate-700 stroke-slate-500')}

      {/* Fond du creux : dos de la façade, motif découpé (vu de dos) et trous des entretoises */}
      <polygon points={pts(at([[BW, BW], [W - BW, BW], [W - BW, H - BW], [BW, H - BW]], D_FLOOR))} className="fill-slate-800 stroke-slate-600" strokeWidth="0.8" />
      <g clipPath={`url(#f-${uid})`} className="fill-slate-950">
        <polygon points={pts(MOUNTAINS.map(([x, y]) => back(x, y)))} />
        <circle cx={back(300, 58)[0]} cy={back(300, 58)[1]} r={15 * S} />
        {STARS.map(([x, y, r]) => <circle key={`${x}${y}`} cx={back(x, y)[0]} cy={back(x, y)[1]} r={Math.max(r * S, 1.2)} />)}
      </g>
      {[[30, 30], [W - 30, 30], [30, H - 30], [W - 30, H - 30]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={p(x, y, D_FLOOR)[0]} cy={p(x, y, D_FLOOR)[1]} r={5 * S} className="fill-slate-950 stroke-slate-500" strokeWidth="0.8" />
      ))}

      {/* Parois visibles du creux (bas et gauche) */}
      <polygon points={pts([p(BW, BW, 0), p(W - BW, BW, 0), p(W - BW, BW, D_FLOOR), p(BW, BW, D_FLOOR)])} className="fill-slate-600" />
      <polygon points={pts([p(BW, H - BW, 0), p(BW, BW, 0), p(BW, BW, D_FLOOR), p(BW, H - BW, D_FLOOR)])} className="fill-slate-700" />

      {/* Ruban collé au fond, contre le bord ; reste à l'encoche quand il est posé */}
      {step === 'done' && endMm && (
        <polygon points={pts(at([[endMm[0], BW], [START, BW], [START, BW + SW], [endMm[0], BW + SW]], D_STRIP))} className="fill-none stroke-amber-300" strokeWidth="1.2" strokeDasharray="4 3" />
      )}
      {screen && (
        <>
          <polyline points={pts(screen)} className="fill-none stroke-slate-100" strokeWidth={SW * S} strokeLinejoin="miter" strokeMiterlimit="4" />
          <polyline points={pts(screen)} className="fill-none stroke-amber-400" strokeWidth="2.2" strokeLinejoin="round" />
        </>
      )}

      {/* Dos des bords du U, encoche du câble */}
      <path d={ring(0)} fillRule="evenodd" className="fill-slate-500 stroke-slate-400" strokeWidth="0.8" />
      <polygon points={pts([p(193, 0, 0), p(207, 0, 0), p(207, BW, 0), p(193, BW, 0)])} className="fill-slate-950" />

      {/* Câble d'alimentation : du début du ruban, par l'encoche, vers la prise */}
      {screen && (
        <path d={`M${startPt[0]},${startPt[1]} C${startPt[0] - 4},${startPt[1] + 10} ${notch[0] + 2},${notch[1] - 6} ${notch[0]},${notch[1]} S${notch[0] - 6},${notch[1] + 30} ${notch[0] - 14},${notch[1] + 40}`}
          className="fill-none stroke-slate-300" strokeWidth="2.4" strokeLinecap="round" />
      )}

      {/* Repères de l'étape */}
      {step === 'empty' && (
        <g>
          <circle cx={notch[0]} cy={notch[1]} r="14" className="fill-none stroke-amber-400" strokeWidth="1.8" strokeDasharray="4 3" />
          <polyline points={`${notch[0] + 10},${notch[1] + 10} ${notch[0] + 22},${notch[1] + 30}`} className="fill-none stroke-amber-400" strokeWidth="1" />
          <text x={notch[0] + 26} y={notch[1] + 36} className="fill-amber-300 text-[14px] font-semibold">encoche du câble</text>
          <text x={p(60, 176, D_FLOOR)[0]} y={p(60, 176, D_FLOOR)[1]} className="fill-slate-300 text-[14px]">fond du creux</text>
        </g>
      )}
      {step === 'start' && end && (
        <g>
          <Chevron x={end[0]} y={end[1]} a={angle} />
          <polyline points={`${startPt[0] + 6},${startPt[1] + 10} ${startPt[0] + 30},${startPt[1] + 44}`} className="fill-none stroke-amber-400" strokeWidth="1" />
          <text x={startPt[0] + 34} y={startPt[1] + 52} className="fill-amber-300 text-[14px] font-semibold">départ, à l’encoche</text>
        </g>
      )}
      {step === 'half' && end && (
        <g>
          <Chevron x={end[0]} y={end[1]} a={angle} />
          <text x={end[0]} y="16" textAnchor="middle" className="fill-amber-300 text-[14px] font-semibold">sens de pose</text>
        </g>
      )}
      {step === 'done' && end && (
        <g>
          <Scissors x={end[0] - 2} y={end[1] - 24} />
          <text x={end[0] - 14} y={end[1] - 40} textAnchor="middle" className="fill-amber-300 text-[14px] font-semibold">dernier repère</text>
          <text x={p((endMm[0] + START) / 2, 28, D_FLOOR)[0]} y={p((endMm[0] + START) / 2, 28, D_FLOOR)[1]} textAnchor="middle" className="fill-slate-300 text-[13px]">petit espace, normal</text>
        </g>
      )}
    </svg>
  )
}
