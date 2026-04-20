import { Section, Text, Heading, Button, Hr } from 'npm:@react-email/components@0.0.22'
import { EmailLayout } from './components/EmailLayout.tsx'

interface Props {
  order: { id: string; customer_name: string; config?: Record<string, string>; price_ttc: number }
}

export function InProduction({ order }: Props) {
  const firstName = order.customer_name.split(' ')[0]
  const shortId   = order.id.slice(0, 8).toUpperCase()
  const deliveryDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <EmailLayout preview={`#${shortId} — Votre panneau est en cours de fabrication ✨`}>
      <Section style={{ padding: '32px 40px' }}>
        <Heading style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
          Votre panneau est en fabrication ✨
        </Heading>
        <Text style={{ fontSize: '16px', color: '#475569', margin: '0 0 24px', lineHeight: '1.6' }}>
          Bonjour {firstName}, bonne nouvelle ! Notre équipe a commencé la fabrication de votre panneau.
        </Text>

        {/* Statut */}
        <Section style={{ backgroundColor: '#fef9c3', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px', borderLeft: '4px solid #fbbf24' }}>
          <Text style={{ fontSize: '11px', color: '#92400e', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 4px' }}>
            Statut actuel
          </Text>
          <Text style={{ fontSize: '18px', fontWeight: '700', color: '#78350f', margin: 0 }}>
            ⚡ Fabrication en cours
          </Text>
        </Section>

        {/* Étapes */}
        {[
          { done: true,  emoji: '✅', label: 'Commande reçue & payée' },
          { done: true,  emoji: '✅', label: 'Design validé & fichier de découpe prêt' },
          { done: false, emoji: '⚡', label: 'Découpe laser en cours', highlight: true },
          { done: false, emoji: '⏳', label: 'Assemblage LED' },
          { done: false, emoji: '⏳', label: `Expédition (estimée : ${deliveryDate})` },
        ].map((s, i) => (
          <Section key={i} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
            <Text style={{
              fontSize: '14px',
              color: s.done ? '#64748b' : s.highlight ? '#0f172a' : '#94a3b8',
              fontWeight: s.highlight ? '700' : '400',
              margin: 0,
            }}>
              {s.emoji} {s.label}
            </Text>
          </Section>
        ))}

        <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />

        <Section style={{ textAlign: 'center' as const }}>
          <Button href={`https://lumicut.fr/order-confirmation?order_id=${order.id}`}
            style={{ backgroundColor: '#fbbf24', color: '#000', fontSize: '15px', fontWeight: '700', padding: '14px 32px', borderRadius: '9999px', textDecoration: 'none' }}>
            Voir ma commande →
          </Button>
        </Section>

        <Text style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center' as const, marginTop: '16px' }}>
          Questions ? <a href="mailto:contact@lumicut.fr" style={{ color: '#fbbf24' }}>contact@lumicut.fr</a>
        </Text>
      </Section>
    </EmailLayout>
  )
}
