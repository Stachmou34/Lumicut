import { callFunction } from './serverApi'

// Conseiller LumiCut : la conversation part vers la fonction serveur ai-advisor, qui garde la clé
// de l'API d'IA secrète, ajoute la consigne du conseiller et limite le nombre d'appels.
export async function sendAdvisorMessage(history) {
  const data = await callFunction('ai-advisor', { messages: history })
  return data.reply ?? ''
}
