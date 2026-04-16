// Cache localStorage pour les SVG SVGRepo nettoyés

const CACHE_KEY = 'lumicut_svg_cache'
const MAX_SIZE   = 50

export function getCachedSVG(svgId) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    return cache[svgId]?.svg ?? null
  } catch {
    return null
  }
}

export function cacheSVG(svgId, cleanedSVG) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    cache[svgId] = { svg: cleanedSVG, timestamp: Date.now() }

    // Garder seulement les MAX_SIZE plus récents
    const entries = Object.entries(cache)
    if (entries.length > MAX_SIZE) {
      const trimmed = Object.fromEntries(
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp).slice(0, MAX_SIZE)
      )
      localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed))
    } else {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    }
  } catch {
    // localStorage plein ou désactivé — on ignore silencieusement
  }
}
