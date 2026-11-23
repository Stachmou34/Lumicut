import { LIGHT_MODELS, lightingFor } from './lighting/lightingCatalog'

// Wrapper pour l'API Anthropic — appels directs depuis le navigateur
// Clé configurée via VITE_ANTHROPIC_API_KEY dans .env

const API_KEY   = import.meta.env.VITE_ANTHROPIC_API_KEY
// En dev : passe par le proxy Vite (/api/anthropic → api.anthropic.com)
const API_URL   = '/api/anthropic/v1/messages'
const MODEL     = 'claude-sonnet-4-6'
const HEADERS   = {
  'Content-Type':      'application/json',
  'x-api-key':         API_KEY ?? '',
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
}

// Vérifie que la clé est configurée
function checkKey() {
  if (!API_KEY) throw new Error('Clé Anthropic manquante — ajoutez VITE_ANTHROPIC_API_KEY dans .env')
}

// Appel générique à l'API
async function callAPI(body) {
  checkKey()
  const res = await fetch(API_URL, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Erreur API ${res.status}`)
  }
  return res.json()
}

// ─────────────────────────────────────────────────────────
// Conseiller LumiCut — chat
// ─────────────────────────────────────────────────────────
// Éclairages proposés, avec le prix réel du ruban pour un panneau M (catalogue lib/lighting)
const LIGHTING_OPTIONS = LIGHT_MODELS
  .map(m => `${m.id} (${m.name}${m.hue ? `, +${lightingFor({ lightModel: m.id, width: 60, height: 30 }).price.toFixed(2).replace('.', ',')} € en format M` : ', incluse, blanc seulement'})`)
  .join(', ')

const ADVISOR_SYSTEM = `Tu es le conseiller LumiCut. Tu aides les clients à choisir le bon panneau décoratif rétroéclairé pour leur intérieur. Tu poses des questions sur la pièce, le style déco, l'occasion (cadeau, déco perso…), et tu recommandes un format, un motif et une couleur LED précis. Sois chaleureux, concis, inspirant. Maximum 3-4 phrases par réponse.

Options disponibles dans le configurateur :
- Tailles : S (40×20cm, 59€), M (60×30cm, 89€), L (80×40cm, 129€), XL (120×60cm, 189€)
- Motifs : arbre-de-vie (Arbre de Vie), mandala (Mandala), cerf (Cerf)
- Matériaux : acrylic-black (Acrylique Noir), acrylic-white (Acrylique Blanc), acrylic-smoked (Acrylique Fumé), birch-plywood (Contreplaqué Bouleau), mdf-black (MDF Noir)
- Éclairage (lightModel) : ${LIGHTING_OPTIONS}. Avec Philips Hue, le client change couleurs et dégradés quand il veut dans l'application Hue.
- Teinte (ledPreset) : warm (Blanc chaud 2700 K), neutral (Blanc neutre 4000 K), cold (Blanc froid 6500 K) ; avec Philips Hue seulement : violet, red, green, blue, orange, ou les dégradés coucher-de-soleil, aurore, ocean, braise

Quand tu fais une recommandation précise, ajoute sur une ligne séparée exactement ce format (les IDs doivent correspondre à ceux listés ci-dessus) :
CONFIG:{"sizePreset":"M","material":"acrylic-black","motifId":"arbre-de-vie","lightModel":"standard","ledPreset":"warm"}`

export async function sendAdvisorMessage(history) {
  const data = await callAPI({
    model: MODEL,
    max_tokens: 512,
    system: ADVISOR_SYSTEM,
    messages: history,
  })
  return data.content?.[0]?.text ?? ''
}
