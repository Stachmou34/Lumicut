// Formats standard du panneau (cm) et l'usage conseillé ; prix de base dans computePrice (SIZE_BASE)
export const SIZE_PRESETS = [
  { id: 'S',  width: 40,  height: 20, hint: 'Idéal bureau' },
  { id: 'M',  width: 60,  height: 30, hint: 'Parfait salon' },
  { id: 'L',  width: 80,  height: 40, hint: 'Impact maximum' },
  { id: 'XL', width: 120, height: 60, hint: 'Format statement' },
]

// Bornes du sur-mesure proposées dans le studio (cm)
export const CUSTOM_LIMITS = { width: [20, 150], height: [10, 80] }

export function getSizePreset(id) {
  return SIZE_PRESETS.find(p => p.id === id) ?? null
}
