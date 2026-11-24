// Pictogrammes du colis : panneau en U, ruban LED, kit de pose (traits fins, accents ambre)

export function PanelIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 96 64" className={className} aria-hidden="true">
      {/* Panneau en U vu de trois quarts : façade, tranche de 2 cm, motif */}
      <polygon points="10,14 74,8 74,50 10,56" className="fill-slate-800 stroke-slate-400" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="74,8 84,13 84,54 74,50" className="fill-slate-700 stroke-slate-400" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="18,46 32,30 40,38 52,22 66,42" className="fill-amber-400/90" />
      <circle cx="58" cy="19" r="4" className="fill-amber-300" />
    </svg>
  )
}

export function StripIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 96 64" className={className} aria-hidden="true">
      {/* Rouleau de ruban et son extrémité déroulée, LED allumées */}
      <circle cx="30" cy="32" r="20" className="fill-slate-800 stroke-slate-400" strokeWidth="1.5" />
      <circle cx="30" cy="32" r="12" className="fill-none stroke-slate-500" strokeWidth="1.5" />
      <circle cx="30" cy="32" r="5" className="fill-slate-950 stroke-slate-500" strokeWidth="1.5" />
      <path d="M30 52 L86 52 L86 42 L40 42" className="fill-slate-100 stroke-slate-400" strokeWidth="1.2" strokeLinejoin="round" />
      {[48, 58, 68, 78].map(x => <circle key={x} cx={x} cy="47" r="2" className="fill-amber-400" />)}
    </svg>
  )
}

export function MountIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 96 64" className={className} aria-hidden="true">
      {/* Entretoise, capuchon et vis */}
      <rect x="10" y="22" width="40" height="20" rx="3" className="fill-slate-300 stroke-slate-500" strokeWidth="1.5" />
      <path d="M58 22 h6 a5 10 0 0 1 0 20 h-6 Z" className="fill-slate-300 stroke-slate-500" strokeWidth="1.5" />
      <line x1="70" y1="32" x2="88" y2="32" className="stroke-amber-400" strokeWidth="3" strokeLinecap="round" />
      <line x1="74" y1="28" x2="74" y2="36" className="stroke-amber-400" strokeWidth="1.5" />
      <line x1="80" y1="28" x2="80" y2="36" className="stroke-amber-400" strokeWidth="1.5" />
    </svg>
  )
}
