// Pièces du studio 3D et emplacements de pose du panneau
// Données pures (aucune dépendance 3D) : utilisables par la barre d'outils comme par la scène.
// Repère en mètres : mur du fond en z = 0, la pièce s'étend vers +z, le sol est en y = 0.

export const ROOM_SIZE = { width: 5.2, depth: 5.5 }

// Emplacements de pose proposés au client
export const PLACEMENTS = [
  { id: 'wall',    label: 'Mur' },
  { id: 'ceiling', label: 'Plafond' },
  { id: 'pendant', label: 'Suspendu' },
]

// wallCenterY : hauteur du centre du panneau posé au mur
// ceilingAnchor : [x, z] du centre du panneau posé au plafond ou suspendu
// pendantDrop : distance plafond → panneau en mode suspendu
export const ROOMS = [
  { id: 'salon',          label: 'Salon',            emoji: '🛋️', wall: '#e9e1d3', floor: '#9c7652', ceiling: 2.5, wallCenterY: 1.55, ceilingAnchor: [0, 1.9], window: true },
  { id: 'chambre',        label: 'Chambre',          emoji: '🛏️', wall: '#dfe3ec', floor: '#b9a58c', ceiling: 2.5, wallCenterY: 1.5,  ceilingAnchor: [0, 1.4], window: true },
  { id: 'enfant',         label: "Chambre d'enfant", emoji: '🧸', wall: '#e2efe8', floor: '#d3b58e', ceiling: 2.5, wallCenterY: 1.45, ceilingAnchor: [0, 1.7], window: true },
  { id: 'bureau',         label: 'Bureau',           emoji: '💼', wall: '#e3ebe2', floor: '#8d7a66', ceiling: 2.5, wallCenterY: 1.6,  ceilingAnchor: [0, 1.0], window: true },
  { id: 'entree',         label: 'Entrée',           emoji: '🚪', wall: '#ece7df', floor: '#7d746b', ceiling: 2.5, wallCenterY: 1.5,  ceilingAnchor: [0, 1.8], door: true },
  { id: 'salle-a-manger', label: 'Salle à manger',   emoji: '🍽️', wall: '#efe6da', floor: '#a4825d', ceiling: 2.5, wallCenterY: 1.6,  ceilingAnchor: [0, 2.3], window: true },
  { id: 'restaurant',     label: 'Restaurant / bar', emoji: '🍸', wall: '#6b4a3a', floor: '#3f322a', ceilingColor: '#2c2826', ceiling: 2.9, wallCenterY: 1.85, ceilingAnchor: [0, 1.3], pendantDrop: 0.6 },
]

export function getRoom(id) {
  return ROOMS.find(r => r.id === id) ?? ROOMS[0]
}

export function getPlacementLabel(id) {
  return PLACEMENTS.find(p => p.id === id)?.label ?? 'Mur'
}
