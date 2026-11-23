// Briques visuelles communes aux étapes du studio, dans l'esprit d'une page d'achat :
// sous-titres sobres, grandes cartes de choix, sélection nette.

// Sous-titre d'une partie d'étape, avec une aide facultative en dessous
export function SubTitle({ children, hint }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-slate-100">{children}</h2>
      {hint && <p className="mt-0.5 text-sm text-slate-400 leading-snug">{hint}</p>}
    </div>
  )
}

// Carte de choix : titre, précision, prix ou mention à droite, visuel à gauche.
// children s'affiche sous la carte sélectionnée (jamais d'élément cliquable : on est dans un bouton).
export function OptionCard({ active, onClick, title, subtitle, aside, leading = null, children = null, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full text-left rounded-2xl border transition-colors ${compact ? 'p-3' : 'p-4'} ${
        active
          ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-400/[0.06]'
          : 'border-slate-700 bg-slate-800/40 hover:border-slate-500'
      }`}
    >
      <span className="flex items-center gap-3">
        {leading}
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold text-slate-100 leading-snug">{title}</span>
          {subtitle && <span className="block mt-0.5 text-sm text-slate-400 leading-snug">{subtitle}</span>}
        </span>
        {aside && (
          <span className={`text-sm text-right whitespace-nowrap ${active ? 'text-amber-300' : 'text-slate-300'}`}>{aside}</span>
        )}
      </span>
      {children}
    </button>
  )
}

// Choix court sur une ligne (pose, déport, alimentation…)
export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 bg-slate-800/70 rounded-full p-1 border border-slate-700">
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`flex-1 py-2 px-2 rounded-full text-sm font-medium transition-colors ${
            value === o.id ? 'bg-slate-100 text-slate-900 shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
