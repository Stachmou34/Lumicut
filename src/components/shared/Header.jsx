import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCartStore } from '../../store/cartStore'

// Liens du menu : sections de l'accueil (depuis une autre page, le lien ramène à l'accueil puis descend
// à la section) et pages du site
const NAV_LINKS = [
  { label: 'Comment ça marche', to: { pathname: '/', hash: '#comment' } },
  { label: 'Tarifs',            to: { pathname: '/', hash: '#tarifs' } },
  { label: 'Galerie',           to: { pathname: '/', hash: '#galerie' } },
  { label: 'Guide de pose',     to: '/pose' },
]

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const itemCount = useCartStore(s => s.getItemCount())
  const { pathname } = useLocation()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? 'rgba(2, 6, 23, 0.92)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="/" className="text-amber-400 font-black text-xl tracking-tight">
          LumiCut
        </Link>

        {/* Nav centrale */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(l => {
            // Page ouverte : le lien reste en blanc
            const current = l.to === pathname
            return (
              <Link
                key={l.label}
                to={l.to}
                aria-current={current ? 'page' : undefined}
                className={`text-sm transition-colors ${current ? 'text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>

        {/* Panier + CTA */}
        <div className="flex items-center gap-3">
          <Link to="/cart" className="relative text-slate-400 hover:text-white transition-colors p-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-400 text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>
          <Link
            to="/studio"
            className="bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold px-5 py-2.5 rounded-full transition-colors shadow-lg shadow-amber-400/20"
          >
            Créer mon panneau
          </Link>
        </div>
      </div>
    </motion.header>
  )
}
