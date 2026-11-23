// Chiffres réels affichés sur l'accueil, calculés à partir du catalogue (jamais saisis à la main)
import { SIZE_PRESETS } from './sizes'
import { LIGHT_MODELS, lightingFor } from './lighting/lightingCatalog'
import { MATERIALS } from './materials'
import { computeDeliveryDate } from './deliveryDate'

// Prix d'entrée Philips Hue : le ruban le moins cher, tous formats standard confondus
export function hueFromPrice() {
  const prices = LIGHT_MODELS.filter(m => m.hue).flatMap(m =>
    SIZE_PRESETS.map(p => lightingFor({ lightModel: m.id, width: p.width, height: p.height }).price))
  return Math.min(...prices)
}

// Suppléments de matière (hors matières incluses) : plus petit et plus grand
export function materialSurchargeRange() {
  const paid = MATERIALS.map(m => m.surcharge).filter(v => v > 0)
  return [Math.min(...paid), Math.max(...paid)]
}

// Date de livraison estimée pour une commande passée maintenant (même calcul que le studio)
export function deliveryLabel(now = new Date()) {
  return computeDeliveryDate(now).label
}
