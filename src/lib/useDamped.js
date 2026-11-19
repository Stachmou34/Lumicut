import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

// Valeur animée vers une cible avec amortissement, compatible avec frameloop="demand" :
// tant que la cible n'est pas atteinte, chaque image en redemande une suivante.
// Renvoie une ref (lue dans useFrame) pour ne pas re-rendre React à chaque image.
export function useDamped(target, speed = 5) {
  const ref = useRef(target)
  const invalidate = useThree(s => s.invalidate)

  useEffect(() => { invalidate() }, [target, invalidate])

  useFrame((_, delta) => {
    const current = ref.current
    if (current === target) return
    // Pas de grand saut après une période sans rendu (delta peut valoir plusieurs secondes)
    const dt = Math.min(delta, 1 / 30)
    const next = current + (target - current) * Math.min(1, dt * speed)
    ref.current = Math.abs(target - next) < 0.0005 ? target : next
    invalidate()
  })

  return ref
}
