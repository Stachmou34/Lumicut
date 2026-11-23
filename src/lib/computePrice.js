import { lightingFor } from './lighting/lightingCatalog'
import { MATERIALS } from './materials'

// Prix de base de chaque format standard (le sur-mesure est calculé à la surface)
export const SIZE_BASE = {
  S:  59,
  M:  89,
  L:  129,
  XL: 189,
}

// Prix plancher du sur-mesure : un petit panneau demande la même LED, le même kit et le même temps qu'un S
export const CUSTOM_MIN_PRICE = SIZE_BASE.S

// Options payantes
export const OPTION_PRICES = {
  dimmer: 10,
  engraving: 5,
  giftWrap: 8,
}

// Prix d'un panneau : format, matériau, éclairage (ruban Philips Hue au prix public) et options.
// Le détail sert au résumé du studio ; total arrondi au centime.
export function computePrice(config) {
  const { sizePreset, width, height, material, dimmer, engraving, giftWrap } = config
  const lighting = lightingFor(config)

  let base
  if (sizePreset === 'custom') {
    const area = (width * height) / (60 * 30)  // rapport à la surface du format M
    base = Math.max(CUSTOM_MIN_PRICE, Math.round(89 * area * 10) / 10)
  } else {
    base = SIZE_BASE[sizePreset] ?? 89
  }

  const materialPrice = MATERIALS.find(m => m.id === material)?.surcharge ?? 0
  const options = {
    // Variateur filaire : ruban standard uniquement (un ruban Hue se règle dans l'application)
    dimmer: dimmer && !lighting.hue ? OPTION_PRICES.dimmer : 0,
    engraving: engraving?.trim() ? OPTION_PRICES.engraving : 0,
    giftWrap: giftWrap ? OPTION_PRICES.giftWrap : 0,
  }

  const total = base + materialPrice + lighting.price + options.dimmer + options.engraving + options.giftWrap

  return {
    base,
    material: materialPrice,
    lighting: lighting.price,
    options,
    total: Math.round(total * 100) / 100,
    freeShipping: total >= 89,
  }
}
