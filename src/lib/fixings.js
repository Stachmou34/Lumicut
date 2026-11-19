// Fixations du panneau : types de quincaillerie, déport et position des trous.
// Fonctions pures, partagées par la vue 3D, le studio et (à terme) le fichier de découpe DXF,
// pour que les trous percés soient exactement ceux que le client a vus.
// Unités : centimètres, origine au centre du panneau, x vers la droite, y vers le haut.

export const FIXINGS = [
  {
    id: 'standoff-steel',
    label: 'Entretoises inox',
    placements: ['wall', 'ceiling'],
    kind: 'standoff',
    finish: '#c9c9cc', metalness: 0.9, roughness: 0.25,
    holeDiameterMm: 10, capDiameterMm: 19,
    description: 'Capuchon inox brossé visible en façade, vissé dans une entretoise fixée au mur.',
  },
  {
    id: 'standoff-black',
    label: 'Entretoises noires',
    placements: ['wall', 'ceiling'],
    kind: 'standoff',
    finish: '#1f1f22', metalness: 0.4, roughness: 0.5,
    holeDiameterMm: 10, capDiameterMm: 19,
    description: 'Même système en noir mat : discret sur une matière sombre.',
  },
  {
    id: 'standoff-brass',
    label: 'Entretoises laiton',
    placements: ['wall', 'ceiling'],
    kind: 'standoff',
    finish: '#b8935a', metalness: 0.9, roughness: 0.3,
    holeDiameterMm: 10, capDiameterMm: 19,
    description: 'Finition laiton, chaleureuse avec le bois.',
  },
  {
    id: 'hidden',
    label: 'Fixation invisible',
    placements: ['wall', 'ceiling'],
    kind: 'hidden',
    finish: '#b9bcc0', metalness: 0.8, roughness: 0.35,
    holeDiameterMm: 0, capDiameterMm: 0,
    description: 'Platines collées au dos du panneau : aucun trou ni capuchon en façade.',
  },
  {
    id: 'cables',
    label: 'Câbles acier',
    placements: ['pendant'],
    kind: 'cable',
    finish: '#c9c9cc', metalness: 0.9, roughness: 0.25,
    holeDiameterMm: 4, capDiameterMm: 8,
    description: 'Câbles Ø 1,5 mm réglables en hauteur, serre-câbles au dos et rosaces au plafond.',
  },
]

// Déports proposés (distance panneau ↔ support) : plus il est grand, plus le halo s'étale
export const STANDOFF_DEPTHS_MM = [20, 30, 40]

// Distance entre le centre d'un trou et le bord du panneau
export const HOLE_INSET_CM = 3

export const POWER_OPTIONS = [
  { id: 'apparent', label: 'Câble apparent', description: "Câble blanc jusqu'à une prise murale." },
  { id: 'recessed', label: 'Encastré', description: 'Raccordement dans un boîtier caché derrière le panneau.' },
]

export function getFixing(id) {
  return FIXINGS.find(f => f.id === id) ?? FIXINGS[0]
}

export function fixingsForPlacement(placement) {
  return FIXINGS.filter(f => f.placements.includes(placement))
}

// Fixation compatible avec la pose choisie (les câbles ne servent qu'en suspension)
export function compatibleMounting(mountingId, placement) {
  const current = FIXINGS.find(f => f.id === mountingId)
  if (current && current.placements.includes(placement)) return current.id
  return placement === 'pendant' ? 'cables' : 'standoff-steel'
}

// Points de fixation : les 4 coins, plus 2 au milieu des grands côtés au-delà de 100 cm de large
export function computeFixingPoints(widthCm, heightCm, insetCm = HOLE_INSET_CM) {
  const x = widthCm / 2 - insetCm
  const y = heightCm / 2 - insetCm
  const points = [{ x: -x, y }, { x, y }, { x: -x, y: -y }, { x, y: -y }]
  if (widthCm > 100) points.push({ x: 0, y }, { x: 0, y: -y })
  return points
}

// Trous à découper dans le panneau (rayon en cm) ; aucun pour la fixation invisible
export function computeFixingHoles(widthCm, heightCm, mountingId) {
  const fixing = getFixing(mountingId)
  if (!fixing.holeDiameterMm) return []
  const r = fixing.holeDiameterMm / 20
  return computeFixingPoints(widthCm, heightCm).map(p => ({ ...p, r }))
}

// Zone à garder libre de toute découpe autour d'un trou (capuchon + marge), rayon en cm
export function clearanceRadiusCm(mountingId) {
  const fixing = getFixing(mountingId)
  return fixing.capDiameterMm ? fixing.capDiameterMm / 20 + 0.3 : 0
}

// Libellé lisible d'un point de fixation (« en haut à droite »)
export function describePoint(p) {
  const vertical = p.y > 0 ? 'en haut' : 'en bas'
  const horizontal = p.x === 0 ? 'au milieu' : p.x < 0 ? 'à gauche' : 'à droite'
  return `${vertical} ${horizontal}`
}

// Contenu du kit livré, selon la fixation et le nombre de points
export function describeKit(mountingId, count, depthMm) {
  const fixing = getFixing(mountingId)
  if (fixing.kind === 'cable') return `${count} câbles acier Ø 1,5 mm × 1,5 m, ${count} serre-câbles, ${count} rosaces + chevilles`
  if (fixing.kind === 'hidden') return `${count} platines adhésives, ${count} entretoises ${depthMm} mm, vis Ø 5 mm + chevilles Ø 8 mm`
  return `${count} entretoises Ø 19 × ${depthMm} mm avec capuchon, vis Ø 5 mm + chevilles Ø 8 mm`
}
