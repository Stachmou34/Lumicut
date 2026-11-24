import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '../../store/cartStore'

// Liens du menu : sections de l'accueil (depuis une autre page, le lien ramène à l'accueil puis descend
// à la section) et pages du site
const NAV_LINKS = [
  { label: 'Comment ça marche', to: { pathname: '/', hash: '#comment' } },
  { label: 'Tarifs',            to: { pathname: '/', hash: '#tarifs' } },
  { label: 'Galerie',           to: { pathname: '/', hash: '#galerie' } },
  { label: 'Guide de pose',     to: '/pose' },
]

// Icône du menu sur téléphone : trois traits qui deviennent une croix
function MenuIcon({ open }) {
  const ease = { duration: 0.25, ease: [0.22, 1, 0.36, 1] }
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <motion.path initial={false} animate={{ d: open ? 'M6 6 L18 18' : 'M4 7 L20 7' }} transition={ease} />
      <motion.path d="M4 12 L20 12" initial={false} animate={{ opacity: open ? 0 : 1 }} transition={ease} />
      <motion.path initial={false} animate={{ d: open ? 'M6 18 L18 6' : 'M4 17 L20 17' }} transition={ease} />
    </svg>
  )
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const itemCount = useCartStore(s => s.getItemCount())
  const { pathname, hash } = useLocation()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Menu du téléphone : fermé à chaque changement de page ou de section, et avec Échap
  useEffect(() => { setMenuOpen(false) }, [pathname, hash])
  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = e => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const solid = scrolled || menuOpen

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: solid
          ? 'rgba(2, 6, 23, 0.92)'
          : 'transparent',
        backdropFilter: solid ? 'blur(12px)' : 'none',
        borderBottom: solid ? '1px solid rgba(255,255,255,0.06)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
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

        {/* Panier + CTA (+ menu sur téléphone) */}
        <div className="flex items-center gap-3">
          <Link to="/cart" className="relative text-slate-400 hover:text-white transition-colors p-1" aria-label="Panier">
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
            className="bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold px-4 sm:px-5 py-2.5 rounded-full transition-colors shadow-lg shadow-amber-400/20 whitespace-nowrap"
          >
            Créer mon panneau
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(o => !o)}
            aria-expanded={menuOpen}
            aria-controls="menu-telephone"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="md:hidden -mr-1.5 p-1.5 rounded-full text-slate-200 hover:text-white hover:bg-white/5 transition-colors"
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {/* Menu déroulant du téléphone */}
      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.nav
            id="menu-telephone"
            aria-label="Menu"
            className="md:hidden overflow-hidden border-t border-white/[0.06]"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <ul className="px-4 sm:px-6 pt-1 pb-4">
              {NAV_LINKS.map((l, i) => {
                const current = l.to === pathname
                return (
                  <motion.li
                    key={l.label}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.04, duration: 0.25 }}
                  >
                    <Link
                      to={l.to}
                      onClick={() => setMenuOpen(false)}
                      aria-current={current ? 'page' : undefined}
                      className={`flex items-center justify-between py-3.5 text-base border-b border-white/[0.06] ${current ? 'text-amber-300' : 'text-slate-200'}`}
                    >
                      {l.label}
                      <span aria-hidden="true" className="text-slate-500">›</span>
                    </Link>
                  </motion.li>
                )
              })}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
