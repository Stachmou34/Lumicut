// Éclairage des panneaux, au choix du client :
// - sans couleur : ruban LED blanc standard, non connecté, inclus dans le prix ;
// - avec couleur : ruban Philips Hue, réglé par le client dans l'application Hue
//   (blancs, couleurs et dégradés, à changer quand il veut).
// Philips Hue ne fabrique aucun ruban « blanc seul » : tous ses rubans font la couleur.
//
// Modèles, longueurs, lumens et prix réels, relevés en novembre 2026 (sources en bas du fichier).
// Prix = prix publics conseillés en France, TTC, facturés tels quels en option. À tenir à jour ici :
// les prix marqués « à confirmer » sont des prix de lancement européens, pas encore revus sur le site français.

import { kelvinToHex, mixHex } from './colorTemperature'

export const PRICES_CHECKED = 'novembre 2026'

// Le ruban est collé au dos du panneau, en retrait du bord : invisible de face, il éclaire le mur.
// Retrait visé 3 cm ; quand le ruban se coupe à intervalles fixes, le retrait s'ajuste entre 2 et 4 cm
// pour que le ruban fasse exactement le tour.
export const LED_INSET_CM = 3
const INSET_RANGE_CM = [2, 4]

// Blancs du ruban standard (fixés à la fabrication)
export const STANDARD_WHITES = [
  { id: 'warm', label: 'Blanc chaud', kelvin: 2700 },
  { id: 'neutral', label: 'Blanc neutre', kelvin: 4000 },
  { id: 'cold', label: 'Blanc froid', kelvin: 6500 },
]

// Plage de blancs proposée dans l'aperçu Philips Hue (plage annoncée pour l'OmniGlow : 2200 à 6500 K)
export const HUE_WHITE_RANGE = [2200, 6500]

// Couleurs d'aperçu (le client choisira librement la sienne dans l'application Hue)
export const COLOR_PRESETS = [
  { id: 'violet', label: 'Violet ambiance', color: '#bf7fff' },
  { id: 'red', label: 'Rouge passion', color: '#ff4444' },
  { id: 'green', label: 'Vert nature', color: '#44ff88' },
  { id: 'blue', label: 'Bleu électrique', color: '#4488ff' },
  { id: 'orange', label: 'Orange sunset', color: '#ff8844' },
]

// Dégradés d'aperçu : plusieurs couleurs à la fois le long du ruban (fonction « gradient » des rubans Hue)
export const GRADIENT_PRESETS = [
  { id: 'coucher-de-soleil', label: 'Coucher de soleil', colors: ['#ff7a2f', '#ff3d6e', '#8f3dff'] },
  { id: 'aurore', label: 'Aurore boréale', colors: ['#2bff9e', '#22c8ff', '#7d4dff'] },
  { id: 'ocean', label: 'Océan', colors: ['#1747ff', '#0fb5d6', '#6dffe0'] },
  { id: 'braise', label: 'Braise', colors: ['#ff2400', '#ff7a00', '#ffc400'] },
]

// Modèles proposés. lengths : longueurs vendues par Philips (m), prix TTC (€), lumens et puissance
// annoncés pour le ruban entier, EAN de la référence vendue en France quand il est connu.
export const LIGHT_MODELS = [
  {
    id: 'standard',
    hue: false,
    name: 'LED blanche',
    tier: 'Sans couleur',
    summary: 'Ruban LED blanc, non connecté, branché sur secteur. La teinte du blanc est choisie à la commande.',
  },
  {
    id: 'hue-essential',
    hue: true,
    name: 'Philips Hue Essential',
    productName: 'Ruban LED Hue Essential',
    tier: 'Entrée de gamme',
    summary: 'Couleurs et dégradés. Pas de LED blanches dédiées : les blancs sont moins fidèles.',
    whiteLeds: false,
    cutStepCm: null, // découpable aux repères ; intervalle non publié par Philips
    extendable: false,
    lengths: [
      { m: 5, price: 59.99, lumens: null, ean: '8721103096388', priceSource: 'philips-hue.com/fr-fr' },
      { m: 10, price: 99.99, lumens: null, ean: '8721103096487', priceSource: 'prix de lancement européen, à confirmer' },
    ],
  },
  {
    id: 'hue-flux',
    hue: true,
    name: 'Philips Hue Flux',
    productName: 'Lightstrip LED Flux',
    tier: 'Le classique',
    summary: 'Couleurs, dégradés et vrais blancs (LED blanches dédiées).',
    whiteLeds: true,
    cutStepCm: 16.6,
    extendable: true,
    lengths: [
      { m: 3, price: 79.99, lumens: 1200, watts: 12, ean: '8721103087812', priceSource: 'philips-hue.com (Belgique), Boulanger' },
      { m: 4, price: 84.99, lumens: 1600, watts: 16, ean: null, priceSource: 'prix de lancement européen, à confirmer' },
      { m: 5, price: 99.99, lumens: 2000, watts: 20, ean: null, priceSource: 'prix de lancement européen, à confirmer' },
    ],
  },
  {
    id: 'hue-flux-ultra',
    hue: true,
    name: 'Philips Hue Flux ultra-lumineux',
    productName: 'Lightstrip LED ultra-lumineux Flux',
    tier: 'Très lumineux',
    summary: 'Le Flux en 2,4 fois plus lumineux : grands formats, plafond, pièces claires.',
    whiteLeds: true,
    cutStepCm: null, // intervalle de coupe non publié
    extendable: null,
    lengths: [
      { m: 3, price: 99.99, lumens: 2900, watts: 29, ean: '8721103088314', priceSource: 'philips-hue.com (Belgique)' },
      { m: 5, price: 159.99, lumens: 4800, watts: 48, ean: null, priceSource: 'philips-hue.com/fr-fr' },
      { m: 10, price: 269.99, lumens: 6000, watts: 60, ean: null, priceSource: 'philips-hue.com/fr-fr, à confirmer' },
    ],
  },
  {
    id: 'hue-omniglow',
    hue: true,
    name: 'Philips Hue OmniGlow',
    productName: 'Lightstrip OmniGlow (micro LED)',
    tier: 'Haut de gamme',
    summary: 'Lumière continue, sans points visibles (micro LED) : couleurs, dégradés et blancs très doux.',
    whiteLeds: true,
    cutStepCm: 12.5,
    extendable: false,
    lengths: [
      { m: 3, price: 149.99, lumens: 2700, watts: 40, ean: null, priceSource: 'philips-hue.com/fr-fr' },
      { m: 5, price: 199.99, lumens: 4500, watts: 60, ean: null, priceSource: 'prix de lancement européen, à confirmer' },
      { m: 10, price: 349.99, lumens: 4500, watts: 60, ean: null, priceSource: 'prix de lancement européen, à confirmer' },
    ],
  },
]

export const DEFAULT_HUE_MODEL = 'hue-flux'

// Ce que tous les rubans Hue actuels permettent, d'après les fiches Philips
export const HUE_CONNECTIVITY = 'Bluetooth : réglage depuis l\'application Hue, sans pont. Pont Hue en option (non fourni) pour toutes les fonctions : commande à distance, synchronisation, maison connectée.'

export function getLightModel(id) {
  return LIGHT_MODELS.find(m => m.id === id) ?? LIGHT_MODELS[0]
}

export const isHueModel = id => getLightModel(id).hue === true

const round1 = v => Math.round(v * 10) / 10

// Longueur suivie par le ruban : le tour du panneau, en retrait du bord (cm)
export function stripRunCm(widthCm, heightCm, insetCm = LED_INSET_CM) {
  return Math.max(0, 2 * ((widthCm - 2 * insetCm) + (heightCm - 2 * insetCm)))
}

// Éclairage d'un panneau : modèle, longueur de ruban à acheter, longueur après découpe, lumens, prix
export function lightingFor({ lightModel, width, height }) {
  const model = getLightModel(lightModel)
  const W = Number(width) || 60
  const H = Number(height) || 30
  const run = stripRunCm(W, H)
  if (!model.hue) {
    return { model, hue: false, price: 0, length: null, lengthM: null, runCm: round1(run), cutCm: round1(run), insetCm: LED_INSET_CM, lumens: null, label: model.name }
  }
  // Plus petite longueur vendue qui fait le tour du panneau
  const length = model.lengths.find(l => l.m * 100 >= run) ?? model.lengths[model.lengths.length - 1]
  const max = length.m * 100
  let cutCm = Math.min(run, max)
  let insetCm = LED_INSET_CM
  if (model.cutStepCm) {
    // Coupe sur un repère : on choisit le nombre de segments dont le retrait est le plus proche de 3 cm
    const s = model.cutStepCm
    let best = null
    for (let n = 1; n * s <= max + 1e-6; n++) {
      const inset = (2 * (W + H) - n * s) / 8
      if (inset < INSET_RANGE_CM[0] || inset > INSET_RANGE_CM[1]) continue
      if (!best || Math.abs(inset - LED_INSET_CM) < Math.abs(best.inset - LED_INSET_CM)) best = { n, inset }
    }
    if (best) {
      cutCm = best.n * s
      insetCm = best.inset
    } else {
      cutCm = Math.floor(Math.min(run, max) / s) * s
    }
  }
  // Lumens du morceau gardé (le flux est réparti sur toute la longueur du ruban)
  const lumens = length.lumens ? Math.round((length.lumens * cutCm) / max / 10) * 10 : null
  return {
    model,
    hue: true,
    price: length.price,
    length,
    lengthM: length.m,
    runCm: round1(run),
    cutCm: round1(cutCm),
    insetCm: round1(insetCm),
    lumens,
    tooShort: max < run,
    label: `${model.name} · ruban ${length.m} m`,
  }
}

// Luminosité relative du halo dans l'aperçu : lumens par mètre du ruban, par rapport au Flux (400 lm/m).
// Racine carrée : l'œil perçoit la luminosité de façon compressée. 1 quand la luminosité n'est pas publiée.
export function lightBoost(lighting) {
  const l = lighting?.length
  if (!l?.lumens) return 1
  return Math.min(1.6, Math.max(0.8, Math.sqrt(l.lumens / l.m / 400)))
}

// Résumé lisible pour le récapitulatif, le panier et l'atelier
export function lightingSummary(state) {
  const l = lightingFor(state)
  if (!l.hue) {
    const w = STANDARD_WHITES.find(x => x.kelvin === state.ledKelvin) ?? nearestStandardWhite(state.ledKelvin)
    return `${w.label} (${w.kelvin} K), LED fixe`
  }
  return l.label
}

// Nomenclature pour l'atelier : quoi commander, où couper, où coller
export function lightingBom(state) {
  const l = lightingFor(state)
  const white = !l.hue ? (STANDARD_WHITES.find(x => x.kelvin === state.ledKelvin) ?? nearestStandardWhite(state.ledKelvin)) : null
  return {
    model: l.model.id,
    label: l.hue ? l.model.productName : `Ruban LED blanc ${white.kelvin} K`,
    brand: l.hue ? 'Philips Hue' : null,
    lengthM: l.lengthM,
    ean: l.length?.ean ?? null,
    cutCm: l.cutCm,
    insetCm: l.insetCm,
    cutStepCm: l.model.cutStepCm ?? null,
    kelvin: white?.kelvin ?? null,
    price: l.price,
  }
}

// Lignes lisibles de la nomenclature (fiche commande de l'atelier)
export function lightingBomLines(bom) {
  if (!bom) return []
  const n = v => String(Math.round(v * 10) / 10).replace('.', ',')
  if (!bom.brand) return [bom.label, `Longueur ${n(bom.cutCm)} cm, collé au dos à ${n(bom.insetCm)} cm du bord`]
  return [
    `${bom.brand} · ${bom.label}, ruban ${bom.lengthM} m${bom.ean ? ` (EAN ${bom.ean})` : ''}`,
    `Couper à ${n(bom.cutCm)} cm${bom.cutStepCm ? ` (repères tous les ${n(bom.cutStepCm)} cm)` : ' au repère le plus proche'}, coller au dos à ${n(bom.insetCm)} cm du bord`,
    `Prix public facturé : ${bom.price.toFixed(2).replace('.', ',')} €`,
  ]
}

const WHITE_BY_ID = Object.fromEntries(STANDARD_WHITES.map(w => [w.id, w]))
const HEX = /^#[0-9a-f]{6}$/i

export function nearestStandardWhite(kelvin) {
  const k = Number(kelvin) || 2700
  return STANDARD_WHITES.reduce((a, b) => (Math.abs(b.kelvin - k) < Math.abs(a.kelvin - k) ? b : a))
}

// Champs d'éclairage cohérents à partir de données partielles (design enregistré, lien partagé, changement).
// Règle : sans Philips Hue, uniquement du blanc ; une couleur ou un dégradé passe sur un ruban Hue.
// Les designs enregistrés avant Philips Hue (pas de lightModel) : blanc ⇒ LED blanche, couleur ⇒ Hue Flux.
export function normalizeLighting(data = {}) {
  const known = LIGHT_MODELS.some(m => m.id === data.lightModel)
  const oldWhite = !data.ledPreset || data.ledPreset in WHITE_BY_ID || data.ledPreset === 'kelvin'
  const lightModel = known ? data.lightModel : (oldWhite ? 'standard' : DEFAULT_HUE_MODEL)
  let ledMode = ['white', 'color', 'gradient'].includes(data.ledMode) ? data.ledMode : (oldWhite ? 'white' : 'color')
  if (!isHueModel(lightModel)) ledMode = 'white'

  const ledGradient = Array.isArray(data.ledGradient) && data.ledGradient.length >= 2 && data.ledGradient.every(c => HEX.test(c))
    ? data.ledGradient.slice(0, 3)
    : GRADIENT_PRESETS[0].colors
  let ledKelvin = Number(data.ledKelvin) || WHITE_BY_ID[data.ledPreset]?.kelvin || 2700
  let ledPreset = data.ledPreset ?? 'warm'
  let ledColor = HEX.test(data.ledColor ?? '') ? data.ledColor : '#ffffff'

  if (ledMode === 'white') {
    if (lightModel === 'standard') {
      const w = nearestStandardWhite(ledKelvin)
      ledKelvin = w.kelvin
      ledPreset = w.id
    } else {
      ledKelvin = Math.min(HUE_WHITE_RANGE[1], Math.max(HUE_WHITE_RANGE[0], Math.round(ledKelvin / 100) * 100))
      ledPreset = STANDARD_WHITES.find(w => w.kelvin === ledKelvin)?.id ?? 'kelvin'
    }
    ledColor = kelvinToHex(ledKelvin)
  } else if (ledMode === 'gradient') {
    ledColor = mixHex(ledGradient)
    // Nom du dégradé retrouvé à partir de ses couleurs (sinon dégradé personnalisé)
    const same = GRADIENT_PRESETS.find(g => g.colors.join() === ledGradient.join().toLowerCase())
    ledPreset = same?.id ?? 'gradient'
  } else {
    ledPreset = COLOR_PRESETS.find(p => p.color === ledColor.toLowerCase())?.id ?? 'custom'
  }
  return { lightModel, ledMode, ledKelvin, ledPreset, ledColor, ledGradient }
}

// Changement d'éclairage demandé par l'interface (ou le conseiller) : renvoie les champs à mettre à jour
export function lightingChange(state, change) {
  const current = {
    lightModel: state.lightModel, ledMode: state.ledMode, ledKelvin: state.ledKelvin,
    ledPreset: state.ledPreset, ledColor: state.ledColor, ledGradient: state.ledGradient,
  }
  const next = { ...current, ...change }
  // Une couleur ou un dégradé demande un ruban Philips Hue
  if (next.ledMode && next.ledMode !== 'white' && !isHueModel(next.lightModel)) next.lightModel = DEFAULT_HUE_MODEL
  return normalizeLighting(next)
}

// Préréglage nommé (blanc, couleur ou dégradé) → changement d'éclairage
export function presetChange(id) {
  const white = WHITE_BY_ID[id]
  if (white) return { ledMode: 'white', ledKelvin: white.kelvin, ledPreset: id }
  const color = COLOR_PRESETS.find(p => p.id === id)
  if (color) return { ledMode: 'color', ledColor: color.color, ledPreset: id }
  const gradient = GRADIENT_PRESETS.find(g => g.id === id)
  if (gradient) return { ledMode: 'gradient', ledGradient: gradient.colors, ledPreset: id }
  return {}
}

/*
Sources (novembre 2026) :
- Gamme 2025-2026 (Flux, Flux ultra-lumineux, OmniGlow, Essential ; arrêt du Solo et du Lightstrip Plus) :
  https://hueblog.com/2025/09/10/all-new-philips-hue-light-strips-compared/
  https://www.notebookcheck.net/Philips-Hue-discontinuing-some-smart-lights-as-new-products-arrive.1110054.0.html
- Flux : https://www.philips-hue.com/fr-be/p/lightstrips-lightstrip-flux-3-m/8721103087812 (79,99 €),
  https://hueblog.com/2025/09/16/hue-flux-lightstrip-new-light-strip-now-available/ (longueurs, lumens, prix de lancement),
  https://hueblog.com/2025/09/17/hands-on-with-the-new-philips-hue-flux-lightstrip/ (repères de coupe tous les 16,6 cm)
- Flux ultra-lumineux : https://www.philips-hue.com/fr-be/p/lightstrips-lightstrip-led-ultra-lumineux-flux-3-m/8721103088314 (99,99 €),
  https://hueblog.com/2025/10/29/hue-flux-ultra-bright-light-strip-now-partially-available-in-europe/ (lumens, puissance)
- OmniGlow : https://hueblog.com/2025/11/11/philips-hue-omniglow-lightstrip-now-also-available-in-europe/
  (lumens, puissance, prix de lancement, sections de 12,5 cm, non prolongeable), philips-hue.com/fr-fr (3 m : 149,99 €)
- Essential : https://www.philips-hue.com/fr-fr/p/ruban-de-lumiere-ruban-led-hue-essential-5-m/8721103096388 (59,99 €),
  https://www.notebookcheck.net/New-Philips-Hue-Essential-smart-strip-lights-now-available-in-Europe.1234786.0.html
- Bluetooth sans pont : https://www.philips-hue.com/en-us/explore-hue/propositions/smart-strip-lights
*/
