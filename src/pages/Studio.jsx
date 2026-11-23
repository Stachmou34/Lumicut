import { useState, useEffect, lazy, Suspense } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useConfiguratorStore } from '../store/configuratorStore'
import { useCartStore } from '../store/cartStore'
import PanelPreview from '../components/studio/PanelPreview'
import LightToggle from '../components/ui/ToggleSwitch'
import DayNightToggle from '../components/studio/DayNightToggle'
import { deserializeDesign } from '../lib/designSerializer'
import StudioActions from '../components/studio/StudioActions'
import AIAdvisor from '../components/studio/AIAdvisor'
import StepNav from '../components/studio/StepNav'
import StepPanel from '../components/studio/StepPanel'
import { hasWebGL } from '../lib/panelMaterials'
import { ROOMS } from '../lib/rooms'
import { STUDIO_STEPS } from '../lib/studioSteps'
import { useCutCheckSync } from '../lib/useCutCheckSync'
import { useEditorShortcuts } from '../lib/useEditorShortcuts'
import { useLibrarySync } from '../lib/library/useLibrarySync'

// Vue 3D chargée à la demande : three.js n'alourdit pas le reste du site
const Studio3D = lazy(() => import('../components/studio/scene/Studio3D'))

// Bascule aperçu 2D / 3D
function PreviewModeToggle({ mode, onChange }) {
  return (
    <div className="flex flex-shrink-0 items-center gap-1 bg-slate-800 rounded-full p-1 border border-slate-700">
      {[['2d', '2D'], ['3d', '3D']].map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={mode === id}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${mode === id ? 'bg-amber-400 text-black shadow' : 'text-slate-500 hover:text-slate-300'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function Preview3DLoader() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400">
      <div className="w-10 h-10 border-2 border-slate-600 border-t-amber-400 rounded-full animate-spin" />
      <p className="text-xs">Chargement de la vue 3D…</p>
    </div>
  )
}

// Choix de la pièce de mise en situation (liste complète dans lib/rooms.js)
function RoomSelect({ value, onChange }) {
  return (
    <label className="flex flex-shrink-0 items-center gap-2 text-xs text-slate-400">
      <span className="hidden xl:inline">Pièce</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label="Pièce de mise en situation"
        className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-full px-3 py-1.5 focus:outline-none focus:border-amber-400"
      >
        {ROOMS.map(r => (
          <option key={r.id} value={r.id}>{r.emoji} {r.label}</option>
        ))}
      </select>
    </label>
  )
}

// Accès au panier depuis le studio, avec le nombre d'articles
function CartLink() {
  const count = useCartStore(s => s.items.reduce((n, i) => n + i.quantity, 0))
  return (
    <Link to="/cart" className="relative flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors" aria-label={`Panier (${count} article${count > 1 ? 's' : ''})`}>
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M6 7h12l-1 13H7L6 7Z" strokeLinejoin="round" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      <span className="hidden sm:inline text-sm">Panier</span>
      {count > 0 && (
        <span className="absolute -top-1.5 left-3 min-w-4 h-4 px-1 rounded-full bg-amber-400 text-black text-[10px] font-bold grid place-items-center">
          {count}
        </span>
      )}
    </Link>
  )
}

// Studio : configurateur étape par étape. Aperçu en grand, choix de l'étape à droite (en dessous sur mobile).
export default function Studio() {
  const { ambiance, setAmbiance, previewMode, setPreviewMode, applyDesign } = useConfiguratorStore()
  const [step, setStep] = useState(STUDIO_STEPS[0].id)
  // Étapes déjà ouvertes : cochées dans la barre d'étapes
  const [visited, setVisited] = useState(() => new Set([STUDIO_STEPS[0].id]))
  // Incrémenté à chaque changement d'étape (même vers l'étape ouverte) : la caméra 3D recadre
  const [focusTick, setFocusTick] = useState(0)
  const [advisorOpen, setAdvisorOpen] = useState(false)
  const webgl = hasWebGL()
  // Contrôle de fabrication recalculé à chaque modification (carte, 2D et 3D)
  useCutCheckSync()
  // Flèches, + / −, R, Suppr, Échap, Ctrl+Z / Ctrl+Y sur l'élément sélectionné
  useEditorShortcuts()
  // Motif de la bibliothèque : chargement de son SVG (y compris depuis un lien partagé)
  useLibrarySync()
  const show3D = webgl && previewMode === '3d'
  const [searchParams] = useSearchParams()
  const [sharedBanner, setSharedBanner] = useState(false)

  const goTo = id => {
    setStep(id)
    setVisited(v => (v.has(id) ? v : new Set(v).add(id)))
    setFocusTick(t => t + 1)
  }

  // Lien partagé : tous les réglages sont repris et le design est complet, on ouvre le résumé
  useEffect(() => {
    const encoded = searchParams.get('design')
    if (!encoded) return
    try {
      const data = deserializeDesign(encoded)
      if (!data) return
      // Tous les réglages du lien (texte compris) ; un motif généré est recréé à l'identique
      applyDesign(data)
      setSharedBanner(true)
      setStep('recap')
      setVisited(new Set(STUDIO_STEPS.map(s => s.id)))
    } catch {}
  }, [])

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-slate-950 text-slate-100">
      {/* En-tête : logo, étapes, galerie et panier (les étapes passent sur une 2e ligne sur mobile) */}
      <header className="flex-shrink-0 flex flex-wrap lg:flex-nowrap items-center gap-x-4 px-4 lg:px-6 bg-slate-900 border-b border-slate-800">
        <Link to="/" className="py-3 text-amber-400 font-bold text-lg tracking-tight">LumiCut</Link>
        <div className="order-last lg:order-none w-full lg:w-auto lg:flex-1 min-w-0 pb-1.5 lg:pb-0">
          <StepNav step={step} visited={visited} onStep={goTo} />
        </div>
        <div className="ml-auto flex items-center gap-5">
          <Link to="/gallery" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">Galerie</Link>
          <CartLink />
        </div>
      </header>

      {/* Bandeau lien partagé */}
      <AnimatePresence>
        {sharedBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 bg-amber-900/40 border-b border-amber-700/40 px-4 lg:px-6 py-2 flex items-center justify-between gap-3"
          >
            <span className="text-xs text-amber-300">✨ Design partagé — personnalisez-le ou commandez-le tel quel.</span>
            <button type="button" onClick={() => setSharedBanner(false)} aria-label="Fermer" className="text-amber-600 hover:text-amber-400 text-sm">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Aperçu : en grand à gauche, en haut sur mobile */}
        <section aria-label="Aperçu" className="h-[40dvh] flex-shrink-0 lg:h-auto lg:flex-1 lg:flex-shrink min-w-0 flex flex-col">
          <div className="flex-shrink-0 flex items-center gap-2 px-3 lg:px-4 py-2 border-b border-slate-800 bg-slate-900/60 overflow-x-auto [scrollbar-width:none]">
            {webgl && <PreviewModeToggle mode={previewMode} onChange={setPreviewMode} />}
            <LightToggle />
            <DayNightToggle />
            <RoomSelect value={ambiance} onChange={setAmbiance} />
            <div className="ml-auto flex-shrink-0">
              <StudioActions />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {show3D ? (
              <Suspense fallback={<Preview3DLoader />}>
                <Studio3D focus={step} focusTick={focusTick} />
              </Suspense>
            ) : (
              <PanelPreview />
            )}
          </div>
        </section>

        <StepPanel step={step} onStep={goTo} onAskAdvisor={() => setAdvisorOpen(true)} />
      </div>

      <AIAdvisor open={advisorOpen} onClose={() => setAdvisorOpen(false)} />
    </div>
  )
}
