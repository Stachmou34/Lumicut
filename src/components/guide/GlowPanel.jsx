import { motion, useReducedMotion } from 'framer-motion'
import StoryMotif from '../landing/StoryMotif'

// Panneau allumé au mur, la nuit : halo sur le mur et motif de la bibliothèque éclairé (aperçu décoratif)
export default function GlowPanel({ motif = 'cerf-elaphe', color = '#ffb15c', haloClass = 'bg-amber-400/50', className = '' }) {
  const reduced = useReducedMotion() ?? false
  return (
    <div className={`relative aspect-[16/11] w-full overflow-hidden rounded-[28px] ring-1 ring-white/10 shadow-2xl shadow-black/60 bg-[radial-gradient(ellipse_at_50%_40%,#1b2133_0%,#0b0e17_55%,#05060a_100%)] ${className}`}>
      {/* Halo renvoyé par le mur autour du panneau */}
      <motion.div
        className={`absolute left-[13%] right-[13%] top-[19%] bottom-[19%] rounded-[40px] blur-3xl ${haloClass}`}
        initial={reduced ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1.2 }}
      />
      {/* Panneau au format 2:1, motif découpé et éclairé */}
      <div className="absolute left-[21%] right-[21%] top-[29%] bottom-[29%] rounded-md bg-[#111114] ring-1 ring-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
        <StoryMotif motif={motif} color={color} glow className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  )
}
