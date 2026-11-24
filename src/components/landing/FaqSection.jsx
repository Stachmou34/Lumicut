import { Link } from 'react-router-dom'
import { HUE_CONNECTIVITY } from '../../lib/lighting/lightingCatalog'
import { deliveryLabel } from '../../lib/landingFacts'

// Questions fréquentes : réponses tirées du fonctionnement réel du site
const QUESTIONS = [
  {
    q: 'Faut-il un pont Philips Hue ?',
    a: () => `Non. ${HUE_CONNECTIVITY}`,
  },
  {
    q: 'Comment le panneau est-il fixé ?',
    a: () => 'Le kit de pose est fourni : entretoises inox, noires ou laiton (20, 30 ou 40 mm du mur), fixation invisible collée au dos, ou câbles pour un panneau suspendu au plafond.',
  },
  {
    q: 'Comment poser le ruban LED ?',
    a: () => 'Le panneau est creusé en U au dos, sur 2 cm d’épaisseur. Le ruban est livré dans le colis, non posé : vous le collez au fond du creux, contre le bord, en partant de l’encoche du câble, puis vous le branchez. Une fois posé, il est invisible de face comme de profil.',
    link: { to: '/pose', label: 'Voir le guide de pose' },
  },
  {
    q: 'Quelle taille choisir ?',
    a: () => 'Dans le studio, vous comparez votre panneau à une silhouette de 1,70 m et vous le voyez en 3D, au mur ou au plafond, dans plusieurs pièces.',
  },
  {
    q: 'Et si mon motif est trop fin pour la découpe ?',
    a: () => 'Le studio contrôle la découpe en direct : il signale les morceaux qui tomberaient et les passages trop fins, et propose une solution (police pochoir, autre style de découpe, taille plus grande).',
  },
  {
    q: 'Quand vais-je recevoir mon panneau ?',
    a: () => `Pour une commande passée aujourd’hui, la livraison est estimée le ${deliveryLabel()}. La date exacte s’affiche dans le studio avant de commander.`,
  },
]

export default function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20 bg-slate-950 px-4 sm:px-8 py-24 lg:py-32">
      <div className="max-w-3xl mx-auto">
        <p className="text-sm font-semibold text-amber-400">Questions fréquentes</p>
        <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight text-white">Bon à savoir.</h2>
        <div className="mt-10 divide-y divide-white/10 rounded-3xl ring-1 ring-white/10">
          {QUESTIONS.map(({ q, a, link }) => (
            <details key={q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium text-white">
                {q}
                <span className="text-amber-400 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 text-slate-400 leading-relaxed">{a()}</p>
              {link && (
                <Link to={link.to} className="mt-3 inline-block font-medium text-amber-400 hover:text-amber-300 transition-colors">
                  {link.label} →
                </Link>
              )}
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
