import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { STUDIO_STEPS, getStep, stepIndex } from '../../lib/studioSteps'
import MotifSelector from './MotifSelector'
import PersonalizeStep from './PersonalizeStep'
import DimensionSelector from './DimensionSelector'
import MaterialSelector from './MaterialSelector'
import LightingSelector from './LightingSelector'
import FixingSelector from './FixingSelector'
import RecapStep from './RecapStep'
import StepFooter from './StepFooter'

function StepContent({ step, onStep }) {
  switch (step) {
    case 'motif': return <MotifSelector />
    case 'custom': return <PersonalizeStep />
    case 'size': return <DimensionSelector />
    case 'material': return <MaterialSelector />
    case 'led': return <LightingSelector />
    case 'fixing': return <FixingSelector />
    default: return <RecapStep onStep={onStep} />
  }
}

// Panneau de l'étape ouverte : en-tête façon page d'achat, choix de l'étape, prix et navigation en bas
export default function StepPanel({ step, onStep, onAskAdvisor }) {
  const meta = getStep(step)
  const scroller = useRef(null)

  // Nouvelle étape : on repart du haut
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [step])

  return (
    <aside className="flex-1 min-h-0 lg:flex-none lg:w-[420px] flex flex-col bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800">
      <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="px-4 lg:px-7 pt-4 lg:pt-7 pb-8">
          {/* Sur mobile, la barre d'étapes affiche déjà le numéro */}
          <p className="hidden lg:block text-xs font-medium text-amber-400">
            Étape {stepIndex(step) + 1} sur {STUDIO_STEPS.length}
          </p>
          <h1 className="lg:mt-1 text-xl lg:text-[28px] font-semibold leading-tight tracking-tight text-white">
            {meta.title} <span className="text-slate-400">{meta.question}</span>
          </h1>
          {step !== 'recap' && (
            <button
              type="button"
              onClick={onAskAdvisor}
              className="mt-1.5 lg:mt-2 text-sm text-amber-400 hover:text-amber-300 hover:underline"
            >
              Besoin d’aide pour choisir ? Demandez au conseiller ›
            </button>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
              className="mt-5 lg:mt-6"
            >
              <StepContent step={step} onStep={onStep} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <StepFooter step={step} onStep={onStep} />
    </aside>
  )
}
