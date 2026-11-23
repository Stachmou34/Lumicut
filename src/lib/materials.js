// Matériaux proposés (libellé affiché au client, couleur de pastille, supplément en euros)
export const MATERIALS = [
  { id: 'acrylic-black',  label: 'Acrylique noir mat',  color: '#111',    surcharge: 0, popular: true },
  { id: 'acrylic-white',  label: 'Acrylique blanc',      color: '#f0f0f0', surcharge: 0 },
  { id: 'acrylic-smoked', label: 'Acrylique fumé',       color: '#1a1a3a', surcharge: 10 },
  { id: 'birch-plywood',  label: 'Contreplaqué bouleau', color: '#c8a97a', surcharge: 5 },
  { id: 'mdf-black',      label: 'MDF peint noir',       color: '#1a1a1a', surcharge: 5 },
]

// Libellé d'un matériau à partir de son identifiant (jamais l'identifiant technique au client)
export function materialLabel(id) {
  return MATERIALS.find(m => m.id === id)?.label ?? (id ? String(id).replace(/-/g, ' ') : '')
}
