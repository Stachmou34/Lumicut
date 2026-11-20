import { motifs } from './index'
import { PRESETS } from './presets'
import { generateMotif } from '../lib/generators'

// Catalogue affiché dans le studio et la galerie : préréglages générés + motifs dessinés
export const CATALOG_CATEGORIES = [
  { id: 'all', label: 'Tous' },
  { id: 'nature', label: 'Nature' },
  { id: 'ciel', label: 'Ciel' },
  { id: 'geometrique', label: 'Géométrique' },
  { id: 'mandala', label: 'Mandalas' },
  { id: 'animaux', label: 'Animaux' },
]

export const CATALOG = [
  // Motifs historiques en tête (l'Arbre de vie et le Mandala sont désormais générés)
  ...motifs.map(m => ({ id: m.id, name: m.name, category: m.category, kind: 'static', motif: m, verified: Boolean(m.generator || m.verified) })),
  ...PRESETS.map(p => ({ ...p, kind: 'preset', verified: true })),
]

// Vignette au format M (60 × 30 cm), calculée une seule fois par motif
const thumbnails = new Map()
export function catalogThumbnail(item) {
  if (item.kind === 'static') return { svg: item.motif.svg, fullPanel: false }
  if (!thumbnails.has(item.id)) {
    thumbnails.set(item.id, generateMotif(item.generator, { widthCm: 60, heightCm: 30, motifScale: 90, minBridgeMm: 2.5 }))
  }
  return thumbnails.get(item.id)
}

// SVG prêt à afficher en vignette lumineuse : découpes en couleur courante, sans fond blanc
export function glowingThumbnailSvg(svg) {
  return svg
    .replace(/<rect[^>]*fill="white"[^>]*\/>/g, '')
    .replace(/fill="black"/g, 'fill="currentColor"')
    .replace(/stroke="black"/g, 'stroke="currentColor"')
}

// Élément du catalogue correspondant au motif courant (pour le surligner)
export function isCatalogItemSelected(item, state) {
  if (item.kind === 'static') return state.motifId === item.id
  return state.motifId === 'generated' && state.generatorName === item.name
}
