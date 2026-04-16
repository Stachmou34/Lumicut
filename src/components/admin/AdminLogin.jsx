import { useState } from 'react'
import { useAdminStore } from '../../store/adminStore'

// Écran de connexion admin — mot de passe simple pour V1
export default function AdminLogin() {
  const login = useAdminStore(s => s.login)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    const ok = login(password)
    if (!ok) {
      setError(true)
      setPassword('')
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-3xl font-black tracking-tight text-white mb-1">
            Lumi<span className="text-violet-400">Cut</span>
          </div>
          <p className="text-gray-400 text-sm">Administration</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 rounded-2xl border border-gray-800 p-8 space-y-4"
        >
          <h2 className="text-white font-semibold text-lg text-center">Accès réservé</h2>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••"
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm
                         focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">Mot de passe incorrect</p>
          )}

          <button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2.5 rounded-lg
                       transition-colors text-sm"
          >
            Se connecter
          </button>
        </form>
      </div>
    </div>
  )
}
