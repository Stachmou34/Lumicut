import { useEffect, useRef } from 'react'
import { STUDIO_STEPS, stepIndex } from '../../lib/studioSteps'

// Barre des étapes, comme un configurateur automobile : numéro, nom, coche une fois l'étape vue.
// Toutes les étapes restent accessibles : chaque choix a une valeur par défaut.
export default function StepNav({ step, visited, onStep }) {
  const current = stepIndex(step)
  const buttons = useRef({})

  // Sur petit écran la barre défile : l'étape ouverte reste visible
  useEffect(() => {
    buttons.current[step]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [step])

  return (
    <nav aria-label="Étapes de configuration" className="overflow-x-auto [scrollbar-width:none]">
      <ol className="flex items-center w-max mx-auto py-1.5">
        {STUDIO_STEPS.map((s, i) => {
          const active = s.id === step
          const done = !active && visited.has(s.id)
          return (
            <li key={s.id} className="flex items-center">
              {i > 0 && (
                <span aria-hidden="true" className={`w-3 xl:w-5 h-px mx-1 ${i <= current ? 'bg-amber-400/60' : 'bg-slate-700'}`} />
              )}
              <button
                type="button"
                ref={el => { buttons.current[s.id] = el }}
                onClick={() => onStep(s.id)}
                aria-current={active ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm transition-colors ${
                  active
                    ? 'bg-amber-400/10 text-amber-300 font-medium'
                    : done
                      ? 'text-slate-200 hover:bg-slate-800'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span
                  className={`w-6 h-6 flex-shrink-0 rounded-full grid place-items-center text-xs font-semibold ${
                    active ? 'bg-amber-400 text-black' : done ? 'bg-slate-700 text-amber-300' : 'border border-slate-600'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span className="whitespace-nowrap">{s.label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
