// Sérialisation d'un design pour les liens de partage et les designs sauvegardés

export const DESIGN_KEYS = [
  'motifId', 'motifScale', 'motifX', 'motifY', 'motifRotation', 'motifMirrorH', 'motifMirrorV',
  'showText', 'textContent', 'textSecondary', 'textFont', 'textAlign', 'textLetterSpacing', 'textSize', 'textPosition',
  'textX', 'textY', 'textRotation',
  'sizePreset', 'width', 'height', 'material', 'ledColor', 'ledPreset', 'dimmer', 'mounting', 'engraving', 'giftWrap',
  'placement', 'ambiance', 'standoffDepth', 'powerCable', 'generator', 'generatorName', 'cutStyle', 'cutStyleParams',
]

// Base64 compatible Unicode (accents, emoji) ; les anciens liens Latin-1 restent lisibles
function toBase64(text) {
  return btoa(unescape(encodeURIComponent(text)))
}

function fromBase64(encoded) {
  const raw = atob(encoded)
  try {
    return decodeURIComponent(escape(raw))
  } catch {
    return raw
  }
}

export function serializeDesign(state) {
  const data = {}
  for (const k of DESIGN_KEYS) if (k in state) data[k] = state[k]
  try {
    return toBase64(JSON.stringify(data))
  } catch {
    return null
  }
}

export function deserializeDesign(encoded) {
  try {
    // Un « + » transmis sans encodage dans une URL est relu comme une espace
    return JSON.parse(fromBase64(encoded.replace(/ /g, '+')))
  } catch {
    return null
  }
}

export function buildShareUrl(state) {
  const encoded = serializeDesign(state)
  if (!encoded) return null
  const url = new URL(window.location.href)
  url.pathname = '/studio'
  url.search = `?design=${encodeURIComponent(encoded)}`
  return url.toString()
}
