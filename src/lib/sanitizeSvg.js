// Nettoyage de sécurité d'un SVG venu de l'extérieur (recherche « En ligne », cache local, import) avant
// de l'insérer dans la page : seules les formes géométriques et leurs attributs de dessin sont gardés.
// Rien d'exécutable ne passe : ni <script>, ni <foreignObject>, ni lien, ni attribut on…, ni style.
const ALLOWED_TAGS = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon'])
const ALLOWED_ATTRS = new Set([
  'xmlns', 'viewbox', 'preserveaspectratio', 'version',
  'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2', 'points',
  'transform', 'fill', 'fill-rule', 'clip-rule', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-miterlimit', 'opacity', 'fill-opacity', 'stroke-opacity',
])
// Valeurs de dessin uniquement : chiffres, lettres, ponctuation simple (pas de « url( », de « : » ou de « < »)
const SAFE_VALUE = /^[\w\s.,#%+()-]*$/

function clean(el) {
  for (const child of [...el.children]) {
    if (!ALLOWED_TAGS.has(child.tagName.toLowerCase())) child.remove()
    else clean(child)
  }
  for (const attr of [...el.attributes]) {
    const name = attr.name.toLowerCase()
    const allowed = ALLOWED_ATTRS.has(name) && (name === 'xmlns' || SAFE_VALUE.test(attr.value))
    if (!allowed || /url\s*\(/i.test(attr.value)) el.removeAttribute(attr.name)
  }
}

// Renvoie le SVG nettoyé, ou null s'il est illisible
export function sanitizeSvg(svgString) {
  if (typeof svgString !== 'string' || !svgString.includes('<svg')) return null
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml')
  const svg = doc.documentElement
  if (doc.querySelector('parsererror') || svg?.tagName?.toLowerCase() !== 'svg') return null
  clean(svg)
  if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  return new XMLSerializer().serializeToString(svg)
}
