export const deskOrganizer = {
  id: 'desk-organizer',
  name: 'Organisateur de bureau',
  description: 'Compartiments configurables en N colonnes × M rangées.',
  emoji: '🗃️',
  defaultParams: {
    width: 200, depth: 150, height: 80,
    cols: 3, rows: 2, thickness: 6, kerf: 0.2, fingerJoints: true,
  },
  paramSchema: [
    { key: 'width',  label: 'Largeur',    type: 'slider', min: 60,  max: 600, step: 1,    unit: 'mm' },
    { key: 'depth',  label: 'Profondeur', type: 'slider', min: 60,  max: 400, step: 1,    unit: 'mm' },
    { key: 'height', label: 'Hauteur',    type: 'slider', min: 30,  max: 300, step: 1,    unit: 'mm' },
    { key: 'cols',   label: 'Colonnes',   type: 'slider', min: 1,   max: 8,   step: 1,    unit: '' },
    { key: 'rows',   label: 'Rangées',    type: 'slider', min: 1,   max: 6,   step: 1,    unit: '' },
    { key: 'kerf',   label: 'Kerf',       type: 'slider', min: 0,   max: 0.5, step: 0.05, unit: 'mm' },
  ],
  computePieces({ width, depth, height, cols, rows, thickness: t }) {
    const pieces = [
      { id: 'bottom', label: 'Fond',         polygon: rect(width, depth),  holes: [], color: '#3b82f6' },
      { id: 'front',  label: 'Face avant',   polygon: rect(width, height), holes: [], color: '#ec4899' },
      { id: 'back',   label: 'Face arrière', polygon: rect(width, height), holes: [], color: '#f97316' },
      { id: 'left',   label: 'Côté gauche',  polygon: rect(depth, height), holes: [], color: '#10b981' },
      { id: 'right',  label: 'Côté droit',   polygon: rect(depth, height), holes: [], color: '#8b5cf6' },
    ]

    // Vertical dividers (cols - 1)
    for (let i = 1; i < cols; i++) {
      pieces.push({
        id: `div_v_${i}`, label: `Sépar. V${i}`,
        polygon: rect(depth - t, height - t),
        holes: [], color: '#06b6d4'
      })
    }

    // Horizontal dividers (rows - 1)
    for (let i = 1; i < rows; i++) {
      pieces.push({
        id: `div_h_${i}`, label: `Sépar. H${i}`,
        polygon: rect(width - t * 2, depth - t),
        holes: [], color: '#84cc16'
      })
    }

    return pieces
  }
}

function rect(w, h) { return [[0,0],[w,0],[w,h],[0,h]] }
