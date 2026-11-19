import { create } from 'zustand'
import { compatibleMounting } from '../lib/fixings'

// LED preset definitions
export const LED_PRESETS = [
  { id: 'warm',     label: 'Blanc chaud',    color: '#ffb347', emoji: '⚪' },
  { id: 'cold',     label: 'Blanc froid',    color: '#e8f4ff', emoji: '🔵' },
  { id: 'violet',   label: 'Violet ambiance',color: '#bf7fff', emoji: '🟣' },
  { id: 'red',      label: 'Rouge passion',  color: '#ff4444', emoji: '🔴' },
  { id: 'green',    label: 'Vert nature',    color: '#44ff88', emoji: '💚' },
  { id: 'blue',     label: 'Bleu électrique',color: '#4488ff', emoji: '🩵' },
  { id: 'orange',   label: 'Orange sunset',  color: '#ff8844', emoji: '🟠' },
  { id: 'custom',   label: 'Personnalisé',   color: '#ffffff', emoji: '🎨' },
]

export const useConfiguratorStore = create((set, get) => ({
  // --- Motif ---
  motifId: 'arbre-de-vie',
  setMotifId: (id) => set({ motifId: id }),

  // --- Motif custom (SVGRepo / upload) ---
  aiMotifSvg: null,
  motifSource: 'library', // 'library' | 'svgrepo'
  setMotif: (svg, source = 'svgrepo') => set({ aiMotifSvg: svg, motifId: 'ai-generated', motifSource: source }),

  // --- Motif transform ---
  motifScale: 90,
  motifX: 0,
  motifY: 0,
  motifRotation: 0,
  motifMirrorH: false,
  motifMirrorV: false,
  setMotifTransform: (t) => set(t),
  resetMotifTransform: () => set({ motifScale: 90, motifX: 0, motifY: 0, motifRotation: 0, motifMirrorH: false, motifMirrorV: false }),

  // --- Text ---
  showText: false,
  setShowText: (v) => set({ showText: v }),
  textContent: '',
  setTextContent: (v) => set({ textContent: v }),
  textSecondary: '',
  setTextSecondary: (v) => set({ textSecondary: v }),
  textFont: 'Inter',
  setTextFont: (v) => set({ textFont: v }),
  textAlign: 'center',
  setTextAlign: (v) => set({ textAlign: v }),
  textLetterSpacing: 0,
  setTextLetterSpacing: (v) => set({ textLetterSpacing: v }),
  textSize: 70,
  setTextSize: (v) => set({ textSize: v }),
  textPosition: 'bottom',
  setTextPosition: (v) => set({ textPosition: v }),

  // --- Dimensions ---
  sizePreset: 'M',
  width: 60,
  height: 30,
  setSizePreset: (p, w, h) => set({ sizePreset: p, width: w, height: h }),
  setCustomSize: (w, h) => set({ sizePreset: 'custom', width: w, height: h }),

  // --- Material ---
  material: 'acrylic-black',
  setMaterial: (m) => set({ material: m }),

  // --- LED ---
  ledPreset: 'warm',
  ledColor: '#ffb347',
  setLedPreset: (id) => {
    const p = LED_PRESETS.find(p => p.id === id)
    if (p && p.id !== 'custom') set({ ledPreset: id, ledColor: p.color })
    else set({ ledPreset: id })
  },
  setLedColor: (color) => set({ ledColor: color, ledPreset: 'custom' }),
  dimmer: false,
  toggleDimmer: () => set(s => ({ dimmer: !s.dimmer })),

  // --- Fixation (types et règles dans lib/fixings.js) ---
  mounting: 'standoff-steel',
  // Toujours compatible avec la pose (un ancien lien partagé peut contenir « cables » pour un mur)
  setMounting: (m) => set(s => ({ mounting: compatibleMounting(m, s.placement) })),
  standoffDepth: 30, // mm : distance panneau ↔ support
  setStandoffDepth: (d) => set({ standoffDepth: d }),
  powerCable: 'apparent', // 'apparent' | 'recessed'
  setPowerCable: (p) => set({ powerCable: p }),
  exploded: false, // vue éclatée des fixations (vue 3D)
  setExploded: (v) => set({ exploded: v }),

  // --- Options ---
  engraving: '',
  setEngraving: (t) => set({ engraving: t }),
  giftWrap: false,
  toggleGiftWrap: () => set(s => ({ giftWrap: !s.giftWrap })),

  // --- Aperçu ---
  previewMode: '3d', // '2d' | '3d'
  setPreviewMode: (m) => set({ previewMode: m }),
  ledIntensity: 1, // 0.1 → 1 : simule le variateur dans la vue 3D
  setLedIntensity: (v) => set({ ledIntensity: v }),
  placement: 'wall', // 'wall' | 'ceiling' | 'pendant' : emplacement de pose
  // Changer de pose bascule sur une fixation compatible (câbles uniquement en suspension)
  setPlacement: (p) => set(s => ({
    placement: p,
    mounting: compatibleMounting(s.mounting, p),
    exploded: p === 'pendant' ? false : s.exploded,
  })),

  // --- UI state ---
  lightOn: true,
  toggleLight: () => set(s => ({ lightOn: !s.lightOn })),
  dayNight: 'night',
  setDayNight: (v) => set({ dayNight: v }),
  ambiance: 'salon',
  setAmbiance: (a) => set({ ambiance: a }),
}))
