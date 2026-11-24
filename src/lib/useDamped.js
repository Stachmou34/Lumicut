import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'

// Transitions de la vue 3D, compatibles avec frameloop="demand" : tant qu'une transition est en cours,
// chaque image en redemande une suivante. Elles sont réglées sur l'horloge réelle (et non sur le nombre
// d'images) : même durée sur un appareil lent, pas de saut après une pause sans rendu.
// Les valeurs sont rendues dans une ref (lue dans useFrame), sans re-rendre React à chaque image.

const easeOut = p => 1 - (1 - p) ** 3
// Durée d'une transition (ms) selon la vivacité demandée (5 → 0,7 s)
const durationOf = speed => 3500 / speed

// Nombre qui glisse vers sa cible
export function useDamped(target, speed = 5) {
  const ref = useRef(target)
  const anim = useRef(null)
  const invalidate = useThree(s => s.invalidate)

  useEffect(() => {
    if (ref.current === target && !anim.current) return
    anim.current = { from: ref.current, to: target, start: performance.now(), duration: durationOf(speed) }
    invalidate()
  }, [target, speed, invalidate])

  useFrame(() => {
    const a = anim.current
    if (!a) return
    const p = Math.min(1, (performance.now() - a.start) / a.duration)
    ref.current = a.from + (a.to - a.from) * easeOut(p)
    if (p >= 1) {
      ref.current = a.to
      anim.current = null
    } else {
      invalidate()
    }
  })

  return ref
}

// Couleurs en fondu vers leurs cibles. Renvoie une ref { colors: THREE.Color[], version } :
// version augmente à chaque image où une couleur a bougé, pour ne redessiner une texture qu'au besoin.
export function useDampedColors(targets, speed = 4) {
  const key = targets.join()
  const goal = useMemo(() => targets.map(c => new THREE.Color(c)), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const ref = useRef(null)
  const anim = useRef(null)
  if (!ref.current || ref.current.colors.length !== goal.length) {
    ref.current = { colors: goal.map(c => c.clone()), version: (ref.current?.version ?? 0) + 1 }
    anim.current = null
  }
  const invalidate = useThree(s => s.invalidate)

  useEffect(() => {
    if (ref.current.colors.every((c, i) => c.equals(goal[i]))) return
    anim.current = {
      from: ref.current.colors.map(c => c.clone()),
      start: performance.now(),
      duration: durationOf(speed),
    }
    invalidate()
  }, [goal, speed, invalidate])

  useFrame(() => {
    const a = anim.current
    if (!a) return
    const p = Math.min(1, (performance.now() - a.start) / a.duration)
    const k = easeOut(p)
    ref.current.colors.forEach((c, i) => c.copy(a.from[i]).lerp(goal[i], k))
    ref.current.version++
    if (p >= 1) anim.current = null
    else invalidate()
  })

  return ref
}
