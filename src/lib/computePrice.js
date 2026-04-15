const SIZE_BASE = {
  S:  59,
  M:  89,
  L:  129,
  XL: 189,
}

const MATERIAL_SURCHARGE = {
  'acrylic-black':   0,
  'acrylic-white':   0,
  'acrylic-smoked': 10,
  'birch-plywood':   5,
  'mdf-black':       5,
}

const LED_SURCHARGE = {
  'warm':  0,
  'cold':  0,
  'rgb':  15,
}

export function computePrice(config) {
  const { sizePreset, width, height, material, ledType, ledPreset, dimmer, engraving, giftWrap } = config
  // Support both old ledType and new ledPreset field names
  const led = ledPreset ?? ledType

  let base
  if (sizePreset === 'custom') {
    const area = (width * height) / (60 * 30)  // ratio vs M
    base = Math.round(89 * area * 10) / 10
  } else {
    base = SIZE_BASE[sizePreset] ?? 89
  }

  const total =
    base +
    (MATERIAL_SURCHARGE[material] ?? 0) +
    (LED_SURCHARGE[led] ?? 0) +
    (dimmer ? 10 : 0) +
    (engraving?.trim() ? 5 : 0) +
    (giftWrap ? 8 : 0)

  return {
    base,
    total,
    freeShipping: total >= 89,
  }
}
