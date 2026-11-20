import { useMemo, useRef, useState } from 'react'
import { useConfiguratorStore } from '../store/configuratorStore'
import { elementBoxes, hitTest, gesturePatch, cursorFor, snapshotOf } from './panelEditing'

const CLICK_TOLERANCE_PX = 4

// Gestes d'édition directe, communs à la 2D et à la 3D.
// Les vues convertissent le pointeur en point du repère 200 et appellent pointerDown / Move / Up.
export function useElementEditing(design) {
  const boxes = useMemo(() => elementBoxes(design), [design])
  const selected = useConfiguratorStore(s => s.selectedElement)
  const gesture = useRef(null)
  const pendingClick = useRef(null)
  const [hover, setHover] = useState(null)
  const [guides, setGuides] = useState([])

  // Renvoie l'élément saisi ; un geste (déplacer, agrandir, tourner) bloque la caméra
  const pointerDown = (p, handleR, screen) => {
    const s = useConfiguratorStore.getState()
    const hit = hitTest(p, boxes, s.selectedElement, handleR)
    // Clic dans le vide : on désélectionne au relâcher, seulement s'il n'y a pas eu de glisser (orbite)
    pendingClick.current = hit ? null : screen
    if (!hit) return null
    s.setSelectedElement(hit.element)
    if (!hit.handle) return hit
    gesture.current = { ...hit, start: p, snap: snapshotOf(s), box: boxes[hit.element], design, pushed: false }
    return hit
  }

  const pointerMove = (p, handleR, free = false) => {
    const g = gesture.current
    if (!g) {
      const h = hitTest(p, boxes, selected, handleR)
      setHover(h)
      return cursorFor(h)
    }
    const { patch, guides: g2 } = gesturePatch(g, p, { free })
    const s = useConfiguratorStore.getState()
    // Étape d'historique au premier vrai mouvement (un simple clic n'en crée pas)
    if (!g.pushed) {
      s.pushEditHistory()
      g.pushed = true
    }
    s.setMotifTransform(patch)
    setGuides(g2)
    return g.handle === 'rotate' ? 'grabbing' : cursorFor(g)
  }

  // Renvoie vrai si un geste était en cours
  const pointerUp = (screen) => {
    const was = Boolean(gesture.current)
    gesture.current = null
    setGuides([])
    const start = pendingClick.current
    pendingClick.current = null
    if (start && screen && Math.hypot(screen[0] - start[0], screen[1] - start[1]) < CLICK_TOLERANCE_PX) {
      useConfiguratorStore.getState().setSelectedElement(null)
    }
    return was
  }

  // Double-clic sur le texte : saisie directe dans la barre d'outils
  const doubleClick = (p, handleR) => {
    const hit = hitTest(p, boxes, selected, handleR)
    if (hit?.element === 'text') {
      const s = useConfiguratorStore.getState()
      s.setSelectedElement('text')
      s.setInlineTextEdit(true)
    }
  }

  return {
    boxes, selected, hover, guides,
    pointerDown, pointerMove, pointerUp, doubleClick,
    isDragging: () => Boolean(gesture.current),
  }
}
