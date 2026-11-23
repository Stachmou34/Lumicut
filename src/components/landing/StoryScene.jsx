import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StoryMotif from './StoryMotif'
import HumanSilhouette from '../ui/HumanSilhouette'
import { BASE_SCENE } from './storyChapters'

// Scène fixe du récit : une « vitrine » sur un mur, avec le panneau qui change au fil des chapitres.
// Positions en % de la scène (rapport 16:11) ; à l'échelle d'une pièce de 2,30 m de haut pour le chapitre format.
const STAGE_RATIO = 11 / 16 // hauteur / largeur
const ROOM_HEIGHT_CM = 230
const FLOOR_Y = 94 // sol, en % de la hauteur (même valeur que la classe top-[94%] du sol)
const EYE_LEVEL_CM = 150 // centre du panneau au mur
const STEP_MS = 2300 // durée de chaque étape d'un chapitre

// Boîte du panneau (en % de la scène) : grand panneau 2:1, ou format réel à l'échelle de la pièce
function panelBox(size) {
  if (!size) {
    const w = 58
    const h = (w * 0.5) / STAGE_RATIO
    return { left: 50 - w / 2, top: 47 - h / 2, width: w, height: h }
  }
  const cmToH = 100 / ROOM_HEIGHT_CM
  const cmToW = cmToH * STAGE_RATIO
  const w = size.width * cmToW
  const h = size.height * cmToH
  const cy = FLOOR_Y - EYE_LEVEL_CM * cmToH
  return { left: 60 - w / 2, top: cy - h / 2, width: w, height: h }
}

// Halo : le panneau agrandi selon la distance au mur (entretoises)
function haloBox(box, depth) {
  const spread = depth <= 20 ? 0.1 : depth <= 30 ? 0.17 : 0.26
  const dx = box.width * spread
  const dy = box.height * spread * 1.4
  return { left: box.left - dx, top: box.top - dy, width: box.width + 2 * dx, height: box.height + 2 * dy }
}

const pct = box => Object.fromEntries(Object.entries(box).map(([k, v]) => [k, `${v}%`]))

export default function StoryScene({ chapter, reduced = false }) {
  const [step, setStep] = useState(0)
  // Au chargement, le panneau s'allume après un court instant (aussitôt si le mouvement est réduit)
  const [poweredOn, setPoweredOn] = useState(reduced)

  useEffect(() => {
    if (reduced) { setPoweredOn(true); return undefined }
    const t = setTimeout(() => setPoweredOn(true), 700)
    return () => clearTimeout(t)
  }, [reduced])

  // Chaque chapitre repart de sa première étape, puis les fait défiler pendant la lecture
  useEffect(() => {
    setStep(0)
    if (reduced || chapter.steps.length < 2) return undefined
    const t = setInterval(() => setStep(s => (s + 1) % chapter.steps.length), STEP_MS)
    return () => clearInterval(t)
  }, [chapter, reduced])

  const scene = { ...BASE_SCENE, ...(chapter.steps[step] ?? chapter.steps[0]) }
  const lit = scene.lit && poweredOn
  const box = panelBox(scene.size)
  const halo = haloBox(box, scene.depth)
  const transition = reduced ? { duration: 0 } : { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
  const fade = reduced ? { duration: 0 } : { duration: 0.5 }
  // Découpes le jour : à peine visibles sur une matière sombre, plus marquées sur une matière claire
  const dayCut = scene.lightMaterial ? 'rgba(40,30,20,0.45)' : 'rgba(255,255,255,0.13)'
  const humanW = (48 * 100 / ROOM_HEIGHT_CM) * STAGE_RATIO
  const humanH = 170 * 100 / ROOM_HEIGHT_CM

  return (
    <div className="relative w-full max-w-[920px] aspect-[16/11] rounded-[28px] overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-black/60">
      {/* Mur : nuit, puis jour en fondu */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#1b2133_0%,#0b0e17_55%,#05060a_100%)]" />
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,#f6f2ea_0%,#e4ddd1_60%,#cfc6b7_100%)]"
        animate={{ opacity: scene.day ? 1 : 0 }}
        transition={transition}
      />

      {/* Sol et silhouette, pour l'échelle */}
      <motion.div
        className="absolute inset-x-0 top-[94%] bottom-0 border-t border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent"
        animate={{ opacity: scene.human ? 1 : 0 }}
        transition={fade}
      />
      <AnimatePresence>
        {scene.human && (
          <motion.div
            key="human"
            className="absolute"
            style={{ left: `${22 - humanW / 2}%`, width: `${humanW}%`, height: `${humanH}%`, bottom: `${100 - FLOOR_Y}%` }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 0.55, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={fade}
          >
            <HumanSilhouette className="w-full h-full" fill="#94a3b8" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Halo de lumière derrière le panneau */}
      <motion.div
        className="absolute rounded-[36px] blur-3xl"
        initial={false}
        animate={{ ...pct(halo), backgroundColor: scene.light, opacity: lit && !scene.gradient ? 0.55 : 0 }}
        transition={transition}
      />
      <AnimatePresence>
        {lit && scene.gradient && (
          <motion.div
            key={scene.gradient.join()}
            className="absolute rounded-[36px] blur-3xl"
            style={{ ...pct(halo), background: `conic-gradient(from 225deg, ${scene.gradient.join(', ')}, ${scene.gradient[0]})` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={fade}
          />
        )}
      </AnimatePresence>

      {/* Panneau */}
      <motion.div
        className="absolute rounded-md ring-1 ring-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
        initial={false}
        animate={{ ...pct(box), backgroundColor: scene.material }}
        transition={transition}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={`${scene.motif}-${scene.style}`}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={fade}
          >
            <StoryMotif
              motif={scene.motif}
              style={scene.style}
              color={lit ? scene.light : dayCut}
              gradient={lit ? scene.gradient : null}
              glow={lit}
              className="w-full h-full"
            />
          </motion.div>
        </AnimatePresence>

        {/* Entretoises aux quatre coins */}
        <AnimatePresence>
          {scene.standoffs && ['left-[3%] top-[6%]', 'right-[3%] top-[6%]', 'left-[3%] bottom-[6%]', 'right-[3%] bottom-[6%]'].map(pos => (
            <motion.span
              key={pos}
              className={`absolute ${pos} w-[3.2%] aspect-square rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffffff,#b8bec8_45%,#5b6270)] shadow-[0_1px_3px_rgba(0,0,0,0.6)]`}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={fade}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Légende de l'étape en cours */}
      <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          {scene.caption && (
            <motion.p
              key={scene.caption}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium backdrop-blur ${scene.day ? 'bg-white/70 text-slate-800' : 'bg-slate-950/60 text-slate-200 ring-1 ring-white/10'}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={fade}
            >
              {scene.caption}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
