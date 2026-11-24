import { useId } from 'react'

// Coupe complète du panneau en U : épaisseurs agrandies trois fois, panneau raccourci au milieu.
// Pièce à gauche, mur à droite : la lumière du ruban rebondit sur le mur, fait le halo et ressort par le motif.
const XF = 150 // avant de la façade
const XB = 162 // dos de la façade, au fond du creux
const XS = 180 // face lumineuse du ruban
const XT = 210 // dos du U
const XW = 270 // mur
const YT0 = 40, YT1 = 52, YB0 = 368, YB1 = 380 // bords du haut et du bas (4 mm × 3)
const SH = 14.5 * 3 // largeur du ruban Flux × 3
// Façade coupée par deux découpes du motif, raccourcie entre 200 et 220
const WEB = [[YT1 - 1, 140], [165, 200], [220, 255], [280, YB0 + 1]]
const STRIPS = [YT1, YB0 - SH]
const RAYS = [
  [[XS, 70], [XW - 1.4, 30]], [[XW - 1.4, 30], [215, 4]],
  [[XS, 86], [XW - 1.4, 125]], [[XW - 1.4, 125], [110, 162]],
  [[XS, 350], [XW - 1.4, 390]], [[XW - 1.4, 390], [215, 416]],
  [[XS, 334], [XW - 1.4, 295]], [[XW - 1.4, 295], [110, 258]],
]
// Étiquettes côté pièce : point visé, position du texte (calé à droite), lignes
const LABELS = [
  [[195, 46], [138, 44], ['bord du U', '(4 mm)']],
  [[171, 70], [138, 76], ['ruban collé au fond,', 'contre le bord']],
  [[156, 122], [138, 118], ['façade 4 mm', 'avec le motif']],
  [[195, 300], [138, 300], ['creux de 16 mm']],
]

function Dim({ x0, x1, y, children }) {
  return (
    <g>
      <line x1={x0} y1={y} x2={x1} y2={y} className="stroke-slate-500" strokeWidth="0.8" />
      {[x0, x1].map(x => <line key={x} x1={x - 3} y1={y + 3} x2={x + 3} y2={y - 3} className="stroke-slate-500" strokeWidth="0.8" />)}
      <text x={(x0 + x1) / 2} y={y - 5} textAnchor="middle" className="fill-slate-400 font-mono text-[10px]">{children}</text>
    </g>
  )
}

export default function UProfileDiagram({ className = '' }) {
  const uid = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 320 420" className={className} role="img"
      aria-label="Coupe du panneau en U de 2 cm : façade de 4 mm avec le motif, bords de 4 mm qui reviennent vers le mur, ruban collé au fond du creux contre chaque bord ; la lumière rebondit sur le mur, fait le halo et ressort par le motif.">
      <defs>
        <pattern id={`h-${uid}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" className="stroke-slate-700" strokeWidth="1.1" />
        </pattern>
        <marker id={`a-${uid}`} viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0,1 L9.4,5 L0,9 Z" className="fill-amber-400" />
        </marker>
        <radialGradient id={`g-${uid}`}>
          <stop offset="0" stopColor="#fbbf24" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Mur, éclairé par le ruban */}
      <rect x={XW} y="0" width="44" height="420" className="fill-slate-800" />
      <rect x={XW} y="0" width="44" height="420" fill={`url(#h-${uid})`} />
      <line x1={XW} y1="0" x2={XW} y2="420" className="stroke-slate-500" />
      <text x={XW + 22} y="210" textAnchor="middle" transform={`rotate(90 ${XW + 22} 210)`} className="fill-slate-400 text-[10px] font-semibold tracking-[0.14em]">MUR</text>
      {[70, 350].map(cy => <ellipse key={cy} cx={XW} cy={cy} rx="24" ry="90" fill={`url(#g-${uid})`} />)}

      {/* Profilé en U : bords et façade (découpes du motif, panneau raccourci) */}
      {[[YT0, YT1], [YB0, YB1]].map(([y0, y1]) => (
        <rect key={y0} x={XF} y={y0} width={XT - XF} height={y1 - y0} className="fill-slate-700 stroke-slate-500" strokeWidth="0.8" />
      ))}
      {WEB.map(([y0, y1]) => (
        <rect key={y0} x={XF} y={y0} width={XB - XF} height={y1 - y0} className="fill-slate-700 stroke-slate-500" strokeWidth="0.8" />
      ))}
      {[200, 220].map(y => (
        <polyline key={y} points={[0, 1, 2, 3, 4].map(i => `${XF - 6 + 6 * i},${y + (i % 2 ? 2.5 : -2.5)}`).join(' ')} className="fill-none stroke-slate-400" />
      ))}

      {/* Rubans collés au fond du creux, contre chaque bord, face lumineuse vers le mur */}
      {STRIPS.map(y0 => (
        <g key={y0}>
          <ellipse cx={XS} cy={y0 + SH / 2} rx="18" ry="34" fill={`url(#g-${uid})`} />
          <rect x={XB} y={y0} width={XS - XB} height={SH} className="fill-slate-100 stroke-slate-400" strokeWidth="0.8" />
          <line x1={XS} y1={y0 + 2.5} x2={XS} y2={y0 + SH - 2.5} className="stroke-amber-400" strokeWidth="2.6" strokeLinecap="round" />
        </g>
      ))}

      {/* Trajet de la lumière */}
      {RAYS.map(([[x1, y1], [x2, y2]]) => (
        <line key={`${x1}${y1}${x2}`} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-amber-400" strokeWidth="1.7" strokeLinecap="round" markerEnd={`url(#a-${uid})`} />
      ))}
      <text x="224" y="9" className="fill-amber-300 text-[11px] font-semibold">halo</text>
      <text x="224" y="419" className="fill-amber-300 text-[11px] font-semibold">halo</text>
      <text x="104" y="166" textAnchor="end" className="fill-amber-300 text-[11px] font-semibold">motif éclairé</text>
      <text x="104" y="262" textAnchor="end" className="fill-amber-300 text-[11px] font-semibold">motif éclairé</text>

      {/* Cotes */}
      <Dim x0={XF} x1={XT} y={26}>2 cm</Dim>
      {[XF, XT].map(x => <line key={x} x1={x} y1={YT0 - 2} x2={x} y2="29" className="stroke-slate-600" strokeWidth="0.5" strokeDasharray="2 2" />)}
      <Dim x0={XF} x1={XB} y={400}>4</Dim>
      <Dim x0={XB} x1={XT} y={400}>16</Dim>
      {[XF, XB, XT].map(x => <line key={x} x1={x} y1={YB1 + 2} x2={x} y2="403" className="stroke-slate-600" strokeWidth="0.5" strokeDasharray="2 2" />)}
      <Dim x0={XT} x1={XW} y={210}>20–40 mm</Dim>
      <text x={(XT + XW) / 2} y="226" textAnchor="middle" className="fill-slate-400 font-mono text-[10px]">entretoises</text>

      {/* Légendes côté pièce */}
      {LABELS.map(([[tx, ty], [lx, ly], lines]) => (
        <g key={lines[0]}>
          <polyline points={`${tx},${ty} ${lx + 5},${ly - 4}`} className="fill-none stroke-slate-500" strokeWidth="0.8" />
          <circle cx={tx} cy={ty} r="1.8" className="fill-slate-400" />
          <text x={lx} y={ly} textAnchor="end" className="fill-slate-300 text-[11px] font-medium">
            {lines.map((t, i) => <tspan key={t} x={lx} dy={i === 0 ? 0 : 13}>{t}</tspan>)}
          </text>
        </g>
      ))}
      <text x="138" y="206" textAnchor="end" className="fill-slate-500 text-[10px] italic">
        <tspan x="138" dy="0">le panneau</tspan>
        <tspan x="138" dy="13">continue</tspan>
      </text>
      <text x="8" y="14" className="fill-slate-500 text-[10px] italic">côté pièce</text>
      <text x="8" y="414" className="fill-slate-500 text-[10px] italic">épaisseurs × 3</text>
    </svg>
  )
}
