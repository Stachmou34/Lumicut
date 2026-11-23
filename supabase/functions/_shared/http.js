// Outils HTTP communs aux fonctions serveur (Deno sur Supabase, Node pour dev-server.js et les tests)

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Empreinte de l'adresse IP de l'appelant (jamais stockée en clair) pour limiter les abus
export async function clientKey(req) {
  const forwarded = req.headers.get('x-forwarded-for') ?? ''
  const ip = forwarded.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'inconnue'
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`lumicut:${ip}`))
  return [...new Uint8Array(bytes)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Comparaison à durée constante (secret partagé, clé de service)
export function sameSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function bearer(req) {
  return (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
}

// Qui appelle ? « service » : une autre fonction serveur (clé de service) ;
// « admin » : un administrateur connecté (jeton Supabase Auth + ligne dans la table admins) ; sinon null.
export async function callerRole(req, supabase, serviceKey) {
  const token = bearer(req)
  if (!token) return null
  if (sameSecret(token, serviceKey)) return 'service'
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  const { data: admin, error: adminError } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle()
  return !adminError && admin ? 'admin' : null
}

// Compteur d'appels par fenêtre de temps (table rate_limits, fonction SQL hit_rate_limit).
// En cas d'erreur du compteur, l'appel est refusé : mieux vaut un refus qu'une facture d'API sans limite.
export async function underRateLimit(supabase, bucket, limit, windowSeconds) {
  const { data, error } = await supabase.rpc('hit_rate_limit', {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    console.error('Compteur d\'appels indisponible :', error.message)
    return false
  }
  return data === true
}
