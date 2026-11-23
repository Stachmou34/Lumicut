import { useState } from 'react'
import { useAdminStore } from '../../store/adminStore'

// Écran de connexion admin : compte Supabase (email + mot de passe) déclaré dans la table admins
export default function AdminLogin() {
  const login = useAdminStore(s => s.login)
  const authStatus = useAdminStore(s => s.authStatus)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const message = await login(email, password)
    setLoading(false)
    if (message) {
      setError(message)
      setPassword('')
    }
  }

  const unconfigured = authStatus === 'unconfigured'

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-3xl font-black tracking-tight text-white mb-1">
            Lumi<span className="text-violet-400">Cut</span>
          </div>
          <p className="text-gray-400 text-sm">Administration</p>
        </div>

        {unconfigured ? (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-sm text-gray-300 space-y-2">
            <h2 className="text-white font-semibold text-lg text-center">Admin indisponible</h2>
            <p>
              La boutique n’est pas reliée à Supabase : renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY,
              puis créez votre compte administrateur (voir MISE-EN-ROUTE.md).
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-gray-900 rounded-2xl border border-gray-800 p-8 space-y-4"
          >
            <h2 className="text-white font-semibold text-lg text-center">Accès réservé</h2>

            <div>
              <label htmlFor="admin-email" className="block text-gray-400 text-sm mb-2">Email</label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm
                           focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-gray-400 text-sm mb-2">Mot de passe</label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm
                           focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            {error && (
              <p role="alert" className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg
                         transition-colors text-sm"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
