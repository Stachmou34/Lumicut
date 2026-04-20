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

export default function PolitiqueConfidentialite() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        <h1 className="text-3xl font-bold mb-2">Politique de confidentialité</h1>
        <p className="text-slate-500 text-sm mb-10">Dernière mise à jour : janvier 2025 — Conformité RGPD</p>

        <Section title="1. Responsable du traitement">
          <p>
            LumiCut est responsable du traitement de vos données personnelles collectées via
            le site lumicut.fr. Contact : contact@lumicut.fr
          </p>
        </Section>

        <Section title="2. Données collectées">
          <p>Nous collectons les données suivantes :</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Données d'identification (nom, prénom, email, téléphone)</li>
            <li>Adresse de livraison</li>
            <li>Données de commande et de paiement (traitées par Stripe)</li>
            <li>Données de navigation (cookies techniques)</li>
          </ul>
          <p>
            <strong className="text-slate-200">Important :</strong> LumiCut ne stocke jamais
            vos données de carte bancaire. Le paiement est traité directement par Stripe
            (certifié PCI-DSS).
          </p>
        </Section>

        <Section title="3. Finalités du traitement">
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Traitement et suivi de vos commandes</li>
            <li>Communication relative à vos commandes</li>
            <li>Amélioration de l'expérience utilisateur</li>
            <li>Respect de nos obligations légales (comptabilité, fiscalité)</li>
          </ul>
        </Section>

        <Section title="4. Base légale">
          <p>
            Le traitement de vos données est fondé sur l'exécution du contrat (commandes) et
            votre consentement (communications marketing, cookies analytiques).
          </p>
        </Section>

        <Section title="5. Destinataires des données">
          <p>Vos données peuvent être transmises à :</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong className="text-slate-200">Stripe</strong> — traitement des paiements</li>
            <li><strong className="text-slate-200">Supabase</strong> — hébergement de la base de données</li>
            <li><strong className="text-slate-200">Transporteurs</strong> — livraison de vos commandes</li>
          </ul>
          <p>Vos données ne sont jamais vendues à des tiers.</p>
        </Section>

        <Section title="6. Conservation des données">
          <p>
            Vos données sont conservées pendant 3 ans à compter de votre dernière commande, puis
            supprimées ou anonymisées. Les données comptables sont conservées 10 ans conformément
            à la loi.
          </p>
        </Section>

        <Section title="7. Vos droits (RGPD)">
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Droit d'accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement (« droit à l'oubli »)</li>
            <li>Droit à la portabilité</li>
            <li>Droit d'opposition au traitement</li>
          </ul>
          <p>
            Pour exercer ces droits : contact@lumicut.fr. Vous pouvez également saisir la CNIL
            (cnil.fr) en cas de litige.
          </p>
        </Section>

        <Section title="8. Cookies">
          <p>Nous utilisons les types de cookies suivants :</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong className="text-slate-200">Cookies essentiels</strong> — nécessaires au
              fonctionnement du site (panier, session). Pas de consentement requis.
            </li>
            <li>
              <strong className="text-slate-200">Cookies analytiques</strong> — mesure d'audience
              (avec votre consentement).
            </li>
          </ul>
          <p>
            Vous pouvez gérer vos préférences via le bandeau cookies ou les paramètres de votre
            navigateur.
          </p>
        </Section>
      </div>
      <Footer />
    </div>
  )
}
