import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useConfiguratorStore } from '../store/configuratorStore'
import { motifs } from '../motifs/index'
import MotifSelector from '../components/studio/MotifSelector'
import DimensionSelector from '../components/studio/DimensionSelector'
import MaterialSelector from '../components/studio/MaterialSelector'
import LedColorPicker from '../components/studio/LedColorPicker'
import PanelPreview from '../components/studio/PanelPreview'
import PriceDisplay from '../components/studio/PriceDisplay'
import LightToggle from '../components/ui/ToggleSwitch'
import DayNightToggle from '../components/studio/DayNightToggle'
import SizeComparator from '../components/studio/SizeComparator'
import TextEditor from '../components/studio/TextEditor'
import MotifAdjuster from '../components/studio/MotifAdjuster'
import MotifTextComposer from '../components/studio/MotifTextComposer'
import { deserializeDesign } from '../lib/designSerializer'
import StudioActions from '../components/studio/StudioActions'
import AIAdvisor from '../components/studio/AIAdvisor'

const AMBIANCES = [
  { id: 'salon',   label: 'Salon',   emoji: '🛋️' },
  { id: 'chambre', label: 'Chambre', emoji: '🛏️' },
  { id: 'bureau',  label: 'Bureau',  emoji: '💼' },
]

const SECTIONS = [
  { id: 'motif',    label: 'Motif',       icon: '🎨' },
  { id: 'text',     label: 'Texte',       icon: '✍️' },
  { id: 'size',     label: 'Format',      icon: '📐' },
  { id: 'material', label: 'Matériau',    icon: '🪵' },
  { id: 'led',      label: 'LED',         icon: '💡' },
  { id: 'adjust',   label: 'Ajuster',     icon: '⚙️' },
]

export default function Studio() {
  const { ambiance, setAmbiance, setMotifId, setSizePreset, setMaterial, setLedColor, setMotifTransform, setShowText, setTextFont } = useConfiguratorStore()
  const [activeSection, setActiveSection] = useState('motif')
  const [showComparator, setShowComparator] = useState(false)
  const [searchParams] = useSearchParams()
  const [sharedBanner, setSharedBanner] = useState(false)

  // Restore design from URL if present
  useEffect(() => {
    const encoded = searchParams.get('design')
    if (!encoded) return
    try {
      const data = deserializeDesign(encoded)
      if (!data) return
      if (data.motifId) setMotifId(data.motifId)
      if (data.sizePreset && data.width && data.height) setSizePreset(data.sizePreset, data.width, data.height)
      if (data.material) setMaterial(data.material)
      if (data.ledColor) setLedColor(data.ledColor)
      if (data.textFont) setTextFont(data.textFont)
      if (data.showText !== undefined) setShowText(data.showText)
      setMotifTransform({
        motifScale: data.motifScale ?? 90,
        motifX: data.motifX ?? 0,
        motifY: data.motifY ?? 0,
        motifRotation: data.motifRotation ?? 0,
        motifMirrorH: data.motifMirrorH ?? false,
        motifMirrorV: data.motifMirrorV ?? false,
      })
      setSharedBanner(true)
    } catch {}
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      {/* Left config panel */}
      <div className="w-72 flex-shrink-0 bg-slate-800/90 border-r border-slate-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
          <Link to="/" className="text-amber-400 font-bold text-lg tracking-tight">LumiCut</Link>
          <Link to="/gallery" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">Galerie →</Link>
        </div>

        {/* Section nav tabs */}
        <div className="grid grid-cols-3 gap-1 p-2 border-b border-slate-700 flex-shrink-0">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`py-1.5 rounded text-center transition-all ${activeSection === s.id ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'}`}
            >
              <div className="text-base">{s.icon}</div>
              <div className="text-[10px] leading-none mt-0.5">{s.label}</div>
            </button>
          ))}
        </div>

        {/* Section content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeSection === 'motif' && (
                <div className="flex flex-col gap-6">
                  <MotifSelector />
                  <div className="border-t border-slate-700" />
                  <MotifTextComposer />
                </div>
              )}
              {activeSection === 'text' && <TextEditor />}
              {activeSection === 'size' && (
                <div className="flex flex-col gap-4">
                  <DimensionSelector />
                  <button
                    onClick={() => setShowComparator(!showComparator)}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors text-left"
                  >
                    📏 Comparer avec une silhouette {showComparator ? '▲' : '▼'}
                  </button>
                  <AnimatePresence>
                    {showComparator && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <SizeComparator />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {activeSection === 'material' && <MaterialSelector />}
              {activeSection === 'led' && <LedColorPicker />}
              {activeSection === 'adjust' && <MotifAdjuster />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Center preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Shared design banner */}
        <AnimatePresence>
          {sharedBanner && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-amber-900/40 border-b border-amber-700/40 px-6 py-2 flex items-center justify-between"
            >
              <span className="text-xs text-amber-300">✨ Design partagé — Personnalisez-le ou commandez-le tel quel.</span>
              <button onClick={() => setSharedBanner(false)} className="text-amber-600 hover:text-amber-400 text-sm">×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700 bg-slate-800/60 flex-shrink-0 gap-3">
          <LightToggle />
          <DayNightToggle />
          <StudioActions />
          {/* Ambiance selector */}
          <div className="flex gap-1">
            {AMBIANCES.map(a => (
              <button key={a.id} onClick={() => setAmbiance(a.id)}
                className={`px-2.5 py-1.5 rounded-full text-xs transition-all ${ambiance === a.id ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {a.emoji} {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-hidden">
          <PanelPreview />
        </div>
      </div>

      {/* Conseiller IA flottant */}
      <AIAdvisor />

      {/* Right summary */}
      <div className="w-64 flex-shrink-0 bg-slate-800/90 border-l border-slate-700 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Votre commande</div>

        <div className="text-xs text-slate-500 flex flex-col gap-1.5">
          <Summary />
        </div>

        <div className="mt-auto">
          <PriceDisplay />
        </div>
      </div>
    </div>
  )
}

function Summary() {
  const { motifId, material, sizePreset, width, height, ledColor, ledPreset, showText, textContent } = useConfiguratorStore()
  const motif = motifs.find(m => m.id === motifId)

  const rows = [
    { k: 'Motif', v: motif?.name || motifId },
    { k: 'Format', v: sizePreset !== 'custom' ? `${sizePreset} — ${width}×${height}cm` : `${width}×${height}cm` },
    { k: 'Matériau', v: material.replace(/-/g, ' ') },
    { k: 'LED', v: <span style={{ color: ledColor }}>{ledPreset !== 'custom' ? ledPreset : 'Personnalisé'} ●</span> },
  ]
  if (showText && textContent) rows.push({ k: 'Texte', v: `"${textContent}"` })

  return (
    <>
      {rows.map(r => (
        <div key={r.k} className="flex justify-between gap-2">
          <span className="text-slate-500 flex-shrink-0">{r.k}</span>
          <span className="text-slate-300 text-right text-xs">{r.v}</span>
        </div>
      ))}
    </>
  )
}
