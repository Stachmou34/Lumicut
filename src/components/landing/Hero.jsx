import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950">

      {/* Fond : simulation photo sombre avec halos LED */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Halo principal ambré */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(ellipse, #ffb347 0%, transparent 65%)', filter: 'blur(80px)' }}
        />
        {/* Halo secondaire violet */}
        <div
          className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(ellipse, #bf7fff 0%, transparent 65%)', filter: 'blur(60px)' }}
        />
        {/* Texture sombre */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/80 to-slate-950" />
      </div>

      {/* Panneau simulé en arrière-plan */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div
          className="w-80 h-40 rounded-sm"
          style={{
            background: '#0a0a0a',
            border: '2px solid #1a1a1a',
            boxShadow: '0 0 80px 30px rgba(255,179,71,0.4), 0 0 160px 60px rgba(255,179,71,0.15)',
          }}
        >
          <svg viewBox="0 0 200 100" width="100%" height="100%">
            <g transform="translate(100,50) scale(0.5) translate(-100,-100)">
              {/* Arbre de vie simplifié */}
              <ellipse cx="100" cy="40" rx="35" ry="45" fill="rgba(255,179,71,0.6)" filter="url(#h)" />
              <rect x="93" y="80" width="14" height="30" fill="rgba(255,179,71,0.6)" />
              <defs>
                <filter id="h">
                  <feGaussianBlur stdDeviation="4" />
                </filter>
              </defs>
            </g>
          </svg>
        </div>
      </div>

      {/* Contenu */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/25 text-amber-400 text-xs font-semibold px-4 py-2 rounded-full mb-8 tracking-wider uppercase"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Découpe laser · LED sur mesure · Fabriqué en France
        </motion.div>

        {/* Titre */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-black mb-6 leading-[1.05] tracking-tight"
        >
          Créez votre panneau
          <br />
          <span
            className="text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(135deg, #ffb347 0%, #ff8c42 50%, #ffcc70 100%)' }}
          >
            décoratif unique
          </span>
        </motion.h1>

        {/* Sous-titre */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed"
        >
          Découpé au laser, rétroéclairé, livré chez vous en&nbsp;7&nbsp;jours.
          Configurez en ligne en 2 minutes.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <Link
            to="/studio"
            className="bg-amber-400 hover:bg-amber-300 text-black font-bold text-lg px-10 py-4 rounded-full transition-all shadow-2xl shadow-amber-400/30 hover:shadow-amber-400/50 hover:scale-105"
          >
            Créer mon panneau →
          </Link>
          <a
            href="#galerie"
            className="text-slate-400 hover:text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            Voir les réalisations
            <span className="text-xs opacity-60">↓</span>
          </a>
        </motion.div>

        {/* Badge réassurance */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500"
        >
          <span>⭐ 4.9/5 clients satisfaits</span>
          <span className="text-slate-700">·</span>
          <span>🚚 Livraison en 7 jours</span>
          <span className="text-slate-700">·</span>
          <span>🇫🇷 Fabriqué en France</span>
          <span className="text-slate-700">·</span>
          <span>↩ Satisfait ou remboursé</span>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
      >
        <span className="text-xs text-slate-600 tracking-widest uppercase">Découvrir</span>
        <motion.div
          className="w-px h-8 bg-gradient-to-b from-slate-600 to-transparent"
          animate={{ scaleY: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.div>
    </section>
  )
}
