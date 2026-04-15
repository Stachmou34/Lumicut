export const tiltedStand = {
  id: 'tilted-stand',
  name: 'Présentoir incliné',
  description: 'Support avec angle configurable pour tablettes, livres, affiches.',
  emoji: '📐',
  defaultParams: {
    width: 200, depth: 120, height: 150,
    angle: 30, thickness: 6, kerf: 0.2, fingerJoints: false,
  },
  paramSchema: [
    { key: 'width',  label: 'Largeur',    type: 'slider', min: 80,  max: 400, step: 1,    unit: 'mm' },
    { key: 'depth',  label: 'Profondeur', type: 'slider', min: 60,  max: 300, step: 1,    unit: 'mm' },
    { key: 'height', label: 'Hauteur',    type: 'slider', min: 60,  max: 400, step: 1,    unit: 'mm' },
    { key: 'angle',  label: 'Angle',      type: 'slider', min: 10,  max: 75,  step: 5,    unit: '°' },
    { key: 'kerf',   label: 'Kerf',       type: 'slider', min: 0,   max: 0.5, step: 0.05, unit: 'mm' },
  ],
  computePieces({ width, depth, height, angle, thickness: t }) {
    const rad = (angle * Math.PI) / 180
    // Side panel: right triangle with the angle
    const baseDepth = depth
    const riseHeight = depth * Math.tan(rad)

    // Side panel polygon (trapezoid/triangle)
    const sidePoly = [
      [0, 0],
      [baseDepth, 0],
      [baseDepth, t],  // small ledge at back
      [0, riseHeight],
    ]

    // Shelf (the tilted surface)
    const shelfLength = depth / Math.cos(rad)

    return [
      { id: 'shelf',  label: 'Plateau',     polygon: rect(width, shelfLength), holes: [], color: '#c084fc' },
      { id: 'base',   label: 'Base',        polygon: rect(width, baseDepth),   holes: [], color: '#3b82f6' },
      { id: 'side_l', label: 'Côté gauche', polygon: sidePoly,                 holes: [], color: '#10b981' },
      { id: 'side_r', label: 'Côté droit',  polygon: sidePoly,                 holes: [], color: '#8b5cf6' },
      { id: 'lip',    label: 'Butée avant', polygon: rect(width, t * 2),       holes: [], color: '#fbbf24' },
    ]
  }
}

function rect(w, h) { return [[0,0],[w,0],[w,h],[0,h]] }
