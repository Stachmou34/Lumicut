export const hingedBox = {
  id: 'hinged-box',
  name: 'Boîte charnière',
  description: 'Couvercle attaché par des languettes flexibles découpées au laser.',
  emoji: '🎁',
  defaultParams: {
    width: 120, depth: 80, height: 40,
    thickness: 3, fingerSize: 10, kerf: 0.2, fingerJoints: true,
  },
  paramSchema: [
    { key: 'width',  label: 'Largeur',    type: 'slider', min: 60,  max: 400, step: 1,    unit: 'mm' },
    { key: 'depth',  label: 'Profondeur', type: 'slider', min: 40,  max: 400, step: 1,    unit: 'mm' },
    { key: 'height', label: 'Hauteur',    type: 'slider', min: 20,  max: 200, step: 1,    unit: 'mm' },
    { key: 'kerf',   label: 'Kerf',       type: 'slider', min: 0,   max: 0.5, step: 0.05, unit: 'mm' },
  ],
  computePieces({ width, depth, height, thickness: t }) {
    return [
      { id: 'bottom',    label: 'Fond',         polygon: rect(width, depth),  holes: [], color: '#3b82f6' },
      { id: 'front',     label: 'Face avant',   polygon: rect(width, height), holes: [], color: '#ec4899' },
      { id: 'back',      label: 'Face arrière', polygon: rect(width, height), holes: [], color: '#f97316' },
      { id: 'left',      label: 'Côté gauche',  polygon: rect(depth, height), holes: [], color: '#10b981' },
      { id: 'right',     label: 'Côté droit',   polygon: rect(depth, height), holes: [], color: '#8b5cf6' },
      { id: 'lid',       label: 'Couvercle',    polygon: rect(width, depth),  holes: [], color: '#fbbf24' },
      { id: 'lid_front', label: 'Rebord couv.', polygon: rect(width, t * 3), holes: [], color: '#f43f5e' },
    ]
  }
}

function rect(w, h) { return [[0,0],[w,0],[w,h],[0,h]] }
