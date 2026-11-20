import { useEffect } from 'react'
import { useConfiguratorStore } from '../store/configuratorStore'
import { nudge, scaleBy, rotateBy } from './panelEditing'

// Raccourcis clavier de l'édition directe :
// flèches = déplacer (Maj : ×10), + / − = taille, R / Maj+R = rotation, Suppr = retirer le texte,
// Échap = désélectionner, Ctrl+Z = annuler, Ctrl+Y ou Ctrl+Maj+Z = rétablir
export function useEditorShortcuts() {
  useEffect(() => {
    let lastPush = 0
    const onKey = e => {
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      const s = useConfiguratorStore.getState()
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (mod && key === 'z') { e.preventDefault(); if (e.shiftKey) s.redoEdit(); else s.undoEdit(); return }
      if (mod && key === 'y') { e.preventDefault(); s.redoEdit(); return }

      const el = s.selectedElement
      if (!el) return
      if (e.key === 'Escape') { s.setSelectedElement(null); return }
      if (el === 'pattern') return

      const step = e.shiftKey ? 10 : 1
      let patch = null
      switch (e.key) {
        case 'ArrowLeft': patch = nudge(el, s, -step, 0); break
        case 'ArrowRight': patch = nudge(el, s, step, 0); break
        case 'ArrowUp': patch = nudge(el, s, 0, -step); break
        case 'ArrowDown': patch = nudge(el, s, 0, step); break
        case '+': case '=': patch = scaleBy(el, s, 5); break
        case '-': case '_': patch = scaleBy(el, s, -5); break
        case 'r': case 'R': patch = rotateBy(el, s, e.shiftKey ? -15 : 15); break
        case 'Delete': case 'Backspace':
          if (el === 'text') {
            patch = { showText: false }
            s.setSelectedElement(null)
          }
          break
        default: break
      }
      if (!patch) return
      e.preventDefault()
      // Une seule étape d'historique pour une rafale de touches (touche maintenue)
      const now = Date.now()
      if (now - lastPush > 700) s.pushEditHistory()
      lastPush = now
      s.setMotifTransform(patch)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
