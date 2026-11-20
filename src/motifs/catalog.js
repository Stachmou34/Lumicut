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

// Cartes du monde réelles (Natural Earth) : motifs générés à la taille du panneau
export const MAP_PRESETS = [
  { id: 'carte-monde-points', name: 'Carte du monde à points', kind: 'preset', tags: ['monde', 'carte', 'voyage', 'continents'], generator: { type: 'worldmap', seed: 1, params: { style: 'dots' } }, thumbnail: { widthCm: 34, heightCm: 17 } },
  { id: 'carte-monde-quinconce', name: 'Carte du monde en quinconce', kind: 'preset', tags: ['monde', 'carte', 'voyage', 'continents'], generator: { type: 'worldmap', seed: 1, params: { style: 'hex', pitch: 8 } }, thumbnail: { widthCm: 34, heightCm: 17 } },
  { id: 'carte-monde-lignes', name: 'Carte du monde en lignes', kind: 'preset', tags: ['monde', 'carte', 'voyage', 'continents'], generator: { type: 'worldmap', seed: 1, params: { style: 'lines', pitch: 8 } }, thumbnail: { widthCm: 34, heightCm: 17 } },
]

// Vignette au format M (60 × 30 cm), calculée une seule fois par motif
const thumbnails = new Map()
export function catalogThumbnail(item) {
  if (item.kind === 'static') return { svg: item.motif.svg, fullPanel: false }
  if (!thumbnails.has(item.id)) {
    // Un préréglage peut demander un panneau plus petit pour sa vignette (points plus lisibles)
    const { widthCm = 60, heightCm = 30 } = item.thumbnail ?? {}
    thumbnails.set(item.id, generateMotif(item.generator, { widthCm, heightCm, motifScale: 90, minBridgeMm: 2.5 }))
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
