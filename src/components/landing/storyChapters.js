// Chapitres du récit de l'accueil : texte, et états successifs du panneau affiché pendant la lecture.
// Toutes les valeurs viennent du catalogue du site (formats, prix, matières, lumières) : rien d'inventé.
import { SIZE_PRESETS } from '../../lib/sizes'
import { SIZE_BASE } from '../../lib/computePrice'
import { MATERIALS } from '../../lib/materials'
import { COLOR_PRESETS, GRADIENT_PRESETS, STANDARD_WHITES } from '../../lib/lighting/lightingCatalog'
import { kelvinToHex } from '../../lib/lighting/colorTemperature'
import { formatEuros, formatSurcharge } from '../../lib/formatEuros'

const presetColor = id => COLOR_PRESETS.find(p => p.id === id)
const presetGradient = id => GRADIENT_PRESETS.find(g => g.id === id)
const white = id => STANDARD_WHITES.find(w => w.id === id)

// Matières claires : les découpes y paraissent sombres le jour
const LIGHT_MATERIALS = ['acrylic-white', 'birch-plywood']

// État de départ du panneau ; chaque étape d'un chapitre n'indique que ce qui change
export const BASE_SCENE = {
  motif: 'cerf-elaphe',
  style: 'silhouette',
  size: null, // null : grand panneau 2:1 ; sinon un format réel, à l'échelle de la silhouette
  material: '#111111',
  lightMaterial: false,
  light: kelvinToHex(white('warm').kelvin),
  gradient: null,
  lit: true,
  day: false,
  human: false,
  standoffs: false,
  depth: 30,
  caption: null,
}

const STORY_MOTIFS = [
  ['cerf-elaphe', 'Cerf élaphe'],
  ['coq', 'Coq'],
  ['tour-eiffel', 'Tour Eiffel'],
  ['constellation-grande-ourse', 'Constellation de la Grande Ourse'],
  ['baleine', 'Baleine à bosse'],
  ['colibri', 'Colibri'],
]

export const STORY_MOTIF_IDS = STORY_MOTIFS.map(([id]) => id)

const STYLES = [
  ['silhouette', 'Silhouette'],
  ['contour', 'Contour'],
  ['lines', 'Lignes'],
  ['dots', 'Points'],
]

// facts : chiffres réels calculés au chargement (nombre de motifs, prix Hue, date de livraison)
export const STORY_CHAPTERS = [
  {
    id: 'intro',
    eyebrow: 'Découpe laser · Rétroéclairage LED',
    title: 'Votre motif, en lumière.',
    text: () => 'Choisissez un dessin, une taille, une matière et une lumière. Nous découpons votre panneau au laser et l’éclairons par l’arrière.',
    cta: true,
    steps: [{}],
  },
  {
    id: 'motif',
    anchor: 'comment',
    eyebrow: '01 · Le motif',
    title: 'Un dessin qui vous ressemble.',
    text: f => `${f.motifCount ?? 'Des centaines de'} motifs réels, tirés de sources libres et vérifiés pour la découpe : animaux, plantes, constellations, monuments… Ou votre propre création, dans le studio.`,
    steps: STORY_MOTIFS.map(([motif, name]) => ({ motif, caption: name })),
  },
  {
    id: 'decoupe',
    eyebrow: '02 · La découpe',
    title: 'La lumière dessine le motif.',
    text: () => 'Silhouette pleine, simple contour, lignes ou points : vous choisissez comment la lumière traverse la matière. Le studio vérifie qu’aucun morceau ne tombe à la découpe.',
    steps: STYLES.map(([style, label]) => ({ motif: 'coq', style, caption: `Style « ${label} »` })),
  },
  {
    id: 'format',
    eyebrow: '03 · Le format',
    title: 'À la taille de votre mur.',
    text: () => `Du S (40 × 20 cm, ${formatEuros(SIZE_BASE.S)}) au XL (120 × 60 cm, ${formatEuros(SIZE_BASE.XL)}), ou sur mesure jusqu’à 150 × 80 cm. Ici à côté d’une silhouette de 1,70 m.`,
    steps: SIZE_PRESETS.map(p => ({
      size: p,
      human: true,
      caption: `${p.id} · ${p.width} × ${p.height} cm · ${formatEuros(SIZE_BASE[p.id])}`,
    })),
  },
  {
    id: 'matiere',
    eyebrow: '04 · La matière',
    title: 'Noir profond, blanc ou bois.',
    text: () => 'Acrylique noir mat, blanc ou fumé, contreplaqué de bouleau ou MDF peint noir : une plaque de 4 ou 6 mm, découpée au laser.',
    steps: MATERIALS.map(m => ({
      material: m.color,
      lightMaterial: LIGHT_MATERIALS.includes(m.id),
      caption: `${m.label} · ${formatSurcharge(m.surcharge)}`,
    })),
  },
  {
    id: 'lumiere',
    eyebrow: '05 · La lumière',
    title: 'Blanc doux ou toutes les couleurs.',
    text: f => `Ruban LED blanc inclus : chaud, neutre ou froid. Ou un ruban Philips Hue${f.hueFrom ? `, dès +${f.hueFrom}` : ''} : couleurs et dégradés se règlent depuis votre téléphone, en Bluetooth.`,
    steps: [
      { light: kelvinToHex(white('warm').kelvin), caption: `${white('warm').label} · ${white('warm').kelvin} K · inclus` },
      { light: kelvinToHex(white('neutral').kelvin), caption: `${white('neutral').label} · ${white('neutral').kelvin} K · inclus` },
      { light: presetColor('violet').color, caption: `Philips Hue · ${presetColor('violet').label}` },
      { light: presetColor('blue').color, caption: `Philips Hue · ${presetColor('blue').label}` },
      { gradient: presetGradient('aurore').colors, caption: `Philips Hue · dégradé ${presetGradient('aurore').label}` },
      { gradient: presetGradient('coucher-de-soleil').colors, caption: `Philips Hue · dégradé ${presetGradient('coucher-de-soleil').label}` },
    ],
  },
  {
    id: 'jour-nuit',
    eyebrow: '06 · Jour et nuit',
    title: 'Discret le jour, magique le soir.',
    text: () => 'Éteint, c’est un motif découpé dans la matière, sobre sur votre mur. Allumé, il dessine la pièce en lumière.',
    steps: [
      { day: true, lit: false, caption: 'Le jour · éteint' },
      { day: false, lit: true, caption: 'Le soir · allumé' },
    ],
  },
  {
    id: 'pose',
    eyebrow: '07 · La pose',
    title: 'Au mur, au plafond ou suspendu.',
    text: () => 'Le kit de pose est fourni : entretoises inox, noires ou laiton, fixation invisible ou câbles. Plus le panneau est décollé du mur, plus le halo s’étale.',
    steps: [20, 30, 40].map(depth => ({ standoffs: true, depth, caption: `Entretoises · ${depth} mm du mur` })),
  },
  {
    id: 'fabrique',
    eyebrow: '08 · Fabriqué pour vous',
    title: 'Vous composez. Nous fabriquons.',
    text: f => `Vous voyez votre panneau en 2D et en 3D, dans la pièce de votre choix, avant de commander. Nous découpons, montons l’éclairage et expédions${f.delivery ? ` : commandé aujourd’hui, livraison estimée le ${f.delivery}` : ''}.`,
    cta: true,
    steps: [{ standoffs: true, caption: null }],
  },
]
