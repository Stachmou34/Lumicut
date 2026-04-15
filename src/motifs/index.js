import { arbreDeVie } from './arbreDeVie.js'
import { mandala } from './mandala.js'
import { cerf } from './cerf.js'

export const motifs = [arbreDeVie, mandala, cerf]

export const CATEGORIES = [
  { id: 'all',         label: 'Tous' },
  { id: 'nature',      label: 'Nature' },
  { id: 'geometrique', label: 'Géométrique' },
  { id: 'animaux',     label: 'Animaux' },
]
