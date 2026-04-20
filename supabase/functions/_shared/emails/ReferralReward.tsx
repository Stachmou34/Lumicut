import { Section, Text, Heading, Button, Hr } from 'npm:@react-email/components@0.0.22'
import { EmailLayout } from './components/EmailLayout.tsx'

interface Props {
  order: { id: string; customer_name: string }
  refereeFirstName?: string
  rewardCode?: string
}

export function ReferralReward({ order, refereeFirstName, rewardCode = 'LUMI-XXXX' }: Props) {
  const firstName  = order.customer_name.split(' ')[0]
  const expiryDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <EmailLayout preview={`🎉 ${firstName}, vous avez gagné 15€ de bon d'achat !`}>
      <Section style={{ padding: '32px 40px' }}>
        <Heading style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
          🎉 Vous avez gagné 15€ !
        </Heading>
        <Text style={{ fontSize: '16px', color: '#475569', margin: '0 0 24px', lineHeight: '1.6' }}>
          Bonjour {firstName},{refereeFirstName ? ` ${refereeFirstName} a` : ' votre filleul a'} passé sa première commande
          LumiCut grâce à vous. Voici votre récompense !
        </Text>

        {/* Code promo */}
        <Section style={{ backgroundColor: '#020617', borderRadius: '12px', padding: '28px', textAlign: 'center' as const, marginBottom: '24px' }}>
          <Text style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 8px' }}>
            Votre bon d'achat
          </Text>
          <Text style={{ fontSize: '36px', fontWeight: '900', color: '#fbbf24', letterSpacing: '0.05em', fontFamily: 'monospace', margin: '0 0 8px' }}>
            {rewardCode}
          </Text>
          <Text style={{ fontSize: '28px', fontWeight: '800', color: '#ffffff', margin: '0 0 12px' }}>
            15€ offerts
          </Text>
          <Text style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
            Valable jusqu'au {expiryDate} · Sans minimum d'achat
          </Text>
        </Section>

        <Section style={{ textAlign: 'center' as const }}>
          <Button href={`https://lumicut.fr/studio?code=${rewardCode}`}
            style={{ backgroundColor: '#fbbf24', color: '#000', fontSize: '15px', fontWeight: '700', padding: '14px 32px', borderRadius: '9999px', textDecoration: 'none' }}>
            Utiliser mon bon →
          </Button>
        </Section>

        <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />

        <Text style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center' as const }}>
          Partagez encore votre code de parrainage et continuez à gagner des bons d'achat !
        </Text>
      </Section>
    </EmailLayout>
  )
}
