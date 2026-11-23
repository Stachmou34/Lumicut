import { useEffect, useState } from 'react'
import { loadLibrarySvg } from './libraryClient'

// Contours d'un motif de la bibliothèque (chemins SVG), pour l'afficher librement (accueil, vignettes)
const shapesCache = new Map()

function parseShapes(svgText) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const viewBox = doc.documentElement.getAttribute('viewBox') ?? '0 0 200 200'
  const paths = [...doc.querySelectorAll('path')]
    .map(p => ({ d: p.getAttribute('d'), rule: p.getAttribute('fill-rule') ?? 'nonzero' }))
    .filter(p => p.d)
  return { viewBox, paths }
}

export function loadLibraryShapes(id) {
  if (shapesCache.has(id)) return Promise.resolve(shapesCache.get(id))
  return loadLibrarySvg(id).then(text => {
    const shapes = parseShapes(text)
    shapesCache.set(id, shapes)
    return shapes
  })
}

export function useLibraryShapes(id) {
  const [shapes, setShapes] = useState(() => shapesCache.get(id) ?? null)
  useEffect(() => {
    if (!id) return undefined
    let alive = true
    if (shapesCache.has(id)) setShapes(shapesCache.get(id))
    else loadLibraryShapes(id).then(s => { if (alive) setShapes(s) }).catch(() => {})
    return () => { alive = false }
  }, [id])
  return shapes
}
