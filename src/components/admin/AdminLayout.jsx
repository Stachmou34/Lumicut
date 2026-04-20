import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAdminStore } from '../../store/adminStore'
import AdminLogin from './AdminLogin'

// Liens de la sidebar
const NAV_LINKS = [
  { to: '/admin',            label: 'Vue d\'ensemble', icon: '⬛', end: true },
  { to: '/admin/orders',     label: 'Commandes',       icon: '📦' },
  { to: '/admin/production', label: 'Production',      icon: '⚙️' },
  { to: '/admin/customers',  label: 'Clients',         icon: '👥' },
  { to: '/admin/catalog',    label: 'Catalogue',       icon: '🎨' },
  { to: '/admin/reviews',    label: 'Avis clients',    icon: '⭐' },
  { to: '/admin/analytics',  label: 'Statistiques',    icon: '📈' },
  { to: '/admin/emails',     label: 'Emails',          icon: '✉️' },
]

export default function AdminLayout() {
  const isAuthenticated = useAdminStore(s => s.isAuthenticated)
  const loadOrders      = useAdminStore(s => s.loadOrders)
  const logout          = useAdminStore(s => s.logout)
  const navigate        = useNavigate()

  // Charge les commandes depuis Supabase dès l'authentification
  useEffect(() => {
    if (isAuthenticated) loadOrders()
  }, [isAuthenticated, loadOrders])

  if (!isAuthenticated) return <AdminLogin />

  const handleLogout = () => {
    logout()
    navigate('/admin')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col fixed h-full">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="text-xl font-black tracking-tight text-white">
            Lumi<span className="text-violet-400">Cut</span>
            <span className="ml-2 text-xs font-normal text-gray-500">Admin</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-300 font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <span className="text-base leading-none">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer sidebar */}
        <div className="px-3 py-4 border-t border-gray-800 space-y-1">
          <NavLink
            to="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <span>🏠</span> Voir le site
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
          >
            <span>🚪</span> Déconnexion
          </button>
        </div>
      </aside>

      {/* Zone de contenu */}
      <main className="flex-1 ml-56 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
