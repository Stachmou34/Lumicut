// Nettoyage de SVG pour compatibilité découpe laser

const TAGS_TO_REMOVE = [
  'title', 'desc', 'defs', 'style', 'metadata',
  'linearGradient', 'radialGradient', 'filter',
  'clipPath', 'mask', 'pattern', 'symbol', 'use',
  'text', 'tspan', 'textPath',
]

export function cleanSVGForLaser(svgString) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, 'image/svg+xml')

  // Vérifier les erreurs de parsing
  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new Error('SVG corrompu — impossible à parser')

  const svg = doc.querySelector('svg')
  if (!svg) throw new Error('Aucun élément SVG trouvé')

  // 1. Supprimer les éléments non laser
  TAGS_TO_REMOVE.forEach(tag => {
    svg.querySelectorAll(tag).forEach(el => el.remove())
  })

  // 2. Normaliser tous les attributs de style
  svg.querySelectorAll('*').forEach(el => {
    el.removeAttribute('class')
    el.removeAttribute('style')
    el.removeAttribute('stroke')
    el.removeAttribute('stroke-width')
    el.removeAttribute('fill-opacity')
    el.removeAttribute('opacity')
    el.removeAttribute('filter')
    el.removeAttribute('clip-path')
    el.removeAttribute('mask')
    el.removeAttribute('id')

    const fill = el.getAttribute('fill')
    if (fill === 'none' || fill === 'transparent' || fill === 'white' || fill === '#fff' || fill === '#ffffff') {
      el.setAttribute('fill', 'none')
    } else if (fill !== null) {
      el.setAttribute('fill', 'black')
    } else {
      // fill non défini → hérite → mettre noir explicitement sur les formes
      const tag = el.tagName.toLowerCase()
      if (['path', 'circle', 'rect', 'ellipse', 'polygon', 'polyline'].includes(tag)) {
        el.setAttribute('fill', 'black')
      }
    }
  })

  // 3. Normaliser le viewBox
  let viewBox = svg.getAttribute('viewBox')
  if (!viewBox) {
    const w = parseFloat(svg.getAttribute('width')) || 500
    const h = parseFloat(svg.getAttribute('height')) || 500
    viewBox = `0 0 ${w} ${h}`
    svg.setAttribute('viewBox', viewBox)
  }
  svg.removeAttribute('width')
  svg.removeAttribute('height')
  svg.removeAttribute('xmlns:xlink')
  svg.removeAttribute('xml:space')

  // 4. Analyse et warnings
  const shapes = svg.querySelectorAll('path, circle, rect, ellipse, polygon, polyline')
  const pathCount = shapes.length
  const warnings = []

  if (pathCount === 0) warnings.push('Aucune forme détectée dans ce SVG')
  if (pathCount > 300) warnings.push('Motif très complexe — risque de découpe fragile. Formats L/XL recommandés')

  // Détecter les paths très courts (potentiellement trop fins)
  let thinCount = 0
  svg.querySelectorAll('path').forEach(path => {
    if ((path.getAttribute('d') || '').length < 15) thinCount++
  })
  if (thinCount > 5) warnings.push('Certains détails sont peut-être trop fins pour la découpe')

  return {
    svgString: svg.outerHTML,
    warnings,
    pathCount,
  }
}
