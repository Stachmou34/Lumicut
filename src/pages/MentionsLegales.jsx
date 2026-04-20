import Header from '../components/shared/Header'
import Footer from '../components/shared/Footer'

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-white mb-3">{title}</h2>
      <div className="text-slate-400 text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        <h1 className="text-3xl font-bold mb-2">Mentions légales</h1>
        <p className="text-slate-500 text-sm mb-10">Conformément à la loi n° 2004-575 du 21 juin 2004</p>

        <Section title="Éditeur du site">
          <p><strong className="text-slate-200">Raison sociale :</strong> LumiCut</p>
          <p><strong className="text-slate-200">Forme juridique :</strong> Entreprise individuelle</p>
          <p><strong className="text-slate-200">Siège social :</strong> France</p>
          <p><strong className="text-slate-200">Email :</strong> contact@lumicut.fr</p>
        </Section>

        <Section title="Directeur de la publication">
          <p>Le directeur de la publication est le gérant de LumiCut.</p>
        </Section>

        <Section title="Hébergement">
          <p><strong className="text-slate-200">Hébergeur :</strong> Vercel Inc.</p>
          <p>340 Pine Street, Suite 800, San Francisco, CA 94104, USA</p>
          <p><strong className="text-slate-200">Base de données :</strong> Supabase Inc.</p>
        </Section>

        <Section title="Propriété intellectuelle">
          <p>
            Le site lumicut.fr et l'ensemble de son contenu (textes, images, visuels, logotypes)
            sont la propriété exclusive de LumiCut, protégés par les lois françaises et
            internationales relatives à la propriété intellectuelle.
          </p>
          <p>
            Toute reproduction, représentation, modification ou exploitation, totale ou partielle,
            sans autorisation préalable écrite est interdite.
          </p>
        </Section>

        <Section title="Responsabilité">
          <p>
            LumiCut s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées
            sur ce site. LumiCut se réserve le droit de modifier le contenu à tout moment et sans
            préavis.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            Ce site utilise des cookies techniques nécessaires à son fonctionnement et des cookies
            analytiques (avec consentement). Consultez notre{' '}
            <a href="/politique-confidentialite" className="text-amber-400 hover:text-amber-300">
              politique de confidentialité
            </a>
            .
          </p>
        </Section>
      </div>
      <Footer />
    </div>
  )
}
