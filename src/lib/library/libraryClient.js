// Bibliothèque de motifs réels (dossier public/library, construit par scripts/library/build.mjs).
// L'index et les SVG sont chargés à la demande, puis gardés en mémoire.

const BASE = `${import.meta.env.BASE_URL}library`

// Identifiant d'un motif de la bibliothèque dans le configurateur : « lib:<id> »
export const LIBRARY_PREFIX = 'lib:'
export const isLibraryMotif = motifId => typeof motifId === 'string' && motifId.startsWith(LIBRARY_PREFIX)
export const libraryIdOf = motifId => motifId.slice(LIBRARY_PREFIX.length)

// SVG vide affiché le temps du chargement
export const EMPTY_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"></svg>'

let indexPromise = null
let indexData = null
const svgCache = new Map()

export function loadLibraryIndex() {
  if (!indexPromise) {
    indexPromise = fetch(`${BASE}/index.json`)
      .then(r => {
        if (!r.ok) throw new Error('Bibliothèque de motifs indisponible')
        return r.json()
      })
      .then(data => {
        indexData = data
        return data
      })
      .catch(err => {
        indexPromise = null
        throw err
      })
  }
  return indexPromise
}

// Index déjà chargé (sinon null), pour les lectures synchrones
export const libraryIndex = () => indexData

export const librarySvgUrl = id => `${BASE}/svg/${encodeURIComponent(id)}.svg`

export const libraryFormeUrl = id => `${BASE}/forme/${encodeURIComponent(id)}.svg`

// Forme d'origine (sans ponts) d'un motif : base des styles de découpe
const formeCache = new Map()
export function loadLibraryForme(id) {
  if (!formeCache.has(id)) {
    const p = fetch(libraryFormeUrl(id))
      .then(r => {
        if (!r.ok) throw new Error(`Forme introuvable : ${id}`)
        return r.text()
      })
      .catch(err => {
        formeCache.delete(id)
        throw err
      })
    formeCache.set(id, p)
  }
  return formeCache.get(id)
}

export function loadLibrarySvg(id) {
  if (!svgCache.has(id)) {
    const p = fetch(librarySvgUrl(id))
      .then(r => {
        if (!r.ok) throw new Error(`Motif introuvable : ${id}`)
        return r.text()
      })
      .catch(err => {
        svgCache.delete(id)
        throw err
      })
    svgCache.set(id, p)
  }
  return svgCache.get(id)
}

// Recherche sans accents ni majuscules, sur le nom, les mots-clés et la catégorie
const normalize = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function filterLibrary(motifs, { query = '', category = 'all' } = {}) {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  return motifs.filter(m => {
    if (category !== 'all' && m.category !== category) return false
    if (!words.length) return true
    const text = normalize([m.name, m.category, ...(m.tags ?? [])].join(' '))
    return words.every(w => text.includes(w))
  })
}

// Libellés lisibles des licences
export const LICENSE_LABELS = {
  'CC0-1.0': 'Domaine public (CC0)',
  'PDM-1.0': 'Domaine public',
  'domaine-public': 'Domaine public',
  'CC-BY-3.0': 'CC BY 3.0',
  'CC-BY-4.0': 'CC BY 4.0',
  'BSD-3-Clause': 'Licence BSD',
}

// Une attribution est-elle requise ? (CC BY, BSD : oui ; domaine public : non, mais on crédite quand même)
export const requiresAttribution = license => /^CC-BY|BSD/.test(license ?? '')
