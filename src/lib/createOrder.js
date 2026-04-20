import { supabase } from './supabaseClient'

// Crée la commande en Supabase avec statut "pending"
// Retourne l'order créé (avec son id)
export async function createOrder({ items, customer, shippingCost }) {
  if (!supabase) throw new Error('Supabase non configuré')

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const total    = subtotal + shippingCost

  // Config du premier article (format attendu par le dashboard admin)
  const firstItem = items[0] ?? {}
  const cfg       = firstItem.config ?? {}
  const config = {
    motif:    cfg.motif?.id ?? cfg.motif ?? null,
    size:     `${cfg.width ?? ''}×${cfg.height ?? ''} cm`,
    material: cfg.material ?? null,
    led:      cfg.ledColor ?? null,
    dimmer:   cfg.dimmer ?? false,
    engraving: cfg.engraving ?? null,
  }

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      status:           'pending',
      customer_name:    `${customer.firstName} ${customer.lastName}`,
      customer_email:   customer.email,
      customer_address: {
        line1:       customer.address1,
        line2:       customer.address2 ?? '',
        postal_code: customer.postalCode,
        city:        customer.city,
        country:     customer.country,
      },
      config,
      price_ttc:     total,
      status_history: [{ status: 'pending', timestamp: new Date().toISOString() }],
    })
    .select()
    .single()

  if (error) throw error
  return order
}
