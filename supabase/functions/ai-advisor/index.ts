// Fonction serveur « ai-advisor » : le conseiller LumiCut, sans clé d'API dans le navigateur.
// Déploiement : supabase functions deploy ai-advisor --no-verify-jwt
// Secret : ANTHROPIC_API_KEY (supabase secrets set ANTHROPIC_API_KEY=...)
// Limites : 30 messages par heure et par visiteur, 1 500 par jour pour toute la boutique.

import Anthropic from 'npm:@anthropic-ai/sdk@1.12.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'
import { askAdvisor, AdvisorInputError } from '../_shared/advisor.js'
import { corsHeaders, json, clientKey, underRateLimit } from '../_shared/http.js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  const visitor = await clientKey(req)
  if (!(await underRateLimit(supabase, `advisor:${visitor}`, 30, 3600))) {
    return json({ error: 'Vous avez posé beaucoup de questions : le conseiller reprend dans une heure.' }, 429)
  }
  if (!(await underRateLimit(supabase, 'advisor:boutique', 1500, 86400))) {
    return json({ error: 'Le conseiller a atteint sa limite du jour : revenez demain.' }, 429)
  }

  try {
    const body = await req.json().catch(() => null)
    const reply = await askAdvisor(body?.messages, { client: anthropic })
    return json({ reply })
  } catch (err) {
    if (err instanceof AdvisorInputError) return json({ error: err.message }, 400)
    if (err instanceof Anthropic.RateLimitError) {
      return json({ error: 'Le conseiller est très sollicité : réessayez dans une minute.' }, 503)
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`ai-advisor : API ${err.status}`, err.message)
      return json({ error: 'Le conseiller est indisponible pour le moment.' }, 502)
    }
    console.error('ai-advisor :', err)
    return json({ error: 'Le conseiller est indisponible pour le moment.' }, 500)
  }
})
