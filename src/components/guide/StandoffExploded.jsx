import { useId } from 'react'

// Vue éclatée d'une fixation par entretoise, en coupe au niveau d'un trou (à 3 cm du bord) :
// mur, cheville et vis, entretoise qui traverse le creux du U, panneau, capuchon. Échelle 1 mm = 3,4 unités.
const K = 3.4
const X = x => 40 + K * x // x : profondeur depuis le mur (mm)
const Y = y => 30 + K * y // y : distance au bord du haut du panneau (mm)
// Décalages de la vue éclatée (mm)
const OFF = { screw: 10, barrel: 22, panel: 44, cap: 66 }

function Box({ x0, x1, y0, y1, className, rx = 0 }) {
  return <rect x={X(x0)} y={Y(y0)} width={K * (x1 - x0)} height={K * (y1 - y0)} rx={rx} className={className} strokeWidth="0.8" />
}

function Part({ x, n, title, hint }) {
  return (
    <g>
      <circle cx={x} cy="186" r="9" className="fill-amber-400" />
      <text x={x} y="190" textAnchor="middle" className="fill-slate-950 text-[11px] font-bold">{n}</text>
      <text x={x} y="214" textAnchor="middle" className="fill-slate-200 text-[12px] font-semibold">{title}</text>
      <text x={x} y="229" textAnchor="middle" className="fill-slate-400 text-[10.5px]">{hint}</text>
    </g>
  )
}

export default function StandoffExploded({ className = '' }) {
  const uid = useId().replace(/:/g, '')
  const b = OFF.barrel
  const pn = OFF.panel
  const c = OFF.cap
  return (
    <svg viewBox="0 0 480 250" className={className} role="img"
      aria-label="Vue éclatée d'une fixation : cheville et vis dans le mur, entretoise qui traverse le creux du U jusqu'à la façade, panneau en U avec son ruban, capuchon vissé à travers la façade.">
      <defs>
        <pattern id={`h-${uid}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" className="stroke-slate-700" strokeWidth="1.1" />
        </pattern>
        <linearGradient id={`m-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2e8f0" />
          <stop offset="0.45" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
      </defs>

      {/* Mur */}
      <rect x="0" y="0" width={X(0)} height="250" className="fill-slate-800" />
      <rect x="0" y="0" width={X(0)} height="250" fill={`url(#h-${uid})`} />
      <line x1={X(0)} y1="0" x2={X(0)} y2="250" className="stroke-slate-500" />

      {/* Axe de montage */}
      <line x1="10" y1={Y(30)} x2="472" y2={Y(30)} className="stroke-slate-600" strokeDasharray="5 4" />

      {/* 1. Cheville (dans le mur) et vis */}
      <Box x0={-11} x1={0} y0={26} y1={34} className="fill-slate-500 stroke-slate-400" />
      <Box x0={OFF.screw - 10} x1={OFF.screw + 6} y0={28.8} y1={31.2} className="fill-slate-300 stroke-slate-400" />
      <Box x0={OFF.screw + 6} x1={OFF.screw + 8} y0={26.5} y1={33.5} className="fill-slate-300 stroke-slate-400" />

      {/* 2. Entretoise : du mur jusqu'à la façade, à travers le creux (30 mm + 16 mm) */}
      <rect x={X(b)} y={Y(20.5)} width={K * 46} height={K * 19} rx="2" fill={`url(#m-${uid})`} className="stroke-slate-400" strokeWidth="0.8" />

      {/* 3. Panneau en U : bord, ruban collé au fond du creux, façade percée Ø 10 */}
      <Box x0={pn + 30} x1={pn + 46} y0={0} y1={4} className="fill-slate-600 stroke-slate-400" />
      <Box x0={pn + 40} x1={pn + 46} y0={4} y1={18.5} className="fill-slate-100 stroke-slate-400" />
      <line x1={X(pn + 40)} y1={Y(4.6)} x2={X(pn + 40)} y2={Y(17.9)} className="stroke-amber-400" strokeWidth="2.4" strokeLinecap="round" />
      <Box x0={pn + 46} x1={pn + 50} y0={0} y1={25} className="fill-slate-600 stroke-slate-400" />
      <Box x0={pn + 46} x1={pn + 50} y0={35} y1={62} className="fill-slate-600 stroke-slate-400" />
      <text x={X(pn + 38)} y={Y(40)} textAnchor="middle" className="fill-slate-500 text-[10px] italic">creux</text>

      {/* 4. Capuchon : tige filetée à travers la façade, tête bombée en façade */}
      <Box x0={c + 34} x1={c + 50} y0={27} y1={33} className="fill-slate-400 stroke-slate-500" />
      <path d={`M${X(c + 50)},${Y(20.5)} h${K * 5} a${K * 3} ${K * 9.5} 0 0 1 0 ${K * 19} h${-K * 5} Z`} fill={`url(#m-${uid})`} className="stroke-slate-400" strokeWidth="0.8" />

      <Part x={X(12)} n="1" title="Cheville et vis" hint="dans le mur" />
      <Part x={X(b + 23)} n="2" title="Entretoise" hint="traverse le creux" />
      <Part x={X(pn + 30)} n="3" title="Panneau en U" hint="ruban déjà collé" />
      <Part x={X(c + 50)} n="4" title="Capuchon" hint="vissé en façade" />
    </svg>
  )
}
