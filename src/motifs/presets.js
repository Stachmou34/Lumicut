// Préréglages du catalogue : chaque motif est une description de générateur (type + graine + paramètres).
// Aucun fichier à stocker, rendu net à toutes les tailles, et découpe vérifiée (aucun morceau ne tombe).

export const PRESETS = [
  // Nature
  { id: 'foret-lune', name: 'Forêt au clair de lune', category: 'nature', generator: { type: 'forest', seed: 5, params: {} } },
  { id: 'foret-profonde', name: 'Forêt profonde', category: 'nature', generator: { type: 'forest', seed: 12, params: { density: 1.5, height: 0.72, stars: 6, moon: false, tiers: 5 } } },
  { id: 'alpes', name: 'Les Alpes', category: 'nature', generator: { type: 'mountains', seed: 3, params: {} } },
  { id: 'sommets', name: 'Grands sommets', category: 'nature', generator: { type: 'mountains', seed: 17, params: { layers: 2, relief: 0.9 } } },
  { id: 'collines', name: 'Collines douces', category: 'nature', generator: { type: 'mountains', seed: 21, params: { layers: 3, relief: 0.2, height: 0.5, stars: 20 } } },
  // Ciel
  { id: 'nuit-etoilee', name: 'Nuit étoilée', category: 'ciel', generator: { type: 'sky', seed: 8, params: {} } },
  { id: 'pluie-etoiles', name: 'Pluie d’étoiles', category: 'ciel', generator: { type: 'sky', seed: 30, params: { stars: 110, size: 0.7, constellations: 0, moon: false } } },
  { id: 'constellations', name: 'Constellations', category: 'ciel', generator: { type: 'sky', seed: 44, params: { stars: 35, size: 1.2, constellations: 4, moon: false, shooting: false } } },
  { id: 'soleil-flammes', name: 'Soleil flamboyant', category: 'ciel', generator: { type: 'sun', seed: 4, params: { style: 'flame' } } },
  { id: 'soleil-rayons', name: 'Soleil rayonnant', category: 'ciel', generator: { type: 'sun', seed: 2, params: { style: 'alternate', rays: 32 } } },
  // Géométrique
  { id: 'galets', name: 'Galets', category: 'geometrique', generator: { type: 'organic', seed: 2, params: {} } },
  { id: 'cellules', name: 'Cellules fines', category: 'geometrique', generator: { type: 'organic', seed: 7, params: { cell: 2.5, irregular: 0.6, round: 0.3 } } },
  { id: 'ruche', name: 'Ruche', category: 'geometrique', generator: { type: 'lattice', seed: 1, params: { shape: 'hex', cell: 4.5, round: 0.3 } } },
  { id: 'losanges', name: 'Losanges art déco', category: 'geometrique', generator: { type: 'lattice', seed: 1, params: { shape: 'diamond', cell: 4, round: 0.1 } } },
  { id: 'triangles', name: 'Triangles', category: 'geometrique', generator: { type: 'lattice', seed: 1, params: { shape: 'triangle', cell: 5, round: 0.25 } } },
  { id: 'briques', name: 'Briques', category: 'geometrique', generator: { type: 'lattice', seed: 1, params: { shape: 'brick', cell: 3, round: 0.4 } } },
  // Mandalas
  { id: 'mandala-lotus', name: 'Mandala lotus', category: 'mandala', generator: { type: 'mandala', seed: 4, params: {} } },
  { id: 'mandala-dentelle', name: 'Mandala dentelle', category: 'mandala', generator: { type: 'mandala', seed: 9, params: { rings: 7, petals: 16 } } },
  { id: 'mandala-gouttes', name: 'Mandala gouttes', category: 'mandala', generator: { type: 'mandala', seed: 15, params: { style: 'drop', rings: 4 } } },
]
