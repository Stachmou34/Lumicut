// Wrapper pour l'API Iconify (remplace SVGRepo — publique, gratuite, sans clé)
// Proxy Vite : /api/iconify → api.iconify.design

const BASE = '/api/iconify'

// Sets d'icônes les plus pertinents pour la découpe laser déco
const LASER_SETS = [
  'game-icons',    // animaux, nature, fantasy — idéal laser
  'mdi',           // Material Design — formes propres
  'ph',            // Phosphor — silhouettes nettes
  'tabler',        // Tabler — géométrique
  'carbon',        // IBM Carbon — formes claires
  'fluent-emoji-high-contrast', // formes bold
  'noto',
].join(',')

// Recherche d'icônes via Iconify
// Retourne un tableau [{id, slug, title, thumbnailUrl, svg}]
export async function searchSVGRepo(query, page = 1, limit = 20) {
  const start = (page - 1) * limit
  const url = `${BASE}/search?query=${encodeURIComponent(query)}&limit=${limit}&start=${start}&prefixes=${LASER_SETS}`

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`Erreur Iconify ${res.status}`)

  const data = await res.json()
  const icons = data.icons ?? []

  // Normaliser au format attendu par SVGRepoThumbnail
  return icons.map(fullName => {
    const [prefix, name] = fullName.split(':')
    return {
      id:           fullName,
      slug:         name,
      title:        name.replace(/-/g, ' '),
      thumbnailUrl: `${BASE}/${prefix}/${name}.svg`,
    }
  })
}

// Téléchargement du SVG brut — Iconify sert directement le SVG
export async function fetchSVGContent(iconId) {
  const [prefix, name] = iconId.split(':')
  const url = `${BASE}/${prefix}/${name}.svg`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`Impossible de télécharger l'icône (${res.status})`)
  const text = await res.text()
  if (!text.includes('<svg')) throw new Error('Réponse invalide — pas un SVG')
  return text
}
