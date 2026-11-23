// Appels aux fonctions serveur : Supabase Edge Functions en ligne,
// ou dev-server.js en local (VITE_API_BASE=http://localhost:3001).
const BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_SUPABASE_URL || ''
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const serverConfigured = Boolean(BASE)

// token : jeton de session d'un administrateur connecté (sinon la clé publique du site)
export async function callFunction(name, body, { token } = {}) {
  if (!BASE) throw new Error('Service indisponible : la boutique n\'est pas encore reliée à son serveur.')
  const headers = { 'Content-Type': 'application/json' }
  if (token || ANON_KEY) headers.Authorization = `Bearer ${token || ANON_KEY}`
  if (ANON_KEY) headers.apikey = ANON_KEY

  let res
  try {
    res = await fetch(`${BASE}/functions/v1/${name}`, { method: 'POST', headers, body: JSON.stringify(body) })
  } catch {
    throw new Error('Connexion au serveur impossible : vérifiez votre connexion et réessayez.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error ?? `Erreur du serveur (${res.status})`)
    err.code = data.code
    err.status = res.status
    throw err
  }
  return data
}
