import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  motion, AnimatePresence, animate, useMotionValue, useTransform, useReducedMotion, useInView,
} from 'framer-motion'
import { stripSection } from '../../lib/lighting/lightingCatalog'
import { gradientAt, mixHex } from '../../lib/lighting/colorTemperature'
import { panelProfile } from '../../lib/panelProfile'
import { stripLoop, loopPoint, loopPolyline, NOTCH_WIDTH_MM, NOTCH_DEPTH_MM, STRIP_START_MM } from '../../lib/stripLayout'
import { computeFixingHoles, HOLE_INSET_CM } from '../../lib/fixings'
import { buildCutMask } from '../../lib/cutMask'
import { designFromState } from '../../lib/panelDesign'

// Animation de pose du ruban, à l'étape Éclairage : le panneau configuré, vu de dos (mêmes vues que le
// guide de pose), le ruban choisi qui se colle depuis l'encoche, se coupe, se branche et s'allume.
// Tout vient du calcul réel (lightingFor) : longueur gardée, reste à l'encoche, section du ruban.
// Un changement de ruban ou de couleur s'anime : largeur, longueur, couleurs, balayage de lumière.

// Repère du dessin (unités SVG, environ des pixels à la largeur du panneau d'étape)
const VW = 360
const VH = 214
const MARGIN = { top: 14, bottom: 46, side: 18 }
// Épaisseurs (bords, creux, ruban) : jamais moins de 0,85 px par mm, pour rester lisibles sur les
// grands formats (elles sont alors agrandies, et c'est indiqué)
const T_MIN = 0.85
// Perspective cavalière : la profondeur part vers le haut à droite, comme dans le guide
const COS = 0.72 * Math.cos((40 * Math.PI) / 180)
const SIN = 0.72 * Math.sin((40 * Math.PI) / 180)
const EASE = [0.22, 1, 0.36, 1]
const SPRING = { type: 'spring', stiffness: 160, damping: 24 }
// Écart entre deux LED dessinées sur le ruban (unités SVG)
const LED_PITCH = 7

const PHASES = [
  { id: 'notch', label: 'Départ' },
  { id: 'lay', label: 'Collage' },
  { id: 'cut', label: 'Coupe' },
  { id: 'power', label: 'Allumage' },
]

const num = v => String(Math.round(v * 10) / 10).replace('.', ',')

// Place du panneau dans le dessin : s = échelle du contour (px/mm), t = échelle des épaisseurs
function stageGeometry(widthCm, heightCm, profile) {
  const wMm = widthCm * 10
  const hMm = heightCm * 10
  const availW = VW - 2 * MARGIN.side
  const availH = VH - MARGIN.top - MARGIN.bottom
  const first = Math.max(Math.min(availW / wMm, availH / hMm), T_MIN)
  const dx = profile.depthMm * first * COS
  const dy = profile.depthMm * first * SIN
  const s = Math.min((availW - dx) / wMm, (availH - dy) / hMm)
  const t = Math.max(s, T_MIN)
  const PW = wMm * s
  const PH = hMm * s
  return {
    s, t, PW, PH,
    OX: (VW - PW - dx) / 2,
    OY: MARGIN.top + dy + (availH - dy - PH) / 2,
    rimMm: profile.rimMm, floorMm: profile.hollowMm, depthMm: profile.depthMm,
    exaggerated: t / s > 1.15,
  }
}

// Point du dessin : (u, v) dans le plan du dos du panneau (origine en haut à gauche), d = profondeur (mm)
// depuis le dos du U vers la façade
const proj = (G, u, v, d) => [G.OX + u + d * G.t * COS, G.OY + v - d * G.t * SIN]
// Point du tour du ruban (repère vu de face, centré) → dessin vu de dos (gauche et droite inversées)
const fromLoop = (G, [x, y], d) => proj(G, G.PW / 2 - x, G.PH / 2 - y, d)
const pathOf = pts => (pts.length ? `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L')}` : '')
const pointsOf = pts => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

// Tour du ruban en unités du dessin, pour une largeur de ruban w (mm)
const loopFor = (G, w) => stripLoop(G.PW, G.PH, (G.rimMm + w / 2) * G.t, STRIP_START_MM * G.t)

// Géométrie d'une image de l'animation : f = part du tour collée, w × h = section du ruban (mm),
// lit = part allumée du ruban collé, sweep = position du balayage de lumière (changement),
// coreRatio = largeur éclairée du ruban (micro LED : presque toute la largeur)
function frameGeometry(G, f, w, h, lit, sweep, coreRatio) {
  const loop = loopFor(G, w)
  const laid = f * loop.length
  const dLed = G.floorMm - h
  const wpx = w * G.t
  const core = wpx * coreRatio
  const at = (pts, d) => pathOf(pts.map(p => fromLoop(G, p, d)))
  const litArc = lit * laid

  // Partie allumée de chaque tronçon, prolongée d'une demi-largeur dans les coins (traits à bouts droits)
  const pieces = loop.segments.map((seg, side) => {
    const end = seg.start + seg.length
    const b = Math.min(end, litArc)
    if (b <= seg.start + 1e-6) return ''
    const dir = [(seg.to[0] - seg.from[0]) / seg.length, (seg.to[1] - seg.from[1]) / seg.length]
    const p0 = loopPoint(loop, seg.start)
    const p1 = loopPoint(loop, b)
    const e0 = side > 0 ? core / 2 : 0
    const e1 = b >= end - 1e-6 && litArc > end + 1e-6 ? core / 2 : 0
    return at([[p0.x - dir[0] * e0, p0.y - dir[1] * e0], [p1.x + dir[0] * e1, p1.y + dir[1] * e1]], dLed)
  })

  const tip = loopPoint(loop, laid)
  const [tx, ty] = fromLoop(G, [tip.x, tip.y], dLed)
  const a = Math.max(0, (sweep - 0.25) * laid)
  const b = Math.min(laid, sweep * laid)
  return {
    body: at(loopPolyline(loop, 0, laid), dLed),
    side: at(loopPolyline(loop, 0, laid), G.floorMm),
    pieces,
    sweep: b > a ? at(loopPolyline(loop, a, b), dLed) : '',
    gap: at(loopPolyline(loop, laid, loop.length), dLed),
    tip: [tx, ty],
    wpx,
    core,
  }
}

// Ciseaux (même dessin que le guide de pose)
function Scissors() {
  return (
    <g className="stroke-amber-300 fill-none" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="-4.5" cy="6.5" r="3" />
      <circle cx="4.5" cy="6.5" r="3" />
      {/* Lames qui se referment deux fois : la coupe */}
      <motion.line x1="-2.6" y1="4.2" x2="4.5" y2="-8" initial={{ rotate: 0 }} animate={{ rotate: [0, -12, 0, -12, 0] }}
        transition={{ duration: 0.7, delay: 0.25 }} />
      <motion.line x1="2.6" y1="4.2" x2="-4.5" y2="-8" initial={{ rotate: 0 }} animate={{ rotate: [0, 12, 0, 12, 0] }}
        transition={{ duration: 0.7, delay: 0.25 }} />
    </g>
  )
}

// Loupe : coupe du bord du bas à l'échelle (×2,4), ruban collé au fond du creux contre le bord,
// face lumineuse tournée vers le mur. La section du ruban s'anime quand on change de modèle.
function SectionLens({ G, section, lit, color, reduced }) {
  const uid = useId().replace(/:/g, '')
  const k = 2.4
  const xF = 26 // dos de la façade (fond du creux)
  const yR = 62 // dessus du bord du bas
  const face = G.depthMm - G.floorMm
  const xU = xF + G.floorMm * k // dos du U
  const sw = section.widthMm * k
  const sh = section.heightMm * k
  const transition = reduced ? { duration: 0 } : SPRING
  return (
    <svg viewBox="0 0 84 84" className="w-[84px] h-[84px] flex-shrink-0" role="img"
      aria-label={`Coupe du bord : ruban de ${num(section.widthMm)} × ${num(section.heightMm)} mm collé au fond d’un creux de ${G.floorMm} mm, contre le bord.`}>
      <defs>
        <clipPath id={`lc-${uid}`}><circle cx="42" cy="42" r="40" /></clipPath>
        <filter id={`lb-${uid}`} x="0" y="0" width="84" height="84" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="2.4" /></filter>
      </defs>
      <g clipPath={`url(#lc-${uid})`}>
        <rect width="84" height="84" className="fill-slate-900" />
        {/* Mur éclairé, côté droit */}
        <motion.rect x={xU + 4} y="0" width="40" height="84" initial={false} animate={{ fill: color, opacity: lit ? 0.22 : 0 }} transition={{ duration: 0.6 }} />
        {/* Façade (à gauche) et bord du bas */}
        <rect x={xF - face * k} y="-2" width={face * k} height={yR + G.rimMm * k + 2} className="fill-slate-600" />
        <rect x={xF - face * k} y={yR} width={xU - xF + face * k} height={G.rimMm * k} className="fill-slate-600" />
        {/* Ruban : support blanc, face lumineuse vers le mur */}
        <motion.rect x={xF} initial={false} animate={{ y: yR - sw, width: sh, height: sw }} transition={transition}
          className={`fill-slate-100 stroke-slate-400 ${section.known ? '' : '[stroke-dasharray:2_1.5]'}`} strokeWidth="0.7" />
        <motion.line initial={false} animate={{ x1: xF + sh, x2: xF + sh, y1: yR - sw + 1.2, y2: yR - 1.2, stroke: color, opacity: lit ? 1 : 0.35 }}
          transition={transition} strokeWidth="1.8" strokeLinecap="round" />
        <motion.line initial={false} animate={{ x1: xF + sh + 1, x2: xF + sh + 1, y1: yR - sw, y2: yR, stroke: color, opacity: lit ? 0.9 : 0 }}
          transition={transition} strokeWidth="5" filter={`url(#lb-${uid})`} />
      </g>
      <circle cx="42" cy="42" r="40" className="fill-none stroke-slate-500" strokeWidth="1.2" />
    </svg>
  )
}

// Nombre animé (centimètres) : défile vers la nouvelle valeur
function Counter({ value, reduced }) {
  const mv = useMotionValue(value)
  const text = useTransform(mv, num)
  useEffect(() => {
    if (reduced) { mv.set(value); return undefined }
    const controls = animate(mv, value, { duration: 0.7, ease: EASE })
    return () => controls.stop()
  }, [value, reduced]) // eslint-disable-line react-hooks/exhaustive-deps
  return <motion.span>{text}</motion.span>
}

function Fact({ label, hint, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-100 tabular-nums">{children}</dd>
      {hint && <dd className="text-[11px] text-slate-500 leading-tight">{hint}</dd>}
    </div>
  )
}

// Motif du client, vu de dos : masque de découpe (blanc = matière) utilisé comme masque SVG
function useMotifMask(state) {
  const design = useMemo(() => designFromState(state), [ // eslint-disable-line react-hooks/exhaustive-deps
    state.motifId, state.aiMotifSvg, state.librarySvg, state.libraryForme, state.libraryStyles, state.cutStyle,
    state.cutStyleParams, state.generator, state.width, state.height, state.motifScale, state.motifX, state.motifY,
    state.motifRotation, state.motifMirrorH, state.motifMirrorV, state.showText, state.textContent, state.textSecondary,
    state.textFont, state.textAlign, state.textLetterSpacing, state.textSize, state.textPosition, state.textX,
    state.textY, state.textRotation, state.mounting, state.material,
  ])
  const key = JSON.stringify(design)
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let alive = true
    // Trous des fixations dessinés à part (placés comme les épaisseurs agrandies)
    buildCutMask({ ...design, holes: [] }, 420)
      .then(canvas => { if (alive) setUrl(canvas.toDataURL('image/png')) })
      .catch(() => { if (alive) setUrl(null) })
    return () => { alive = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return url
}

// pinned : dessin épinglé en haut du panneau d'étape (studio, sur ordinateur) ;
// guideLink : lien vers le guide de pose (inutile sur le guide lui-même)
export default function StripInstallPreview({ state, lighting, pinned = true, guideLink = true }) {
  const reduced = useReducedMotion()
  const uid = useId().replace(/:/g, '')
  const stageRef = useRef(null)
  const sentinelRef = useRef(null)
  const inView = useInView(stageRef, { once: true, amount: 0.45 })
  const stuck = !useInView(sentinelRef)
  const [phase, setPhase] = useState(reduced ? 'done' : 'idle')
  const [playId, setPlayId] = useState(0)
  const maskUrl = useMotifMask(state)

  const profile = panelProfile(state.material)
  const G = useMemo(() => stageGeometry(state.width, state.height, profile), [state.width, state.height, profile.rimMm, profile.hollowMm]) // eslint-disable-line react-hooks/exhaustive-deps
  const section = stripSection(state.lightModel)
  const hue = lighting.hue
  const fTarget = lighting.runCm > 0 ? Math.min(1, lighting.cutCm / lighting.runCm) : 1
  const gapCm = Math.max(0, Math.round((lighting.runCm - lighting.cutCm) * 10) / 10)
  const step = lighting.model.cutStepCm
  const colors = hue && state.ledMode === 'gradient' ? state.ledGradient : [state.ledColor]
  const mainColor = colors.length > 1 ? mixHex(colors) : colors[0]
  const omni = state.lightModel === 'hue-omniglow'

  // Valeurs animées
  const appear = useMotionValue(reduced ? 1 : 0)
  const laidF = useMotionValue(reduced ? fTarget : 0)
  const wMm = useMotionValue(section.widthMm)
  const hMm = useMotionValue(section.heightMm)
  const litF = useMotionValue(reduced ? 1 : 0)
  const glow = useMotionValue(reduced ? 1 : 0)
  const cable = useMotionValue(reduced ? 1 : 0)
  const cutMark = useMotionValue(reduced ? 1 : 0)
  const sweep = useMotionValue(0)
  const sweepOpacity = useTransform(sweep, v => (v > 0 && v < 1 ? Math.sin(Math.PI * v) * 0.95 : 0))
  const controllerOpacity = useTransform(cable, [0.8, 1], [0, 1])
  // Câble invisible tant qu'il n'est pas tiré (un trait de longueur nulle laisse un point)
  const cableOpacity = useTransform(cable, v => (v > 0.002 ? 1 : 0))

  const geo = useTransform([laidF, wMm, hMm, litF, sweep], ([f, w, h, lit, sw]) => frameGeometry(G, f, w, h, lit, sw, omni ? 0.8 : 0.62))
  const bodyD = useTransform(geo, g => g.body)
  const sideD = useTransform(geo, g => g.side)
  const sweepD = useTransform(geo, g => g.sweep)
  const gapD = useTransform(geo, g => g.gap)
  const piece0 = useTransform(geo, g => g.pieces[0])
  const piece1 = useTransform(geo, g => g.pieces[1])
  const piece2 = useTransform(geo, g => g.pieces[2])
  const piece3 = useTransform(geo, g => g.pieces[3])
  const piece4 = useTransform(geo, g => g.pieces[4])
  const pieceD = [piece0, piece1, piece2, piece3, piece4]
  const wpx = useTransform(geo, g => g.wpx)
  const corePx = useTransform(geo, g => g.core)
  const glowPx = useTransform(geo, g => g.wpx + 8)
  const dotPx = useTransform(geo, g => Math.max(1.5, g.wpx * 0.2))
  const tipX = useTransform(geo, g => g.tip[0])
  const tipY = useTransform(geo, g => g.tip[1])

  // Longueur collée, affichée en direct pendant la pose (valeur exacte une fois posée)
  const runRef = useRef(lighting.runCm)
  const cutRef = useRef(lighting.cutCm)
  runRef.current = lighting.runCm
  cutRef.current = lighting.cutCm
  const laidText = useTransform(laidF, f => {
    const v = f * runRef.current
    return Math.abs(v - cutRef.current) < 0.05 ? num(cutRef.current) : String(Math.round(v))
  })
  const glowOpacity = useTransform(glow, v => v * 0.85)
  const washOpacity = useTransform(glow, v => v * 0.1)
  const bloomOpacity = useTransform(glow, v => v * 0.4)

  // Cible du moment (le modèle peut changer pendant l'animation)
  const target = useRef(fTarget)
  target.current = fTarget

  // Lecture de la pose : départ, collage, coupe, branchement et allumage
  useEffect(() => {
    if (reduced) {
      appear.set(1); laidF.set(target.current); litF.set(1); glow.set(1); cable.set(1); cutMark.set(1)
      setPhase('done')
      return undefined
    }
    if (!inView) return undefined
    let cancelled = false
    const running = []
    const play = (mv, to, options) => {
      const c = animate(mv, to, options)
      running.push(c)
      return c
    }
    const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
    ;(async () => {
      appear.set(0); laidF.set(0); litF.set(0); glow.set(0); cable.set(0); cutMark.set(0)
      setPhase('notch')
      await play(appear, 1, { duration: 0.55, ease: EASE })
      await pause(900)
      if (cancelled) return
      setPhase('lay')
      await play(laidF, target.current, { duration: layDuration(cutRef.current), ease: [0.45, 0.05, 0.25, 1] })
      if (cancelled) return
      setPhase('cut')
      await play(cutMark, 1, { duration: 0.4 })
      await pause(1000)
      if (cancelled) return
      setPhase('power')
      await play(cable, 1, { duration: 0.65, ease: 'easeInOut' })
      if (cancelled) return
      await play(litF, 1, { duration: 0.85, ease: 'easeOut' })
      if (cancelled) return
      await play(glow, 1, { duration: 0.7, ease: 'easeOut' })
      if (cancelled) return
      setPhase('done')
    })()
    return () => {
      cancelled = true
      running.forEach(c => c.stop())
    }
  }, [inView, playId, reduced]) // eslint-disable-line react-hooks/exhaustive-deps

  // Changement de ruban : largeur, épaisseur et longueur collée glissent vers les nouvelles valeurs
  useEffect(() => {
    if (reduced) { wMm.set(section.widthMm); hMm.set(section.heightMm); return undefined }
    const a = animate(wMm, section.widthMm, SPRING)
    const b = animate(hMm, section.heightMm, SPRING)
    return () => { a.stop(); b.stop() }
  }, [section.widthMm, section.heightMm, reduced]) // eslint-disable-line react-hooks/exhaustive-deps
  const settled = phase === 'cut' || phase === 'power' || phase === 'done'
  useEffect(() => {
    if (!settled) return undefined
    if (reduced) { laidF.set(fTarget); return undefined }
    const c = animate(laidF, fTarget, SPRING)
    return () => c.stop()
  }, [fTarget, settled, reduced]) // eslint-disable-line react-hooks/exhaustive-deps

  // Changement de modèle, de mode ou de préréglage : un balayage de lumière parcourt le ruban
  const changeKey = `${state.lightModel}|${state.ledMode}|${state.ledPreset}`
  const lastKey = useRef(changeKey)
  useEffect(() => {
    if (lastKey.current === changeKey) return undefined
    lastKey.current = changeKey
    if (phase !== 'done' || reduced) return undefined
    sweep.set(0)
    const c = animate(sweep, 1, { duration: 1.1, ease: [0.4, 0, 0.2, 1] })
    return () => c.stop()
  }, [changeKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Géométrie cible (dégradés le long du ruban, ciseaux, câble, étiquettes)
  const final = useMemo(() => {
    const loop = loopFor(G, section.widthMm)
    const laid = fTarget * loop.length
    const dLed = G.floorMm - section.heightMm
    const sides = loop.segments.map(seg => {
      const b = Math.min(seg.start + seg.length, laid)
      if (b <= seg.start + 1e-6) return null
      const p0 = loopPoint(loop, seg.start)
      const p1 = loopPoint(loop, b)
      return { a: seg.start, b, from: fromLoop(G, [p0.x, p0.y], dLed), to: fromLoop(G, [p1.x, p1.y], dLed) }
    })
    const end = loopPoint(loop, laid)
    const gapMid = loopPoint(loop, (laid + loop.length) / 2)
    const start = loopPoint(loop, 0)
    return {
      laid,
      sides,
      end: fromLoop(G, [end.x, end.y], dLed),
      gapMid: fromLoop(G, [gapMid.x, gapMid.y], dLed),
      start: fromLoop(G, [start.x, start.y], G.floorMm - section.heightMm / 2),
    }
  }, [G, section.widthMm, section.heightMm, fTarget])

  // Couleurs le long du ruban : 4 arrêts par tronçon
  const stopsFor = side => {
    const s = final.sides[side]
    if (!s) return []
    return [0, 1, 2, 3].map(k => gradientAt(colors, (s.a + ((s.b - s.a) * k) / 3) / final.laid))
  }

  // Contour du U vu de dos
  const r = G.rimMm * G.t
  const { PW, PH } = G
  const rect = (x0, y0, x1, y1, d) => [proj(G, x0, y0, d), proj(G, x1, y0, d), proj(G, x1, y1, d), proj(G, x0, y1, d)]
  const ring = `${pathOf(rect(0, 0, PW, PH, 0))} Z ${pathOf(rect(r, r, PW - r, PH - r, 0))} Z`
  const floor = rect(r, r, PW - r, PH - r, G.floorMm)
  const floorOrigin = proj(G, 0, 0, G.floorMm)
  const nw = NOTCH_WIDTH_MM * G.t
  const notch = [proj(G, PW / 2 - nw / 2, PH, 0), proj(G, PW / 2 - nw / 2, PH - r, 0), proj(G, PW / 2 - nw / 2, PH - r, NOTCH_DEPTH_MM),
    proj(G, PW / 2 + nw / 2, PH - r, NOTCH_DEPTH_MM), proj(G, PW / 2 + nw / 2, PH, NOTCH_DEPTH_MM), proj(G, PW / 2 + nw / 2, PH, 0)]
  const notchCenter = proj(G, PW / 2, PH - r / 2, 0)

  // Trous des entretoises (à 3 cm du bord, gardés hors du ruban même quand les épaisseurs sont agrandies)
  const holes = computeFixingHoles(state.width, state.height, state.mounting).map(h => {
    // Distance au bord gauche (vu de dos) ou au bord du haut ; x > 0 (droite vu de face) passe à gauche
    const along = (c, half, size) => (Math.abs(Math.abs(c) - (half - HOLE_INSET_CM)) < 1e-6
      ? (c > 0 ? HOLE_INSET_CM * 10 * G.t : size - HOLE_INSET_CM * 10 * G.t)
      : size / 2 - c * 10 * G.s)
    const u = along(h.x, state.width / 2, PW)
    const v = along(h.y, state.height / 2, PH)
    const [cx, cy] = proj(G, u, v, G.floorMm)
    return { cx, cy, r: Math.max(2.2, h.r * 10 * G.t) }
  })

  // Câble : du bout du ruban, par l'encoche, vers le boîtier d'alimentation
  const cableEnd = [notchCenter[0] + 34, G.OY + PH + 30]
  const [ax, ay] = final.start
  const exit = proj(G, PW / 2, PH + 12, 0)
  const cablePath = `M${ax.toFixed(1)} ${ay.toFixed(1)} C${(ax - 2).toFixed(1)} ${(ay + 7).toFixed(1)} ${(notchCenter[0] + 4).toFixed(1)} ${(notchCenter[1] - 6).toFixed(1)} ${notchCenter[0].toFixed(1)} ${notchCenter[1].toFixed(1)}`
    + ` S${(exit[0] - 1).toFixed(1)} ${(exit[1] - 8).toFixed(1)} ${exit[0].toFixed(1)} ${exit[1].toFixed(1)}`
    + ` S${(cableEnd[0] - 20).toFixed(1)} ${cableEnd[1].toFixed(1)} ${cableEnd[0].toFixed(1)} ${cableEnd[1].toFixed(1)}`

  const phaseIndex = phase === 'done' ? PHASES.length : PHASES.findIndex(p => p.id === phase)
  const caption = {
    idle: 'Le ruban part de l’encoche du câble, au milieu du bord du bas.',
    notch: 'Le ruban part de l’encoche du câble, au milieu du bord du bas.',
    lay: 'Collez-le au fond du creux, contre le bord, en faisant le tour du panneau.',
    cut: !hue
      ? 'Le ruban blanc arrive déjà coupé à la bonne longueur : rien à couper.'
      : step
        ? `Coupez au dernier repère qui tient (tous les ${num(step)} cm) : le petit reste à l’encoche est normal.`
        : 'Coupez au repère le plus proche de l’encoche.',
    power: 'Passez le câble par l’encoche et branchez : la lumière part vers le mur.',
    done: 'Posé et allumé : le ruban reste invisible, de face comme de profil.',
  }[phase]
  const durations = { notch: 1.45, lay: layDuration(lighting.cutCm), cut: 1.4, power: 2.2 }
  const lit = phase === 'done' || phase === 'power'

  // Sur ordinateur, le dessin reste en haut du panneau pendant qu'on choisit le ruban et la couleur
  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-px -mb-px" />
      <div className={pinned ? 'lg:sticky lg:top-0 z-10 bg-slate-900 lg:-mx-7 lg:px-7 lg:pt-3 lg:-mt-3' : ''}>
        <div className={`border border-slate-800 bg-slate-950 overflow-hidden rounded-t-3xl border-b-0 transition-shadow duration-300 ${pinned && stuck ? 'lg:rounded-b-3xl lg:border-b lg:shadow-xl lg:shadow-black/60' : ''}`}>
        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1">
          <h2 className="text-sm font-semibold text-slate-100 truncate">
            Pose du ruban <span className="font-normal text-slate-400">· vu de dos, {state.width} × {state.height} cm</span>
          </h2>
          <AnimatePresence>
            {phase === 'done' && !reduced && (
              <motion.button
                key="replay"
                type="button"
                onClick={() => setPlayId(n => n + 1)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex-shrink-0 inline-flex items-center gap-1 rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
              >
                <svg viewBox="0 0 16 16" className="w-3 h-3 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
                  <path d="M13.8 2.6v3.2h-3.2" />
                </svg>
                Revoir
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div ref={stageRef} className="bg-[radial-gradient(ellipse_at_50%_40%,#1e293b_0%,#0f172a_55%,#020617_100%)]">
          <motion.svg
            viewBox={`0 0 ${VW} ${VH}`}
            className="block w-full h-auto"
            role="img"
            aria-label={`Votre panneau vu de dos : le ruban part de l’encoche du câble, fait le tour du creux contre le bord et s’arrête à ${num(lighting.cutCm)} cm${gapCm >= 0.5 ? `, avec ${num(gapCm)} cm de reste à l’encoche` : ''}.`}
            style={{ opacity: appear }}
          >
            <defs>
              <filter id={`sg-${uid}`} x="0" y="0" width={VW} height={VH} filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="3.6" /></filter>
              <filter id={`sb-${uid}`} x="0" y="0" width={VW} height={VH} filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="9" /></filter>
              {maskUrl && (
                <mask id={`mm-${uid}`} maskUnits="userSpaceOnUse" x="0" y="0" width={VW} height={VH}>
                  <g transform={`translate(${(floorOrigin[0] + PW).toFixed(2)} ${floorOrigin[1].toFixed(2)}) scale(-1 1)`}>
                    <image href={maskUrl} x="0" y="0" width={PW} height={PH} preserveAspectRatio="none" />
                  </g>
                </mask>
              )}
              {final.sides.map((s, side) => s && (
                <linearGradient key={side} id={`sc-${uid}-${side}`} gradientUnits="userSpaceOnUse"
                  x1={s.from[0]} y1={s.from[1]} x2={s.to[0]} y2={s.to[1]}>
                  {stopsFor(side).map((c, k) => (
                    <motion.stop key={k} offset={k / 3} initial={false} animate={{ stopColor: c }} transition={{ duration: reduced ? 0 : 0.7, ease: EASE }} />
                  ))}
                </linearGradient>
              ))}
            </defs>

            {/* Tranches extérieures du U : bords (dessus, droite), puis façade */}
            <g strokeWidth="0.6">
              <polygon points={pointsOf([proj(G, 0, 0, 0), proj(G, PW, 0, 0), proj(G, PW, 0, G.floorMm), proj(G, 0, 0, G.floorMm)])} className="fill-slate-600 stroke-slate-500" />
              <polygon points={pointsOf([proj(G, PW, 0, 0), proj(G, PW, PH, 0), proj(G, PW, PH, G.floorMm), proj(G, PW, 0, G.floorMm)])} className="fill-slate-700 stroke-slate-500" />
              <polygon points={pointsOf([proj(G, 0, 0, G.floorMm), proj(G, PW, 0, G.floorMm), proj(G, PW, 0, G.depthMm), proj(G, 0, 0, G.depthMm)])} className="fill-slate-700 stroke-slate-600" />
              <polygon points={pointsOf([proj(G, PW, 0, G.floorMm), proj(G, PW, PH, G.floorMm), proj(G, PW, PH, G.depthMm), proj(G, PW, 0, G.depthMm)])} className="fill-slate-800 stroke-slate-600" />
            </g>

            {/* Fond du creux : dos de la façade, avec le motif découpé (vu de dos) */}
            <g mask={maskUrl ? `url(#mm-${uid})` : undefined}>
              <polygon points={pointsOf(floor)} className="fill-slate-800" />
              {/* Lumière renvoyée par le mur sur le dos de la façade */}
              <motion.polygon points={pointsOf(floor)} initial={false} animate={{ fill: mainColor }} transition={{ duration: 0.7 }}
                style={{ opacity: washOpacity }} />
            </g>
            {holes.map(h => (
              <circle key={`${h.cx}${h.cy}`} cx={h.cx} cy={h.cy} r={h.r} className="fill-slate-950 stroke-slate-500" strokeWidth="0.7" />
            ))}

            {/* Parois intérieures visibles du creux (bas et gauche) */}
            <polygon points={pointsOf([proj(G, r, PH - r, 0), proj(G, PW - r, PH - r, 0), proj(G, PW - r, PH - r, G.floorMm), proj(G, r, PH - r, G.floorMm)])} className="fill-slate-600" />
            <polygon points={pointsOf([proj(G, r, r, 0), proj(G, r, PH - r, 0), proj(G, r, PH - r, G.floorMm), proj(G, r, r, G.floorMm)])} className="fill-slate-700" />

            {/* Ruban : tranche, support blanc, LED */}
            <motion.path d={sideD} className="fill-none stroke-slate-400" style={{ strokeWidth: wpx }} strokeLinejoin="miter" />
            <motion.path d={bodyD} className="fill-none stroke-slate-100" style={{ strokeWidth: wpx }} strokeLinejoin="miter" />
            {omni
              ? <motion.path d={bodyD} className="fill-none stroke-slate-300" style={{ strokeWidth: corePx }} />
              : <motion.path d={bodyD} className="fill-none stroke-slate-400" style={{ strokeWidth: dotPx }} strokeDasharray={`0.1 ${LED_PITCH}`} strokeLinecap="round" />}

            {/* Lumière du ruban : halo flou (sur le ruban entier, sans surbrillance aux coins),
                cœur coloré (dégradé le long du ruban), points LED */}
            <motion.g filter={`url(#sg-${uid})`} style={{ opacity: glowOpacity }}>
              {pieceD.map((d, side) => final.sides[side] && (
                <motion.path key={side} d={d} fill="none" stroke={`url(#sc-${uid}-${side})`} style={{ strokeWidth: glowPx }} strokeLinecap="square" />
              ))}
            </motion.g>
            {pieceD.map((d, side) => final.sides[side] && (
              <motion.path key={side} d={d} fill="none" stroke={`url(#sc-${uid}-${side})`} style={{ strokeWidth: corePx }} />
            ))}
            {pieceD.map((d, side) => final.sides[side] && (omni
              ? <motion.path key={side} d={d} className="fill-none stroke-white" strokeOpacity="0.3" strokeWidth="1.4" />
              : <motion.path key={side} d={d} className="fill-none stroke-white" strokeOpacity="0.9" style={{ strokeWidth: dotPx }} strokeDasharray={`0.1 ${LED_PITCH}`} strokeLinecap="round" />
            ))}

            {/* Reste à l'encoche, après la coupe */}
            {gapCm >= 0.5 && (
              <motion.g style={{ opacity: cutMark }}>
                <motion.path d={gapD} className="fill-none stroke-amber-300" strokeOpacity="0.16" style={{ strokeWidth: wpx }} />
                <motion.path d={gapD} className="fill-none stroke-amber-300" strokeWidth="1.1" strokeDasharray="3 2.5" />
              </motion.g>
            )}

            {/* Dos des bords du U et encoche du câble */}
            <path d={ring} fillRule="evenodd" className="fill-slate-500 stroke-slate-400" strokeWidth="0.6" />
            <polygon points={pointsOf(notch)} className="fill-slate-950" />

            {/* Lumière qui part vers le mur (vers nous : on regarde le panneau depuis le mur) */}
            <motion.g filter={`url(#sb-${uid})`} style={{ opacity: bloomOpacity }}>
              {pieceD.map((d, side) => final.sides[side] && (
                <motion.path key={side} d={d} fill="none" stroke={`url(#sc-${uid}-${side})`} style={{ strokeWidth: glowPx }} strokeLinecap="square" />
              ))}
            </motion.g>

            {/* Balayage de lumière quand on change de ruban ou de couleur */}
            <motion.path d={sweepD} className="fill-none stroke-white" style={{ strokeWidth: corePx, opacity: sweepOpacity }} strokeLinecap="round" filter={`url(#sg-${uid})`} />

            {/* Câble et boîtier d'alimentation */}
            <motion.path d={cablePath} className="fill-none stroke-slate-300" strokeWidth="2.2" strokeLinecap="round" style={{ pathLength: cable, opacity: cableOpacity }} />
            <motion.g style={{ opacity: controllerOpacity }}>
              <rect x={cableEnd[0]} y={cableEnd[1] - 6} width="26" height="12" rx="3" className="fill-slate-700 stroke-slate-500" strokeWidth="0.8" />
              <motion.circle cx={cableEnd[0] + 20} cy={cableEnd[1]} r="1.8" initial={false} animate={{ fill: mainColor }} style={{ opacity: glow }} />
              <line x1={cableEnd[0] + 26} y1={cableEnd[1]} x2={cableEnd[0] + 40} y2={cableEnd[1]} className="stroke-slate-300" strokeWidth="2.2" strokeLinecap="round" />
            </motion.g>

            {/* Repères de l'étape en cours */}
            <AnimatePresence>
              {phase === 'notch' && (
                <motion.g key="notch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {[0, 0.55].map(delay => (
                    <motion.circle key={delay} cx={notchCenter[0]} cy={notchCenter[1]} r="9" className="fill-none stroke-amber-400 origin-center [transform-box:fill-box]" strokeWidth="1.6"
                      initial={{ scale: 0.4, opacity: 0.9 }} animate={{ scale: 1.9, opacity: 0 }} transition={{ duration: 1.1, delay, ease: 'easeOut', repeat: 1, repeatDelay: 0.1 }} />
                  ))}
                  <text x={notchCenter[0]} y={notchCenter[1] + 22} textAnchor="middle" className="fill-amber-300 text-[10.5px] font-semibold">encoche du câble</text>
                </motion.g>
              )}
              {phase === 'lay' && (
                <motion.g key="tip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.circle cx={tipX} cy={tipY} r="7.5" className="fill-amber-400/20 stroke-amber-300" strokeWidth="1.2" />
                  <motion.circle cx={tipX} cy={tipY} r="2.6" className="fill-amber-300" />
                </motion.g>
              )}
              {phase === 'cut' && hue && (
                <g key="scissors" transform={`translate(${final.end[0].toFixed(1)} ${(final.end[1] - 17).toFixed(1)})`}>
                  <motion.g initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 16 }}>
                    <Scissors />
                  </motion.g>
                </g>
              )}
            </AnimatePresence>
            {G.exaggerated && (
              <text x="8" y={VH - 7} className="fill-slate-500 text-[9px] italic">épaisseurs agrandies pour la lisibilité</text>
            )}
            {gapCm >= 0.5 && (
              <motion.text x={final.gapMid[0]} y={final.gapMid[1] - 11} textAnchor="middle" paintOrder="stroke" strokeWidth="3"
                className="fill-amber-200 stroke-slate-950 text-[10px] font-semibold" style={{ opacity: cutMark }}>
                reste {num(gapCm)} cm
              </motion.text>
            )}
          </motion.svg>
        </div>

        </div>
      </div>

      <div className="rounded-b-3xl border border-t-0 border-slate-800 bg-slate-950">
        {/* Étapes de la pose */}
        <div className="px-4 pt-3">
          <ol className="grid grid-cols-4 gap-1.5">
            {PHASES.map((p, i) => (
              <li key={p.id} className="flex flex-col gap-1.5">
                <span className="h-1 rounded-full bg-slate-800 overflow-hidden">
                  <motion.span
                    key={`${p.id}-${playId}`}
                    className="block h-full rounded-full bg-amber-400 origin-left"
                    initial={{ scaleX: reduced ? 1 : 0 }}
                    animate={{ scaleX: i <= phaseIndex ? 1 : 0 }}
                    transition={i === phaseIndex && !reduced ? { duration: durations[p.id], ease: 'linear' } : { duration: reduced ? 0 : 0.3 }}
                  />
                </span>
                <span className={`text-[11px] font-medium transition-colors ${i <= phaseIndex ? 'text-slate-200' : 'text-slate-500'}`}>
                  {i + 1}. {p.label}
                </span>
              </li>
            ))}
          </ol>
          {/* Légende de l'étape : la nouvelle apparaît en fondu (sans attendre la sortie de l'ancienne) */}
          <div className="min-h-[44px] mt-2">
            <motion.p
              key={caption}
              className="text-sm text-slate-300 leading-snug"
              initial={reduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {caption}
            </motion.p>
          </div>
        </div>

        {/* Coupe du bord et chiffres du ruban pour ce panneau */}
        <div className="flex items-center gap-4 px-4 py-3 mt-1 border-t border-slate-800/80">
          <figure className="flex flex-col items-center gap-1 flex-shrink-0">
            <SectionLens G={G} section={section} lit={lit} color={mainColor} reduced={reduced} />
            <figcaption className="text-[10px] text-slate-500">coupe du bord</figcaption>
          </figure>
          <dl className="flex-1 grid grid-cols-2 gap-x-3 gap-y-2">
            <Fact label={hue ? 'Ruban Hue' : 'Ruban blanc'} hint={hue ? lighting.model.name.replace('Philips Hue ', '') : 'coupé pour vous'}>
              {hue ? `${lighting.lengthM} m` : 'à longueur'}
            </Fact>
            <Fact label="À coller" hint={hue ? (step ? `repères tous les ${num(step)} cm` : 'coupe au repère') : null}>
              <motion.span>{laidText}</motion.span> cm
            </Fact>
            <Fact label="Reste à l’encoche">
              {gapCm >= 0.5 ? <><Counter value={gapCm} reduced={reduced} /> cm</> : 'aucun'}
            </Fact>
            <Fact label="Section" hint={`creux de ${G.floorMm} mm, LED vers le mur`}>
              {section.known ? `${num(section.widthMm)} × ${num(section.heightMm)} mm` : 'non publiée'}
            </Fact>
          </dl>
        </div>

        {guideLink && (
          <p className="px-4 pb-4 text-sm text-slate-400 leading-relaxed">
            Le ruban est livré dans le colis, non posé : vous le collez vous-même, puis vous le branchez.{' '}
            <a href="/pose" target="_blank" rel="noopener" className="text-amber-400 hover:text-amber-300 hover:underline underline-offset-2">
              Guide de pose complet ›
            </a>
          </p>
        )}
      </div>
    </>
  )
}

// Durée du collage : un peu plus longue pour un grand ruban, sans traîner (secondes)
function layDuration(cutCm) {
  return Math.min(3.4, Math.max(2, 1.5 + cutCm / 200))
}
