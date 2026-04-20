import { Section, Text, Heading, Button, Hr } from 'npm:@react-email/components@0.0.22'
import { EmailLayout } from './components/EmailLayout.tsx'

interface Props {
  order: { id: string; customer_name: string; price_ttc: number }
  tracking?: { number: string; carrier: string; url: string }
}

export function Shipped({ order, tracking }: Props) {
  const firstName = order.customer_name.split(' ')[0]
  const shortId   = order.id.slice(0, 8).toUpperCase()
  const deliveryDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <EmailLayout preview={`#${shortId} — Votre panneau est en route 📦`}>
      <Section style={{ padding: '32px 40px' }}>
        <Heading style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
          Votre panneau est en route ! 📦
        </Heading>
        <Text style={{ fontSize: '16px', color: '#475569', margin: '0 0 24px', lineHeight: '1.6' }}>
          Bonjour {firstName}, votre panneau a été expédié et est en chemin vers chez vous.
        </Text>

        {/* Suivi */}
        {tracking ? (
          <Section style={{ backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '20px', marginBottom: '24px', borderLeft: '4px solid #22c55e' }}>
            <Text style={{ fontSize: '11px', color: '#166534', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 4px' }}>
              Numéro de suivi — {tracking.carrier}
            </Text>
            <Text style={{ fontSize: '20px', fontWeight: '800', color: '#15803d', margin: '0 0 12px', fontFamily: 'monospace' }}>
              {tracking.number}
            </Text>
            <Button href={tracking.url}
              style={{ backgroundColor: '#22c55e', color: '#fff', fontSize: '13px', fontWeight: '700', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none' }}>
              Suivre mon colis →
            </Button>
          </Section>
        ) : (
          <Section style={{ backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px', borderLeft: '4px solid #22c55e' }}>
            <Text style={{ fontSize: '16px', fontWeight: '700', color: '#15803d', margin: 0 }}>
              📦 Expédié — numéro de suivi disponible sous peu
            </Text>
          </Section>
        )}

        {/* Date estimée */}
        <Section style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' }}>
          <Text style={{ fontSize: '13px', color: '#64748b', margin: '0 0 4px' }}>Livraison estimée</Text>
          <Text style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            {deliveryDate}
          </Text>
        </Section>

        <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />

        {/* Conseils */}
        <Text style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: '0 0 12px' }}>
          Conseils d'installation
        </Text>
        {[
          '🔌 Branchez le câble d\'alimentation AVANT de fixer le panneau',
          '🪛 Utilisez les vis M4 fournies pour un montage mural solide',
          '🌡️ Évitez les zones humides — le panneau est décoratif intérieur',
          '💡 La couleur LED peut être réglée avec le variateur (si inclus)',
        ].map((tip, i) => (
          <Text key={i} style={{ fontSize: '13px', color: '#475569', margin: '0 0 6px' }}>{tip}</Text>
        ))}

        <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />

        <Text style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center' as const }}>
          Problème à la réception ? <a href="mailto:contact@lumicut.fr" style={{ color: '#fbbf24' }}>contact@lumicut.fr</a>
        </Text>
      </Section>
    </EmailLayout>
  )
}
