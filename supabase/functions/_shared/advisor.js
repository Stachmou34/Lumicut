// Conseiller LumiCut côté serveur : la consigne et le modèle sont fixés ici, le navigateur n'envoie
// que la conversation (bornée en nombre et en longueur de messages). Le client Anthropic est passé
// en paramètre (SDK officiel dans la fonction Supabase, doublure dans les tests).
import { ADVISOR_SYSTEM } from './lumicut.js'

export const ADVISOR_MODEL = 'claude-opus-5-5'
const MAX_MESSAGES = 20
const MAX_CHARS = 2000

export class AdvisorInputError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AdvisorInputError'
  }
}

// Conversation acceptée : rôles user / assistant, textes non vides et bornés, commence et finit par le client
export function cleanHistory(messages) {
  if (!Array.isArray(messages)) throw new AdvisorInputError('Conversation manquante')
  let history = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.trim() }))
    .filter(m => m.content.length > 0)
  if (history.some(m => m.content.length > MAX_CHARS)) {
    throw new AdvisorInputError(`Message trop long (${MAX_CHARS} caractères au maximum)`)
  }
  history = history.slice(-MAX_MESSAGES)
  while (history.length && history[0].role !== 'user') history.shift()
  if (!history.length || history[history.length - 1].role !== 'user') {
    throw new AdvisorInputError('La conversation doit se terminer par une question du client')
  }
  return history
}

// Réponse du conseiller (texte seul). Refus de sécurité : message poli plutôt qu'une erreur.
export async function askAdvisor(messages, { client }) {
  const history = cleanHistory(messages)
  const response = await client.beta.messages.create({
    model: ADVISOR_MODEL,
    // Réponses courtes (3-4 phrases demandées) ; la réflexion du modèle compte aussi dans cette limite
    max_tokens: 2048,
    // Conversation simple : effort bas (moins de temps et de jetons ; le défaut de ce modèle est « medium »)
    output_config: { effort: 'low' },
    // Si le modèle décline une demande, l'API la confie à un autre modèle dans le même appel
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    cache_control: { type: 'ephemeral' },
    system: ADVISOR_SYSTEM,
    messages: history,
  })

  if (response.stop_reason === 'refusal') {
    return 'Je ne peux pas vous aider sur ce point. Parlons plutôt de votre panneau : quelle pièce souhaitez-vous mettre en lumière ?'
  }
  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n')
    .trim()
  return text || 'Pouvez-vous reformuler votre question ?'
}
