import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const NAV_LINKS = [
  { label: 'Galerie',            href: '#galerie' },
  { label: 'Comment ça marche', href: '#comment' },
  { label: 'Tarifs',             href: '#tarifs' },
]

export default function Header() {
  const [scrolled, setScrolled] = useState(false)

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
          {NAV_LINKS.map(l => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <Link
          to="/studio"
          className="bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold px-5 py-2.5 rounded-full transition-colors shadow-lg shadow-amber-400/20"
        >
          Créer mon panneau
        </Link>
      </div>
    </motion.header>
  )
}
