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

// Dimensions sur mesure ramenées dans les limites, au millimètre près (valeur illisible : format M)
export function clampCustomSize(width, height) {
  const clamp = (value, [min, max], fallback) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return fallback
    return Math.min(max, Math.max(min, Math.round(n * 10) / 10))
  }
  return { width: clamp(width, CUSTOM_LIMITS.width, 60), height: clamp(height, CUSTOM_LIMITS.height, 30) }
}
