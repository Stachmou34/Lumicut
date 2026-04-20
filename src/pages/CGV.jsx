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

export default function CGV() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        <h1 className="text-3xl font-bold mb-2">Conditions Générales de Vente</h1>
        <p className="text-slate-500 text-sm mb-10">Dernière mise à jour : janvier 2025</p>

        <Section title="1. Objet">
          <p>
            Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles
            entre LumiCut (ci-après « le Vendeur ») et tout acheteur (ci-après « le Client ») passant
            commande sur le site lumicut.fr.
          </p>
        </Section>

        <Section title="2. Produits">
          <p>
            LumiCut propose des panneaux décoratifs rétroéclairés découpés au laser, personnalisés
            selon les spécifications du Client. Chaque commande est fabriquée à la demande.
          </p>
          <p>
            Les dimensions, matériaux et motifs affichés sur le configurateur sont fournis à titre
            indicatif. Des variations mineures (± 2 mm, teintes LED) peuvent survenir.
          </p>
        </Section>

        <Section title="3. Prix">
          <p>
            Les prix sont indiqués en euros TTC (TVA 20% incluse). LumiCut se réserve le droit de
            modifier ses prix à tout moment ; les prix applicables sont ceux en vigueur au moment
            de la commande.
          </p>
          <p>
            Les frais de livraison sont calculés en fonction de la destination et affichés avant
            validation de la commande. La livraison est offerte en France métropolitaine à partir
            de 89 €.
          </p>
        </Section>

        <Section title="4. Commande et paiement">
          <p>
            Toute commande implique l'acceptation des présentes CGV. Le paiement est effectué en
            ligne par carte bancaire via Stripe (SSL). La commande est confirmée après validation
            du paiement.
          </p>
          <p>
            En cas d'échec du paiement, la commande n'est pas prise en compte.
          </p>
        </Section>

        <Section title="5. Fabrication et délais de livraison">
          <p>
            Les panneaux étant fabriqués sur mesure, le délai de fabrication est de 3 à 5 jours
            ouvrables. La livraison intervient sous 2 à 3 jours supplémentaires en France.
          </p>
          <p>
            Le délai total estimé est de 7 jours ouvrables à compter de la confirmation de commande.
            Ces délais sont indicatifs et peuvent varier.
          </p>
        </Section>

        <Section title="6. Droit de rétractation">
          <p>
            Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation
            ne s'applique pas aux biens confectionnés selon les spécifications du consommateur.
            Les commandes personnalisées ne peuvent donc pas être annulées ou retournées, sauf
            défaut de fabrication.
          </p>
        </Section>

        <Section title="7. Garanties et réclamations">
          <p>
            LumiCut garantit ses produits contre tout défaut de fabrication pendant 30 jours à
            compter de la réception. En cas de produit défectueux ou non conforme, contactez-nous
            à contact@lumicut.fr avec photos à l'appui.
          </p>
          <p>
            Nous nous engageons à remplacer ou rembourser tout article défectueux dans les 10
            jours ouvrables.
          </p>
        </Section>

        <Section title="8. Propriété intellectuelle">
          <p>
            Les motifs fournis par LumiCut sont sous licence. Les motifs personnalisés fournis par
            le Client relèvent de sa responsabilité exclusive.
          </p>
        </Section>

        <Section title="9. Litiges">
          <p>
            En cas de litige, une solution amiable sera recherchée en priorité. À défaut, les
            tribunaux français seront seuls compétents.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>LumiCut — contact@lumicut.fr</p>
        </Section>
      </div>
      <Footer />
    </div>
  )
}
