import { create } from 'zustand'

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

  // --- Mounting ---
  mounting: 'cables',
  setMounting: (m) => set({ mounting: m }),

  // --- Options ---
  engraving: '',
  setEngraving: (t) => set({ engraving: t }),
  giftWrap: false,
  toggleGiftWrap: () => set(s => ({ giftWrap: !s.giftWrap })),

  // --- UI state ---
  lightOn: true,
  toggleLight: () => set(s => ({ lightOn: !s.lightOn })),
  dayNight: 'night',
  setDayNight: (v) => set({ dayNight: v }),
  ambiance: 'salon',
  setAmbiance: (a) => set({ ambiance: a }),
}))
