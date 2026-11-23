import { lightingFor } from './lighting/lightingCatalog'

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

// Prix d'un panneau : format, matériau, éclairage (ruban Philips Hue au prix public) et options
export function computePrice(config) {
  const { sizePreset, width, height, material, dimmer, engraving, giftWrap } = config
  const lighting = lightingFor(config)

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
    lighting.price +
    // Variateur filaire : ruban standard uniquement (un ruban Hue se règle dans l'application)
    (dimmer && !lighting.hue ? 10 : 0) +
    (engraving?.trim() ? 5 : 0) +
    (giftWrap ? 8 : 0)

  return {
    base,
    lighting: lighting.price,
    total: Math.round(total * 100) / 100,
    freeShipping: total >= 89,
  }
}
