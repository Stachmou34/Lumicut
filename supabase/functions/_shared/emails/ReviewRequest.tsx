import { Section, Text, Heading, Button, Hr, Link } from 'npm:@react-email/components@0.0.22'
import { EmailLayout } from './components/EmailLayout.tsx'

interface Props {
  order: { id: string; customer_name: string; config?: Record<string, string> }
}

export function ReviewRequest({ order }: Props) {
  const firstName = order.customer_name.split(' ')[0]
  const shortId   = order.id.slice(0, 8).toUpperCase()
  const reviewUrl = `https://lumicut.fr/review?order=${order.id}`

  return (
    <EmailLayout preview={`${firstName}, comment s'est passée votre expérience LumiCut ?`}>
      <Section style={{ padding: '32px 40px' }}>
        <Heading style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
          Votre avis compte beaucoup ⭐
        </Heading>
        <Text style={{ fontSize: '16px', color: '#475569', margin: '0 0 24px', lineHeight: '1.6' }}>
          Bonjour {firstName}, vous avez reçu votre panneau LumiCut il y a quelques jours.
          On espère qu'il illumine parfaitement votre espace !
        </Text>

        {/* Rappel commande */}
        <Section style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' }}>
          <Text style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px' }}>Votre commande #{shortId}</Text>
          <Text style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', margin: 0 }}>
            {order.config?.motif ?? 'Panneau personnalisé'} — {order.config?.size ?? ''}
          </Text>
        </Section>

        {/* Étoiles */}
        <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
          <Text style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px' }}>
            Notez votre expérience en cliquant sur les étoiles :
          </Text>
          <Section>
            {[1, 2, 3, 4, 5].map(n => (
              <Link key={n} href={`${reviewUrl}&rating=${n}`}
                style={{ fontSize: '32px', textDecoration: 'none', margin: '0 4px' }}>
                ⭐
              </Link>
            ))}
          </Section>
        </Section>

        <Section style={{ textAlign: 'center' as const }}>
          <Button href={reviewUrl}
            style={{ backgroundColor: '#fbbf24', color: '#000', fontSize: '15px', fontWeight: '700', padding: '14px 32px', borderRadius: '9999px', textDecoration: 'none' }}>
            Laisser un avis (2 min) →
          </Button>
        </Section>

        <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />

        <Text style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center' as const }}>
          Votre avis aide d'autres personnes à créer leur panneau parfait.
          Merci pour votre confiance ! 🙏
        </Text>
      </Section>
    </EmailLayout>
  )
}
