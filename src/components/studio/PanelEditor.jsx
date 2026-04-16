import { useEffect, useRef, useState, useCallback } from 'react'
import { useConfiguratorStore } from '../../store/configuratorStore'
import { addSVGMotif, addTextBlock, addPanelBorder } from '../../lib/fabricHelpers'
import { createHistory } from '../../lib/canvasHistory'
import { motifs } from '../../motifs/index'
import ObjectToolbar from './ObjectToolbar'
import CanvasToolbar from './CanvasToolbar'

const MATERIAL_BG = {
  'acrylic-black':  '#111827',
  'acrylic-white':  '#f0f0f0',
  'acrylic-smoked': '#1a1a2e',
  'birch-plywood':  '#c8a97a',
  'mdf-black':      '#111111',
}

export default function PanelEditor() {
  const {
    motifId, material, ledColor, lightOn, toggleLight,
    width, height,
    aiMotifSvg,
  } = useConfiguratorStore()

  const containerRef = useRef(null)
  const canvasElRef  = useRef(null)
  const fabricRef    = useRef(null)
  const historyRef   = useRef(null)
  const isPanning    = useRef(false)
  const lastPos      = useRef({ x: 0, y: 0 })

  const [zoom,           setZoom]           = useState(100)
  const [selectedObject, setSelectedObject] = useState(null)
  const [, forceUpdate]                     = useState(0)

  // ── Initialisation du canvas ──────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container || !canvasElRef.current) return

    // Import dynamique pour éviter les problèmes d'init fabric au module level
    import('fabric').then(({ Canvas, Point }) => {
      const W = container.clientWidth  || 800
      const H = container.clientHeight || 500

      const canvas = new Canvas(canvasElRef.current, {
        width:                  W,
        height:                 H,
        backgroundColor:        '#1e293b',
        preserveObjectStacking: true,
        stopContextMenu:        true,
      })
      fabricRef.current = canvas

      // Zoom molette centré sur le curseur
      canvas.on('mouse:wheel', (opt) => {
        let z = canvas.getZoom()
        z *= 0.999 ** opt.e.deltaY
        z = Math.min(Math.max(z, 0.1), 4)
        canvas.zoomToPoint(new Point(opt.e.offsetX, opt.e.offsetY), z)
        setZoom(Math.round(z * 100))
        opt.e.preventDefault()
        opt.e.stopPropagation()
      })

      // Pan clic droit maintenu
      canvas.on('mouse:down', (opt) => {
        if (opt.e.button === 2 || opt.e.altKey) {
          isPanning.current = true
          canvas.selection = false
          lastPos.current = { x: opt.e.clientX, y: opt.e.clientY }
          opt.e.preventDefault()
        }
      })
      canvas.on('mouse:move', (opt) => {
        if (!isPanning.current) return
        const vpt = canvas.viewportTransform
        vpt[4] += opt.e.clientX - lastPos.current.x
        vpt[5] += opt.e.clientY - lastPos.current.y
        canvas.requestRenderAll()
        lastPos.current = { x: opt.e.clientX, y: opt.e.clientY }
      })
      canvas.on('mouse:up', (opt) => {
        if (isPanning.current || opt.e.button === 2) {
          isPanning.current = false
          canvas.selection = true
        }
      })

      // Double clic fond → reset zoom
      canvas.on('mouse:dblclick', (opt) => {
        if (!opt.target) {
          canvas.setZoom(1)
          canvas.viewportTransform[4] = 0
          canvas.viewportTransform[5] = 0
          canvas.requestRenderAll()
          setZoom(100)
        }
      })

      // Sélection
      canvas.on('selection:created', (opt) => setSelectedObject(opt.selected?.[0] ?? null))
      canvas.on('selection:updated', (opt) => setSelectedObject(opt.selected?.[0] ?? null))
      canvas.on('selection:cleared', ()    => setSelectedObject(null))
      canvas.on('object:modified',   ()    => forceUpdate(n => n + 1))

      // Historique
      historyRef.current = createHistory(canvas)

      // Bloquer le menu contextuel natif
      const el = canvasElRef.current
      const noCtx = (e) => e.preventDefault()
      el.addEventListener('contextmenu', noCtx)

      // Redimensionner avec le conteneur
      const ro = new ResizeObserver(() => {
        const nW = container.clientWidth
        const nH = container.clientHeight
        if (nW > 0 && nH > 0) {
          canvas.setDimensions({ width: nW, height: nH })
          canvas.requestRenderAll()
        }
      })
      ro.observe(container)

      // Panneau initial
      addPanelBorder(canvas, width, height)
      loadMotif(canvas, motifId, aiMotifSvg)

      // Cleanup stocké pour le return
      fabricRef._cleanup = () => {
        ro.disconnect()
        el.removeEventListener('contextmenu', noCtx)
        canvas.dispose()
        fabricRef.current  = null
        historyRef.current = null
      }
    }).catch(err => console.error('Fabric.js failed to load:', err))

    return () => {
      fabricRef._cleanup?.()
      fabricRef._cleanup = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Raccourcis clavier ─────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      const canvas = fabricRef.current
      if (!canvas) return
      const active = canvas.getActiveObject()

      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); historyRef.current?.undo(); return }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); historyRef.current?.redo(); return }

      if ((e.key === 'Delete' || e.key === 'Backspace')
          && active
          && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
        canvas.remove(active)
        canvas.discardActiveObject()
        canvas.requestRenderAll()
        return
      }

      if (!active) return
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return
      e.preventDefault()
      const step = e.shiftKey ? 10 : 1
      if (e.key === 'ArrowLeft')  active.set('left', (active.left  ?? 0) - step)
      if (e.key === 'ArrowRight') active.set('left', (active.left  ?? 0) + step)
      if (e.key === 'ArrowUp')    active.set('top',  (active.top   ?? 0) - step)
      if (e.key === 'ArrowDown')  active.set('top',  (active.top   ?? 0) + step)
      active.setCoords()
      canvas.requestRenderAll()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // ── Mise à jour matériau / lumière ─────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    addPanelBorder(canvas, width, height)
    canvas.backgroundColor = lightOn ? (MATERIAL_BG[material] ?? '#1e293b') : '#050505'
    canvas.requestRenderAll()
  }, [width, height, material, lightOn])

  // ── Mise à jour du motif ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.getObjects()
      .filter(o => o.name === 'motif')
      .forEach(o => canvas.remove(o))
    loadMotif(canvas, motifId, aiMotifSvg)
  }, [motifId, aiMotifSvg])

  const handleAddText = useCallback(() => addTextBlock(fabricRef.current), [])
  const handleUndo    = useCallback(() => historyRef.current?.undo(), [])
  const handleRedo    = useCallback(() => historyRef.current?.redo(), [])

  const glowStyle = lightOn
    ? { boxShadow: `0 0 60px 20px ${ledColor}44, 0 0 120px 40px ${ledColor}18` }
    : {}

  return (
    <div className="flex flex-col h-full">
      <CanvasToolbar
        onAddText={handleAddText}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyRef.current?.canUndo() ?? false}
        canRedo={historyRef.current?.canRedo() ?? false}
        lightOn={lightOn}
        onToggleLight={toggleLight}
      />

      {selectedObject && fabricRef.current && (
        <ObjectToolbar object={selectedObject} canvas={fabricRef.current} />
      )}

      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-slate-900"
        style={glowStyle}
      >
        <canvas ref={canvasElRef} />

        <div className="absolute bottom-3 right-3 text-xs text-slate-400 bg-black/50 px-2 py-1 rounded pointer-events-none select-none">
          {zoom}%
        </div>
        <div className="absolute bottom-3 left-3 text-xs text-slate-600 pointer-events-none select-none">
          Molette : zoom · Clic droit : déplacer · Double-clic : reset
        </div>
      </div>
    </div>
  )
}

// Charge le motif SVG sur le canvas
function loadMotif(canvas, motifId, aiMotifSvg) {
  const customSvg = motifId === 'ai-generated' ? aiMotifSvg : null
  const libMotif  = motifs.find(m => m.id === motifId)
  const svgString = customSvg ?? libMotif?.svg
  if (svgString) addSVGMotif(canvas, svgString)
}
