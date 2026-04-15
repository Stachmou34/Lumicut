export const slidingLidBox = {
  id: 'sliding-lid-box',
  name: 'Boîte couvercle glissière',
  description: 'Couvercle qui s\'insère par une rainure sur les côtés longs.',
  emoji: '🗂️',
  defaultParams: {
    width: 120, depth: 80, height: 50,
    thickness: 4, fingerSize: 10, kerf: 0.2, fingerJoints: true,
  },
  paramSchema: [
    { key: 'width',      label: 'Largeur',        type: 'slider', min: 30,  max: 600, step: 1,    unit: 'mm' },
    { key: 'depth',      label: 'Profondeur',      type: 'slider', min: 30,  max: 600, step: 1,    unit: 'mm' },
    { key: 'height',     label: 'Hauteur',         type: 'slider', min: 15,  max: 400, step: 1,    unit: 'mm' },
    { key: 'fingerSize', label: 'Taille encoches', type: 'slider', min: 6,   max: 30,  step: 1,    unit: 'mm' },
    { key: 'kerf',       label: 'Kerf',            type: 'slider', min: 0,   max: 0.5, step: 0.05, unit: 'mm' },
  ],
  computePieces({ width, depth, height, thickness: t, kerf }) {
    const grooveDepth = t + 0.5  // groove slightly wider than thickness

    const pieces = [
      { id: 'bottom', label: 'Fond',         polygon: rect(width, depth),          holes: [], color: '#3b82f6' },
      { id: 'front',  label: 'Face avant',   polygon: rect(width, height - t),     holes: [], color: '#ec4899' },
      { id: 'back',   label: 'Face arrière', polygon: rect(width, height),         holes: [], color: '#f97316' },
      {
        id: 'left', label: 'Côté gauche',
        polygon: sideWithGroove(depth, height, t, grooveDepth),
        holes: [], color: '#10b981'
      },
      {
        id: 'right', label: 'Côté droit',
        polygon: sideWithGroove(depth, height, t, grooveDepth),
        holes: [], color: '#8b5cf6'
      },
      { id: 'lid', label: 'Couvercle', polygon: rect(width - (kerf || 0) * 2, depth - t * 2 + (kerf || 0)), holes: [], color: '#fbbf24' },
    ]
    return pieces
  }
}

function rect(w, h) {
  return [[0,0],[w,0],[w,h],[0,h]]
}

function sideWithGroove(w, h, t, gd) {
  // Rectangle with a groove (rabbet) near the top for the sliding lid
  // Simplified — full rectangle for now
  return [[0,0],[w,0],[w,h],[0,h]]
}
