// Rendu physique des matériaux de panneau pour la vue 3D
// Épaisseurs en mètres ; couleur de face, couleur de chant, rugosité (0 = miroir, 1 = mat)

export const PANEL_MATERIALS = {
  'acrylic-black':  { color: '#0c0c0e', edge: '#1d1d22', roughness: 0.18, metalness: 0, thickness: 0.004 },
  'acrylic-white':  { color: '#f1f1ee', edge: '#e0e0da', roughness: 0.3,  metalness: 0, thickness: 0.004 },
  'acrylic-smoked': { color: '#1c1c2b', edge: '#2c2c40', roughness: 0.15, metalness: 0, thickness: 0.004 },
  'birch-plywood':  { color: '#d6b68b', edge: '#ead4ad', roughness: 0.78, metalness: 0, thickness: 0.006, grain: true },
  'mdf-black':      { color: '#161616', edge: '#3a3229', roughness: 0.85, metalness: 0, thickness: 0.006 },
}

export function getPanelMaterial(id) {
  return PANEL_MATERIALS[id] ?? PANEL_MATERIALS['acrylic-black']
}

// Couleur LED sûre : la saisie libre peut contenir une valeur incomplète ("#ab")
export function safeHexColor(value, fallback = '#ffb347') {
  return /^#[0-9a-fA-F]{6}$/.test(value ?? '') ? value : fallback
}

// Texture procédurale de veinage bois pour le contreplaqué (multipliée par la couleur du matériau)
export function buildWoodGrainCanvas(size = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 90; i++) {
    const y = Math.random() * size
    const amp = 2 + Math.random() * 6
    const freq = 0.004 + Math.random() * 0.01
    const phase = Math.random() * Math.PI * 2
    ctx.strokeStyle = `rgba(120, 82, 40, ${0.04 + Math.random() * 0.08})`
    ctx.lineWidth = 0.6 + Math.random() * 2.2
    ctx.beginPath()
    for (let x = 0; x <= size; x += 8) {
      const yy = y + Math.sin(x * freq + phase) * amp
      if (x === 0) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }
  return canvas
}

// Détection du support WebGL (sinon on garde l'aperçu 2D)
let webglSupport = null
export function hasWebGL() {
  if (webglSupport !== null) return webglSupport
  try {
    const c = document.createElement('canvas')
    webglSupport = !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    webglSupport = false
  }
  return webglSupport
}
