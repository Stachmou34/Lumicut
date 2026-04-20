import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="text-amber-400 font-black text-xl mb-3">LumiCut</div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Panneaux décoratifs rétroéclairés découpés au laser, fabriqués en France.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="#" className="text-slate-600 hover:text-slate-400 text-sm transition-colors">Instagram</a>
              <span className="text-slate-700">·</span>
              <a href="#" className="text-slate-600 hover:text-slate-400 text-sm transition-colors">Pinterest</a>
            </div>
          </div>

          {/* Produit */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Produit</div>
            <ul className="flex flex-col gap-2">
              {[
                { label: 'Studio',        to: '/studio' },
                { label: 'Galerie',       to: '/gallery' },
                { label: 'Tarifs',        to: '/#tarifs' },
                { label: 'Comment ça marche', to: '/#comment' },
              ].map(l => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Informations */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Informations</div>
            <ul className="flex flex-col gap-2">
              {[
                { label: 'Contact',                    to: 'mailto:contact@lumicut.fr' },
                { label: 'CGV',                        to: '/cgv' },
                { label: 'Mentions légales',           to: '/mentions-legales' },
                { label: 'Politique de confidentialité', to: '/politique-confidentialite' },
              ].map(l => (
                <li key={l.label}>
                  {l.to.startsWith('mailto:') ? (
                    <a href={l.to} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">{l.label}</a>
                  ) : (
                    <Link to={l.to} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">{l.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Réassurance */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Garanties</div>
            <ul className="flex flex-col gap-2 text-sm text-slate-500">
              <li>🇫🇷 Fabriqué en France</li>
              <li>🚚 Livraison 7 jours</li>
              <li>🔒 Paiement sécurisé</li>
              <li>↩ Retour 30 jours</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 text-center text-xs text-slate-700">
          © 2025 LumiCut — Tous droits réservés
        </div>
      </div>
    </footer>
  )
}
