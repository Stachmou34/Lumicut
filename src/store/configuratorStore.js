import { create } from 'zustand'
import { compatibleMounting } from '../lib/fixings'
import { DESIGN_KEYS } from '../lib/designSerializer'
import { snapshotOf, sameSnapshot } from '../lib/panelEditing'
import { normalizeLighting, lightingChange, presetChange } from '../lib/lighting/lightingCatalog'
import { getSizePreset, clampCustomSize } from '../lib/sizes'
import { sanitizeSvg } from '../lib/sanitizeSvg'

// Éclairage par défaut : LED blanche standard, blanc chaud (modèles et règles dans lib/lighting)
const DEFAULT_LIGHTING = normalizeLighting({ lightModel: 'standard', ledPreset: 'warm' })

export const useConfiguratorStore = create((set, get) => ({
  // Réapplique un design sauvegardé ou partagé (tous les champs connus, d'un coup)
  applyDesign: (data) => set(() => {
    const patch = {}
    for (const k of DESIGN_KEYS) if (data && k in data) patch[k] = data[k]
    // Un motif généré sans sa description ne peut pas être recréé : retour au motif par défaut
    if (patch.motifId === 'generated' && !patch.generator) patch.motifId = 'arbre-de-vie'
    if (patch.motifId === 'generated') patch.motifSource = 'generator'
    // Motif de la bibliothèque : son SVG est rechargé par useLibrarySync
    if (typeof patch.motifId === 'string' && patch.motifId.startsWith('lib:')) {
      Object.assign(patch, { librarySvg: null, librarySvgId: null, libraryForme: null, libraryFormeId: null, motifSource: 'library' })
    }
    if ('placement' in patch || 'mounting' in patch) {
      patch.mounting = compatibleMounting(patch.mounting ?? 'standoff-steel', patch.placement ?? 'wall')
    }
    // Format : dimensions du format standard, ou sur-mesure ramené dans les limites
    if ('sizePreset' in patch || 'width' in patch || 'height' in patch) {
      const preset = getSizePreset(patch.sizePreset)
      if (preset) Object.assign(patch, { width: preset.width, height: preset.height })
      else Object.assign(patch, { sizePreset: 'custom' }, clampCustomSize(patch.width, patch.height))
    }
    // Éclairage toujours cohérent ; un design d'avant Philips Hue garde son rendu (couleur ⇒ ruban Hue)
    if (data && ['lightModel', 'ledMode', 'ledPreset', 'ledColor', 'ledKelvin', 'ledGradient'].some(k => k in data)) {
      Object.assign(patch, normalizeLighting(data))
    }
    return patch
  }),

  // --- Motif ---
  motifId: 'arbre-de-vie',
  setMotifId: (id) => set({ motifId: id }),

  // --- Motif de la bibliothèque de motifs réels (public/library) : motifId = « lib:<id> » ---
  librarySvg: null,
  librarySvgId: null,
  libraryName: '',
  libraryStyles: true, // le motif accepte les styles de découpe (pas les constellations)
  libraryForme: null,
  libraryFormeId: null,
  selectLibraryMotif: (entry, svg = null) => set({
    motifId: `lib:${entry.id}`,
    libraryName: entry.name,
    libraryStyles: entry.styles !== false,
    librarySvg: svg,
    librarySvgId: svg ? entry.id : null,
    libraryForme: null,
    libraryFormeId: null,
    motifSource: 'library',
  }),
  // SVG arrivé après coup : n'est appliqué que si ce motif est toujours sélectionné
  setLibrarySvg: (id, svg, name, styles) => set(s => (s.motifId === `lib:${id}`
    ? { librarySvg: svg, librarySvgId: id, libraryName: name ?? s.libraryName, libraryStyles: styles ?? s.libraryStyles }
    : {})),
  setLibraryForme: (id, svg) => set(s => (s.motifId === `lib:${id}` ? { libraryForme: svg, libraryFormeId: id } : {})),

  // --- Style de découpe des motifs de la bibliothèque (lib/library/cutStyles.js) ---
  // Par défaut un trait de lumière : subtil la nuit, une fine gravure le jour (pas un grand trou)
  cutStyle: 'contour',
  cutStyleParams: {}, // réglages par style : { contour: { width: 1.8 }, lines: { angle: 45 } }
  setCutStyle: (style) => set({ cutStyle: style }),
  setCutStyleParam: (key, value) => set(s => ({
    cutStyleParams: { ...s.cutStyleParams, [s.cutStyle]: { ...(s.cutStyleParams[s.cutStyle] ?? {}), [key]: value } },
  })),
  // Geste d'édition en cours (glisser, agrandir) : le style garde son tracé le temps du geste
  editGesture: false,
  setEditGesture: (v) => set({ editGesture: v }),

  // --- Motif custom (SVGRepo / upload) ---
  aiMotifSvg: null,
  motifSource: 'library', // 'library' | 'svgrepo' | 'generator'
  // SVG venu de l'extérieur : nettoyé (formes seulement) avant d'être affiché, même s'il vient du cache local
  setMotif: (svg, source = 'svgrepo') => set({ aiMotifSvg: sanitizeSvg(svg), motifId: 'ai-generated', motifSource: source }),

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
  // Sur-mesure toujours dans les limites (20–150 × 10–80 cm) : jamais de panneau de 1 × 1 cm à 0 €
  setCustomSize: (w, h) => set({ sizePreset: 'custom', ...clampCustomSize(w, h) }),

  // --- Material ---
  material: 'acrylic-black',
  setMaterial: (m) => set({ material: m }),

  // --- Éclairage : LED blanche standard (sans couleur) ou ruban Philips Hue (lib/lighting) ---
  // lightModel : modèle de ruban ; ledMode : 'white' | 'color' | 'gradient' (aperçu pour Hue) ;
  // ledColor : couleur dominante, utilisée partout pour le rendu ; ledGradient : couleurs du dégradé.
  ...DEFAULT_LIGHTING,
  setLightModel: (id) => set(s => lightingChange(s, { lightModel: id })),
  setLedMode: (mode) => set(s => lightingChange(s, { ledMode: mode })),
  setLedKelvin: (kelvin) => set(s => lightingChange(s, { ledMode: 'white', ledKelvin: kelvin })),
  // Préréglage nommé : un blanc, une couleur ou un dégradé (une couleur passe sur un ruban Hue)
  setLedPreset: (id) => set(s => lightingChange(s, presetChange(id))),
  setLedColor: (color) => set(s => lightingChange(s, { ledMode: 'color', ledColor: color, ledPreset: 'custom' })),
  setLedGradientStop: (index, color) => set(s => {
    const colors = [...s.ledGradient]
    colors[index] = color
    return lightingChange(s, { ledMode: 'gradient', ledGradient: colors, ledPreset: 'gradient' })
  }),
  // Variateur filaire : seulement pour le ruban standard (un ruban Hue se règle dans l'application)
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
  setGiftWrap: (on) => set({ giftWrap: !!on }),

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
