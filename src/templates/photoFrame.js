export const photoFrame = {
  id: 'photo-frame',
  name: 'Cadre photo',
  description: 'Cadre avec rebord intérieur pour maintenir la photo ou le verre.',
  emoji: '🖼️',
  defaultParams: {
    width: 150, height: 200, frameWidth: 20,
    thickness: 6, kerf: 0.2, fingerJoints: false,
  },
  paramSchema: [
    { key: 'width',      label: 'Largeur totale',  type: 'slider', min: 60,  max: 500, step: 1,    unit: 'mm' },
    { key: 'height',     label: 'Hauteur totale',  type: 'slider', min: 80,  max: 700, step: 1,    unit: 'mm' },
    { key: 'frameWidth', label: 'Largeur cadre',   type: 'slider', min: 10,  max: 60,  step: 1,    unit: 'mm' },
    { key: 'kerf',       label: 'Kerf',            type: 'slider', min: 0,   max: 0.5, step: 0.05, unit: 'mm' },
  ],
  computePieces({ width, height, frameWidth: fw, thickness: t }) {
    // Front frame with rectangular hole
    const frontPoly = [[0,0],[width,0],[width,height],[0,height]]
    const hole = [[fw,fw],[width-fw,fw],[width-fw,height-fw],[fw,height-fw]]

    // Back panel (solid)
    const backPoly = [[0,0],[width,0],[width,height],[0,height]]

    // 4 spacer strips to create depth for the photo
    const spacerH = [[0,0],[width,0],[width,t],[0,t]]
    const spacerV = [[0,0],[t,0],[t,height],[0,height]]

    return [
      { id: 'front',    label: 'Cadre avant',   polygon: frontPoly, holes: [hole], color: '#c084fc' },
      { id: 'back',     label: 'Dos',           polygon: backPoly,  holes: [],     color: '#94a3b8' },
      { id: 'spacer_t', label: 'Espaceur haut', polygon: spacerH,   holes: [],     color: '#64748b' },
      { id: 'spacer_b', label: 'Espaceur bas',  polygon: spacerH,   holes: [],     color: '#64748b' },
      { id: 'spacer_l', label: 'Espaceur g.',   polygon: spacerV,   holes: [],     color: '#64748b' },
      { id: 'spacer_r', label: 'Espaceur d.',   polygon: spacerV,   holes: [],     color: '#64748b' },
    ]
  }
}
