const PRICES = {
  'plywood_3': { label: 'Contreplaqué 3mm', pricePerCm2: 0.08 },
  'plywood_4': { label: 'Contreplaqué 4mm', pricePerCm2: 0.09 },
  'acrylic_3': { label: 'Acrylique 3mm',    pricePerCm2: 0.15 },
  'mdf_6':     { label: 'MDF 6mm',          pricePerCm2: 0.07 },
  'custom':    { label: 'Personnalisé',      pricePerCm2: 0.10 },
}

export const MATERIALS = Object.entries(PRICES).map(([id, v]) => ({ id, ...v }))

export function estimateCost(pieces, materialId) {
  const mat = PRICES[materialId] || PRICES['plywood_3']
  let totalArea = 0  // mm²

  for (const piece of pieces) {
    totalArea += polygonArea(piece.polygon)
  }

  const areaCm2 = totalArea / 100
  const cost = areaCm2 * mat.pricePerCm2

  return {
    areaCm2: Math.round(areaCm2 * 10) / 10,
    cost: Math.round(cost * 100) / 100,
    material: mat.label,
  }
}

function polygonArea(poly) {
  let area = 0
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % n]
    area += (x1 * y2) - (x2 * y1)
  }
  return Math.abs(area / 2)
}
