import { create } from 'zustand'
import { compatibleMounting } from '../lib/fixings'
import { DESIGN_KEYS } from '../lib/designSerializer'
import { snapshotOf, sameSnapshot } from '../lib/panelEditing'

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
  // Réapplique un design sauvegardé ou partagé (tous les champs connus, d'un coup)
  applyDesign: (data) => set(() => {
    const patch = {}
    for (const k of DESIGN_KEYS) if (data && k in data) patch[k] = data[k]
    // Un motif généré sans sa description ne peut pas être recréé : retour au motif par défaut
    if (patch.motifId === 'generated' && !patch.generator) patch.motifId = 'arbre-de-vie'
    if (patch.motifId === 'generated') patch.motifSource = 'generator'
    if ('placement' in patch || 'mounting' in patch) {
      patch.mounting = compatibleMounting(patch.mounting ?? 'standoff-steel', patch.placement ?? 'wall')
    }
    return patch
  }),

  // --- Motif ---
  motifId: 'arbre-de-vie',
  setMotifId: (id) => set({ motifId: id }),

  // --- Motif custom (SVGRepo / upload) ---
  aiMotifSvg: null,
  motifSource: 'library', // 'library' | 'svgrepo' | 'generator'
  setMotif: (svg, source = 'svgrepo') => set({ aiMotifSvg: svg, motifId: 'ai-generated', motifSource: source }),

  // --- Motif généré (lib/generators) : { type, seed, params }, recalculé à chaque changement ---
  generator: null,
  generatorName: '',
  setGenerator: (spec, name = '') => set({
    generator: { type: spec.type, seed: spec.seed ?? 1, params: { ...(spec.params ?? {}) } },
    generatorName: name,
    motifId: 'generated',
    motifSource: 'generator',
  }),
  setGeneratorParam: (key, value) => set(s => s.generator
    ? { generator: { ...s.generator, params: { ...s.generator.params, [key]: value } } }
    : {}),
  setGeneratorSeed: (seed) => set(s => s.generator ? { generator: { ...s.generator, seed } } : {}),

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
  // Un alignement prédéfini remplace la position libre (texte déplacé à la souris)
  setTextAlign: (v) => set({ textAlign: v, textX: null }),
  textLetterSpacing: 0,
  setTextLetterSpacing: (v) => set({ textLetterSpacing: v }),
  textSize: 70,
  setTextSize: (v) => set({ textSize: v }),
  textPosition: 'bottom',
  setTextPosition: (v) => set({ textPosition: v, textY: null }),
  // Position libre et rotation du texte (repère 200) ; null = position prédéfinie
  textX: null,
  textY: null,
  textRotation: 0,

  // --- Édition directe : élément sélectionné et historique (annuler / rétablir) ---
  selectedElement: null, // 'motif' | 'text' | 'pattern' | null
  setSelectedElement: (el) => set(s => ({ selectedElement: el, inlineTextEdit: el === 'text' ? s.inlineTextEdit : false })),
  inlineTextEdit: false, // champ de saisie du texte ouvert dans la barre d'outils
  setInlineTextEdit: (v) => set({ inlineTextEdit: v }),
  editHistory: [],
  editFuture: [],
  pushEditHistory: () => set(s => ({ editHistory: [...s.editHistory.slice(-49), snapshotOf(s)], editFuture: [] })),
  // Annuler / rétablir : les étapes sans effet visible (bouton déjà en butée) sont sautées
  undoEdit: () => set(s => {
    const current = snapshotOf(s)
    const history = [...s.editHistory]
    while (history.length && sameSnapshot(history[history.length - 1], current)) history.pop()
    if (!history.length) return { editHistory: history }
    const previous = history.pop()
    return { ...previous, editHistory: history, editFuture: [...s.editFuture, current] }
  }),
  redoEdit: () => set(s => {
    const current = snapshotOf(s)
    const future = [...s.editFuture]
    while (future.length && sameSnapshot(future[future.length - 1], current)) future.pop()
    if (!future.length) return { editFuture: future }
    const next = future.pop()
    return { ...next, editFuture: future, editHistory: [...s.editHistory, current] }
  }),

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

  // --- Contrôle de fabrication (calculé par useCutCheckSync, affiché en 2D et en 3D) ---
  cutCheck: null, // { status: 'ok' | 'warn' | 'pending', islands, fragile, thin, textIslands, overlayUrl }
  setCutCheck: (c) => set({ cutCheck: c }),
  showCutCheck: false, // surbrillance des zones à problème sur le panneau
  setShowCutCheck: (v) => set({ showCutCheck: v }),

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
