import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-96 h-96 rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, #ffb347 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
        </div>

        {/* Nav */}
        <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-6">
          <span className="text-amber-400 font-bold text-xl tracking-tight">LumiCut</span>
          <div className="flex gap-6 text-sm text-slate-400">
            <Link to="/studio" className="hover:text-white transition-colors">
              Studio
            </Link>
            <Link to="/gallery" className="hover:text-white transition-colors">
              Galerie
            </Link>
            <Link to="/cart" className="hover:text-white transition-colors">
              Panier
            </Link>
            <Link to="/box/templates" className="hover:text-white transition-colors text-slate-600">
              Box configurator
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center relative z-10 max-w-3xl"
        >
          <div className="inline-block bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 tracking-wider uppercase">
            Découpe laser • LED • Sur mesure
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            Votre panneau
            <br />
            <span className="text-amber-400">décoratif</span>
            <br />
            sur mesure
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-xl mx-auto">
            Concevez votre panneau rétroéclairé en ligne. Nous fabriquons et livrons sous 7 jours.
          </p>
          <Link
            to="/studio"
            className="inline-block bg-amber-400 hover:bg-amber-300 text-black font-bold text-lg px-10 py-4 rounded-full transition-colors shadow-lg shadow-amber-400/25"
          >
            Commencer mon design →
          </Link>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">Comment ça marche</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                n: '01',
                title: 'Choisissez votre motif',
                desc: 'Parmi notre bibliothèque ou uploadez votre propre design SVG.',
                emoji: '🎨',
              },
              {
                n: '02',
                title: 'Personnalisez',
                desc: 'Dimensions, matériau, couleur LED... le prix se met à jour en temps réel.',
                emoji: '⚙️',
              },
              {
                n: '03',
                title: 'On fabrique & livre',
                desc: 'Découpe laser précise, assemblage LED, livraison sous 7 jours.',
                emoji: '📦',
              },
            ].map(s => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-5xl mb-4">{s.emoji}</div>
                <div className="text-amber-400 text-sm font-bold mb-2 tracking-wider">{s.n}</div>
                <h3 className="text-lg font-bold mb-3">{s.title}</h3>
                <p className="text-slate-400 text-sm">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="py-24 px-6 text-center">
        <h2 className="text-3xl font-bold mb-6">Prêt à créer votre panneau ?</h2>
        <Link
          to="/studio"
          className="inline-block bg-amber-400 hover:bg-amber-300 text-black font-bold text-lg px-10 py-4 rounded-full transition-colors"
        >
          Ouvrir le studio →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-6 text-center text-xs text-slate-600">
        © 2025 LumiCut — Tous droits réservés
      </footer>
    </div>
  )
}
