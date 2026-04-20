// Edge Function Supabase — Envoi des emails transactionnels via Resend
// Sans React Email (incompatible Deno) — HTML inline simple et fiable

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'
import { Resend } from 'npm:resend@3'

const resend   = new Resend(Deno.env.get('RESEND_API_KEY') ?? '')
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)
const FROM = Deno.env.get('EMAIL_FROM') ?? 'LumiCut <onboarding@resend.dev>'

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { orderId, type, extraData = {} } = await req.json()

    if (!orderId || !type) {
      return Response.json({ error: 'orderId et type requis' }, { status: 400, headers: corsHeaders })
    }

    // Récupérer la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return Response.json({ error: 'Commande introuvable' }, { status: 404, headers: corsHeaders })
    }

    // Dédup
    const { data: alreadySent } = await supabase
      .from('email_logs')
      .select('id')
      .eq('order_id', orderId)
      .eq('email_type', type)
      .maybeSingle()

    if (alreadySent) {
      return Response.json({ skipped: true }, { headers: corsHeaders })
    }

    // Générer le contenu
    const { subject, html } = buildEmail(type, order, extraData)

    // Envoyer via Resend
    const { data: sent, error: sendError } = await resend.emails.send({
      from:    FROM,
      to:      order.customer_email,
      subject,
      html,
    })

    if (sendError) throw new Error(JSON.stringify(sendError))

    // Logger
    await supabase.from('email_logs').insert({
      order_id:   orderId,
      email_type: type,
      recipient:  order.customer_email,
      resend_id:  sent?.id ?? null,
      status:     'sent',
    })

    return Response.json({ success: true, id: sent?.id }, { headers: corsHeaders })

  } catch (err) {
    console.error('send-order-email error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500, headers: corsHeaders }
    )
  }
})

// ─── Génération HTML ──────────────────────────────────────────────────────────

function buildEmail(type: string, order: any, extraData: any): { subject: string; html: string } {
  const shortId   = order.id.slice(0, 8).toUpperCase()
  const firstName = order.customer_name?.split(' ')[0] ?? 'Client'
  const total     = Number(order.price_ttc).toFixed(2)
  const deliveryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  switch (type) {

    case 'confirmation':
      return {
        subject: `✅ Commande #${shortId} confirmée — Merci ${firstName} !`,
        html: layout(`Merci ${firstName} ! 🎉`, `
          <p style="font-size:16px;color:#475569;">Votre commande est confirmée. On commence la fabrication tout de suite.</p>

          <div style="background:#f8fafc;border-left:4px solid #fbbf24;border-radius:8px;padding:16px 20px;margin:20px 0;">
            <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin:0 0 4px;">Numéro de commande</p>
            <p style="font-size:24px;font-weight:900;color:#0f172a;margin:0;">#${shortId}</p>
          </div>

          <div style="background:#0f172a;border-radius:8px;padding:16px 20px;margin:16px 0;display:flex;justify-content:space-between;">
            <span style="color:#94a3b8;font-size:14px;">Total payé</span>
            <span style="color:#fbbf24;font-size:22px;font-weight:900;">${total} €</span>
          </div>

          <h3 style="font-size:14px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin:24px 0 12px;">Et maintenant ?</h3>
          ${timeline([
            ['🎨', 'Design en cours', 'Nous préparons votre fichier de découpe'],
            ['⚡', 'Fabrication sous 24-48h', 'Découpe laser + assemblage LED'],
            ['📦', 'Expédition', 'Vous recevrez un numéro de suivi'],
            ['🏠', 'Livraison estimée', deliveryDate],
          ])}

          <div style="text-align:center;margin:28px 0;">
            <a href="https://lumicut.fr" style="background:#fbbf24;color:#000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:9999px;text-decoration:none;display:inline-block;">
              Suivre ma commande →
            </a>
          </div>
        `),
      }

    case 'production':
      return {
        subject: `⚡ #${shortId} — Votre panneau est en cours de fabrication`,
        html: layout(`Votre panneau est en fabrication ✨`, `
          <p style="font-size:16px;color:#475569;">Bonjour ${firstName}, notre équipe a commencé la fabrication de votre panneau !</p>
          <div style="background:#fef9c3;border-left:4px solid #fbbf24;border-radius:8px;padding:16px 20px;margin:20px 0;">
            <p style="font-size:18px;font-weight:700;color:#78350f;margin:0;">⚡ Fabrication en cours</p>
          </div>
          ${timeline([
            ['✅', 'Commande reçue & payée', ''],
            ['✅', 'Design validé', 'Fichier de découpe prêt'],
            ['⚡', 'Découpe laser en cours', 'En ce moment'],
            ['⏳', 'Assemblage LED', ''],
            ['⏳', 'Expédition', `Estimée : ${deliveryDate}`],
          ])}
        `),
      }

    case 'shipped':
      return {
        subject: `📦 #${shortId} — Votre panneau est en route !`,
        html: layout(`Votre panneau est en route ! 📦`, `
          <p style="font-size:16px;color:#475569;">Bonjour ${firstName}, votre panneau a été expédié !</p>
          ${extraData?.tracking ? `
            <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:8px;padding:16px 20px;margin:20px 0;">
              <p style="font-size:11px;color:#166534;text-transform:uppercase;margin:0 0 4px;">${extraData.tracking.carrier}</p>
              <p style="font-size:20px;font-weight:800;color:#15803d;font-family:monospace;margin:0 0 12px;">${extraData.tracking.number}</p>
              <a href="${extraData.tracking.url}" style="background:#22c55e;color:#fff;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none;">Suivre mon colis →</a>
            </div>
          ` : ''}
          <p style="color:#475569;">Livraison estimée : <strong>${deliveryDate}</strong></p>
        `),
      }

    case 'review_request':
      return {
        subject: `⭐ Comment s'est passée votre expérience LumiCut ?`,
        html: layout(`Votre avis compte ! ⭐`, `
          <p style="font-size:16px;color:#475569;">Bonjour ${firstName}, vous avez reçu votre panneau LumiCut. On espère qu'il illumine votre espace !</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="https://lumicut.fr/review?order=${order.id}" style="background:#fbbf24;color:#000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:9999px;text-decoration:none;display:inline-block;">
              Laisser un avis (2 min) →
            </a>
          </div>
          <p style="color:#94a3b8;font-size:13px;text-align:center;">Votre avis aide d'autres personnes à créer leur panneau parfait. Merci 🙏</p>
        `),
      }

    case 'referral_reward':
      return {
        subject: `🎉 Vous avez gagné 15€ de bon d'achat !`,
        html: layout(`Vous avez gagné 15€ ! 🎉`, `
          <p style="font-size:16px;color:#475569;">Bonjour ${firstName}, votre filleul a passé commande grâce à vous !</p>
          <div style="background:#020617;border-radius:12px;padding:28px;text-align:center;margin:20px 0;">
            <p style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;margin:0 0 8px;">Votre bon d'achat</p>
            <p style="font-size:36px;font-weight:900;color:#fbbf24;font-family:monospace;margin:0 0 8px;">${extraData?.rewardCode ?? 'LUMI-XXXX'}</p>
            <p style="font-size:28px;font-weight:800;color:#fff;margin:0;">15€ offerts</p>
          </div>
          <div style="text-align:center;">
            <a href="https://lumicut.fr/studio" style="background:#fbbf24;color:#000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:9999px;text-decoration:none;display:inline-block;">
              Utiliser mon bon →
            </a>
          </div>
        `),
      }

    default:
      return { subject: 'LumiCut', html: layout('Message LumiCut', '<p>Bonjour !</p>') }
  }
}

function timeline(steps: [string, string, string][]): string {
  return steps.map(([emoji, title, detail]) => `
    <div style="display:flex;align-items:flex-start;gap:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
      <span style="font-size:18px;width:24px;flex-shrink:0;">${emoji}</span>
      <div>
        <p style="font-size:14px;font-weight:600;color:#0f172a;margin:0;">${title}</p>
        ${detail ? `<p style="font-size:13px;color:#64748b;margin:2px 0 0;">${detail}</p>` : ''}
      </div>
    </div>
  `).join('')
}

function layout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:20px 0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <!-- Header -->
    <div style="background:#020617;padding:28px 40px;text-align:center;">
      <p style="color:#fbbf24;font-size:24px;font-weight:900;letter-spacing:-.5px;margin:0;">LumiCut</p>
      <p style="color:#64748b;font-size:12px;margin:4px 0 0;">Panneaux rétroéclairés fabriqués en France</p>
    </div>
    <!-- Contenu -->
    <div style="padding:32px 40px;">
      <h1 style="font-size:24px;font-weight:800;color:#0f172a;margin:0 0 16px;">${title}</h1>
      ${content}
    </div>
    <!-- Footer -->
    <div style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 6px;">LumiCut — Panneaux décoratifs fabriqués en France</p>
      <p style="color:#cbd5e1;font-size:11px;margin:0;">Vous recevez cet email car vous avez passé commande sur lumicut.fr.</p>
    </div>
  </div>
</body>
</html>`
}
