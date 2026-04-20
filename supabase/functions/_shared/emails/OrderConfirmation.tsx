import {
  Section, Text, Heading, Button, Hr, Row, Column
} from 'npm:@react-email/components@0.0.22'
import { EmailLayout } from './components/EmailLayout.tsx'

interface OrderItem {
  id: string
  config: { motif?: { name?: string }; width?: number; height?: number; material?: string; ledColor?: string }
  price: number
  quantity: number
}

interface Props {
  order: {
    id: string
    customer_name: string
    customer_email: string
    price_ttc: number
    customer_address?: Record<string, string>
    items?: OrderItem[]
    config?: Record<string, string>
  }
}

export function OrderConfirmation({ order }: Props) {
  const firstName   = order.customer_name.split(' ')[0]
  const shortId     = order.id.slice(0, 8).toUpperCase()
  const addr        = order.customer_address ?? {}
  const deliveryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const items: OrderItem[] = order.items ?? []

  return (
    <EmailLayout preview={`Commande #${shortId} confirmée — Merci ${firstName} !`}>
      <Section style={content}>
        {/* Titre */}
        <Heading style={h1}>Merci {firstName} ! 🎉</Heading>
        <Text style={lead}>
          Votre commande est confirmée. On commence la fabrication tout de suite.
        </Text>

        {/* Numéro de commande */}
        <Section style={orderBox}>
          <Text style={orderLabel}>Numéro de commande</Text>
          <Text style={orderId}>#{shortId}</Text>
        </Section>

        {/* Articles */}
        {items.length > 0 && (
          <>
            <Text style={sectionTitle}>Votre commande</Text>
            {items.map((item, i) => (
              <Section key={i} style={itemRow}>
                <Row>
                  <Column style={{ width: '70%' }}>
                    <Text style={itemName}>
                      {item.config?.motif?.name ?? 'Panneau personnalisé'}
                    </Text>
                    <Text style={itemDetail}>
                      {item.config?.width}×{item.config?.height} cm
                      {item.config?.material ? ` · ${item.config.material.replace(/-/g, ' ')}` : ''}
                    </Text>
                    {item.quantity > 1 && (
                      <Text style={itemDetail}>Quantité : {item.quantity}</Text>
                    )}
                  </Column>
                  <Column style={{ width: '30%', textAlign: 'right' as const }}>
                    <Text style={itemPrice}>
                      {(item.price * item.quantity).toFixed(2)} €
                    </Text>
                  </Column>
                </Row>
              </Section>
            ))}
          </>
        )}

        {/* Total */}
        <Section style={totalBox}>
          <Row>
            <Column><Text style={totalLabel}>Total payé</Text></Column>
            <Column style={{ textAlign: 'right' as const }}>
              <Text style={totalAmount}>{Number(order.price_ttc).toFixed(2)} €</Text>
            </Column>
          </Row>
        </Section>

        {/* Adresse */}
        {addr.line1 && (
          <>
            <Text style={sectionTitle}>Adresse de livraison</Text>
            <Section style={addrBox}>
              <Text style={addrText}>{order.customer_name}</Text>
              <Text style={addrText}>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</Text>
              <Text style={addrText}>{addr.postal_code} {addr.city}</Text>
            </Section>
          </>
        )}

        <Hr style={hr} />

        {/* Timeline */}
        <Text style={sectionTitle}>Et maintenant ?</Text>
        {[
          { emoji: '🎨', step: 'Design en cours', detail: 'Nous préparons votre fichier de découpe' },
          { emoji: '⚡', step: 'Fabrication sous 24-48h', detail: 'Découpe laser + assemblage LED' },
          { emoji: '📦', step: 'Expédition', detail: 'Vous recevrez un numéro de suivi' },
          { emoji: '🏠', step: `Livraison estimée`, detail: `Le ${deliveryDate}` },
        ].map((s, i) => (
          <Section key={i} style={timelineRow}>
            <Row>
              <Column style={{ width: '40px', verticalAlign: 'middle' as const }}>
                <Text style={timelineEmoji}>{s.emoji}</Text>
              </Column>
              <Column>
                <Text style={timelineStep}>{s.step}</Text>
                <Text style={timelineDetail}>{s.detail}</Text>
              </Column>
            </Row>
          </Section>
        ))}

        <Hr style={hr} />

        {/* CTA */}
        <Section style={{ textAlign: 'center' as const, padding: '8px 0 24px' }}>
          <Button href={`https://lumicut.fr/order-confirmation?order_id=${order.id}`} style={cta}>
            Suivre ma commande →
          </Button>
        </Section>

        <Text style={helpText}>
          Une question ? Répondez à cet email ou écrivez-nous à{' '}
          <a href="mailto:contact@lumicut.fr" style={{ color: '#fbbf24' }}>contact@lumicut.fr</a>
        </Text>
      </Section>
    </EmailLayout>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const content    = { padding: '32px 40px' }
const h1         = { fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }
const lead       = { fontSize: '16px', color: '#475569', margin: '0 0 24px', lineHeight: '1.6' }
const orderBox   = { backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px', borderLeft: '4px solid #fbbf24' }
const orderLabel = { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 4px' }
const orderId    = { fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }
const sectionTitle = { fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '24px 0 8px' }
const itemRow    = { borderBottom: '1px solid #f1f5f9', padding: '12px 0' }
const itemName   = { fontSize: '15px', fontWeight: '600', color: '#0f172a', margin: '0 0 2px' }
const itemDetail = { fontSize: '13px', color: '#64748b', margin: '0 0 2px' }
const itemPrice  = { fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }
const totalBox   = { backgroundColor: '#0f172a', borderRadius: '8px', padding: '16px 20px', margin: '16px 0' }
const totalLabel = { fontSize: '14px', color: '#94a3b8', margin: 0 }
const totalAmount = { fontSize: '22px', fontWeight: '800', color: '#fbbf24', margin: 0 }
const addrBox    = { backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px 20px', marginBottom: '8px' }
const addrText   = { fontSize: '14px', color: '#334155', margin: '0 0 2px' }
const hr         = { borderColor: '#e2e8f0', margin: '24px 0' }
const timelineRow = { padding: '6px 0' }
const timelineEmoji = { fontSize: '20px', margin: 0 }
const timelineStep  = { fontSize: '14px', fontWeight: '600', color: '#0f172a', margin: '0 0 1px' }
const timelineDetail = { fontSize: '13px', color: '#64748b', margin: 0 }
const cta        = { backgroundColor: '#fbbf24', color: '#000', fontSize: '15px', fontWeight: '700', padding: '14px 32px', borderRadius: '9999px', textDecoration: 'none', display: 'inline-block' }
const helpText   = { fontSize: '13px', color: '#94a3b8', textAlign: 'center' as const, marginTop: '16px' }
