// Devis d'une commande : prix de chaque panneau, livraison, total.
// Code commun au site (panier, paiement) et au serveur (fonction create-order) : le serveur ne fait
// jamais confiance au prix envoyé par le navigateur, il le recalcule avec ce même module.
// Après toute modification ici ou dans les prix (formats, matériaux, éclairage, options, livraison) :
// « npm run build:server » régénère la copie utilisée par les fonctions serveur.
import { computePrice } from './computePrice'
import { MATERIALS } from './materials'
import { getSizePreset, CUSTOM_LIMITS } from './sizes'
import { normalizeLighting, lightingBom } from './lighting/lightingCatalog'
import { deserializeDesign, DESIGN_KEYS } from './designSerializer'
import { calculateShipping } from './shippingCalc'

export const MAX_ITEMS = 10
export const MAX_QUANTITY = 10
// TVA appliquée aux prix affichés (prix TTC)
export const VAT_RATE = 0.2
// Pays proposés au paiement (OTHER : autre pays, tarif par défaut)
export const COUNTRIES = ['FR', 'BE', 'LU', 'MC', 'CH', 'OTHER']
// Longueurs maximales des textes (mêmes limites que les champs du studio)
const TEXT_LIMITS = { textContent: 30, textSecondary: 40, engraving: 60 }
// Taille maximale d'un design encodé (motif généré compris)
const MAX_DESIGN_LENGTH = 60000

// Erreur de commande affichable telle quelle au client
export class OrderError extends Error {
  constructor(message) {
    super(message)
    this.name = 'OrderError'
  }
}

const round2 = v => Math.round(v * 100) / 100
const within = (v, [min, max]) => Number.isFinite(v) && v >= min && v <= max

// Configuration d'un panneau à partir de son design : format borné, matériau et éclairage connus.
// Lève une OrderError si le design est illisible ou hors des choix proposés par le studio.
export function panelFromDesign(design) {
  if (typeof design === 'string' && design.length > MAX_DESIGN_LENGTH) {
    throw new OrderError('Configuration du panneau trop volumineuse')
  }
  const data = typeof design === 'string' ? deserializeDesign(design) : design
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new OrderError('Configuration du panneau illisible : ajoutez-le à nouveau depuis le studio')
  }

  let width
  let height
  const preset = getSizePreset(data.sizePreset)
  if (preset) {
    width = preset.width
    height = preset.height
  } else if (data.sizePreset === 'custom') {
    width = Math.round(Number(data.width) * 10) / 10
    height = Math.round(Number(data.height) * 10) / 10
    if (!within(width, CUSTOM_LIMITS.width) || !within(height, CUSTOM_LIMITS.height)) {
      throw new OrderError(
        `Format sur mesure hors limites : de ${CUSTOM_LIMITS.width[0]} × ${CUSTOM_LIMITS.height[0]} cm `
        + `à ${CUSTOM_LIMITS.width[1]} × ${CUSTOM_LIMITS.height[1]} cm`,
      )
    }
  } else {
    throw new OrderError('Format de panneau inconnu')
  }

  if (!MATERIALS.some(m => m.id === data.material)) throw new OrderError('Matériau inconnu')

  for (const [key, max] of Object.entries(TEXT_LIMITS)) {
    if (data[key] != null && (typeof data[key] !== 'string' || data[key].length > max)) {
      throw new OrderError(`Texte trop long (${max} caractères au maximum)`)
    }
  }

  // Seuls les réglages connus du studio sont gardés (rien d'autre n'arrive jusqu'à l'atelier)
  const known = {}
  for (const key of DESIGN_KEYS) if (key in data) known[key] = data[key]

  return {
    ...known,
    sizePreset: preset ? preset.id : 'custom',
    width,
    height,
    // Éclairage cohérent (même règle que le studio : couleur ou dégradé ⇒ ruban Philips Hue)
    ...normalizeLighting(data),
    dimmer: data.dimmer === true,
    giftWrap: data.giftWrap === true,
    engraving: typeof data.engraving === 'string' ? data.engraving.trim() : '',
  }
}

// Devis complet : chaque article recalculé à partir de son design, puis la livraison du pays choisi.
// items : [{ design, quantity }] ; renvoie les lignes (panneau normalisé, prix), sous-total, livraison, total.
export function quoteOrder({ items, country }) {
  if (!Array.isArray(items) || items.length === 0) throw new OrderError('Votre panier est vide')
  if (items.length > MAX_ITEMS) throw new OrderError(`${MAX_ITEMS} panneaux au maximum par commande`)
  if (!COUNTRIES.includes(country)) throw new OrderError('Pays de livraison non desservi')

  const lines = items.map(item => {
    const quantity = Number(item?.quantity ?? 1)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new OrderError(`Quantité invalide (de 1 à ${MAX_QUANTITY} par panneau)`)
    }
    const panel = panelFromDesign(item?.design)
    const unitPrice = computePrice(panel).total
    return { panel, quantity, unitPrice, lineTotal: round2(unitPrice * quantity) }
  })

  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0))
  const shipping = calculateShipping(
    lines.map(l => ({ config: { width: l.panel.width, height: l.panel.height } })),
    country,
    subtotal,
  )
  const total = round2(subtotal + shipping)
  return {
    lines,
    subtotal,
    shipping,
    total,
    totalCents: Math.round(total * 100),
    priceHt: round2(total / (1 + VAT_RATE)),
  }
}

// Ce que l'atelier doit savoir d'un article : dimensions, matière, éclairage à préparer, options
export function workshopItem(line, motifName = null) {
  const { panel, quantity, unitPrice, lineTotal } = line
  return {
    motifId: panel.motifId ?? null,
    motifName: typeof motifName === 'string' ? motifName.slice(0, 120) : null,
    sizePreset: panel.sizePreset,
    width: panel.width,
    height: panel.height,
    material: panel.material,
    lightModel: panel.lightModel,
    lighting: lightingBom(panel),
    options: { dimmer: panel.dimmer, giftWrap: panel.giftWrap, engraving: panel.engraving || null },
    quantity,
    unitPrice,
    lineTotal,
    // Design complet tel qu'il a été vérifié et facturé (texte, positions, motif, style de découpe…)
    design: panel,
  }
}
