// Edge Function Supabase — Génération DXF et stockage dans Supabase Storage
// Déploiement : supabase functions deploy generate-order-dxf
// Bucket Supabase Storage requis : "production" (privé)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { orderId } = await req.json()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return Response.json({ error: 'Commande introuvable' }, { status: 404, headers: corsHeaders })
    }

    // Générer le DXF à partir de la config de la commande
    const config = order.config ?? {}
    const widthMM  = Number(config.size?.split('×')[0]) || 600
    const heightMM = Number(config.size?.split('×')[1]?.replace(' cm', '')) || 300

    const dxfContent = generateDXF({
      widthMM,
      heightMM,
      motifId:   config.motif ?? 'custom',
      engraving: config.engraving,
    })

    const fileName = `orders/${orderId}/panneau.dxf`

    // Upload vers Supabase Storage (bucket "production")
    const { error: uploadError } = await supabase.storage
      .from('production')
      .upload(fileName, new Blob([dxfContent], { type: 'application/dxf' }), { upsert: true })

    if (uploadError) {
      // Si le bucket n'existe pas encore, on log l'erreur sans bloquer
      console.error('Erreur upload DXF:', uploadError.message)
      return Response.json({ success: false, error: uploadError.message }, { headers: corsHeaders })
    }

    // URL signée valable 30 jours
    const { data: signedData } = await supabase.storage
      .from('production')
      .createSignedUrl(fileName, 60 * 60 * 24 * 30)

    // Mettre à jour l'ordre avec l'URL DXF
    await supabase
      .from('orders')
      .update({ dxf_url: signedData?.signedUrl ?? null })
      .eq('id', orderId)

    console.log(`DXF généré pour la commande ${orderId}`)

    return Response.json(
      { success: true, fileName, signedUrl: signedData?.signedUrl },
      { headers: corsHeaders }
    )

  } catch (err) {
    console.error('generate-order-dxf error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500, headers: corsHeaders }
    )
  }
})

// ─── Génération DXF ──────────────────────────────────────────────────────────
// Génère un fichier DXF minimal avec contour du panneau + guide de découpe
// Format : DXF R12 (compatible LightBurn, LaserGRBL, Inkscape)

function generateDXF({ widthMM, heightMM, motifId, engraving }: {
  widthMM: number
  heightMM: number
  motifId: string
  engraving?: string
}): string {
  const lines: string[] = []

  function add(code: number, value: string | number) {
    lines.push(String(code))
    lines.push(String(value))
  }

  // En-tête DXF
  add(0, 'SECTION')
  add(2, 'HEADER')
  add(9, '$ACADVER')
  add(1, 'AC1009')
  add(0, 'ENDSEC')

  // Définition des calques
  add(0, 'SECTION')
  add(2, 'TABLES')
  add(0, 'TABLE')
  add(2, 'LAYER')
  add(70, 3)
  for (const [name, color] of [['contour', 7], ['motif', 5], ['gravure', 3]] as const) {
    add(0, 'LAYER')
    add(2, name)
    add(70, 0)
    add(62, color)
    add(6, 'CONTINUOUS')
  }
  add(0, 'ENDTAB')
  add(0, 'ENDSEC')

  // Entités
  add(0, 'SECTION')
  add(2, 'ENTITIES')

  // Contour du panneau (rectangle, calque "contour")
  add(0, 'LWPOLYLINE')
  add(8, 'contour')
  add(90, 4)  // 4 sommets
  add(70, 1)  // fermé
  for (const [x, y] of [[0, 0], [widthMM, 0], [widthMM, heightMM], [0, heightMM]]) {
    add(10, x)
    add(20, y)
  }

  // Trous de fixation (2 points haut, calque "contour")
  for (const cx of [20, widthMM - 20]) {
    add(0, 'CIRCLE')
    add(8, 'contour')
    add(10, cx)
    add(20, heightMM - 15)
    add(30, 0)
    add(40, 3.5)  // rayon 3.5mm → vis M6
  }

  // Zone réservée au motif (bounding box indicative, calque "motif")
  const margin = Math.min(widthMM, heightMM) * 0.1
  add(0, 'LWPOLYLINE')
  add(8, 'motif')
  add(90, 4)
  add(70, 1)
  for (const [x, y] of [
    [margin, margin],
    [widthMM - margin, margin],
    [widthMM - margin, heightMM - margin],
    [margin, heightMM - margin],
  ]) {
    add(10, x)
    add(20, y)
  }

  // Texte de gravure (si présent, calque "gravure")
  if (engraving) {
    add(0, 'TEXT')
    add(8, 'gravure')
    add(10, widthMM / 2)
    add(20, 15)
    add(30, 0)
    add(40, 8)  // hauteur 8mm
    add(1, engraving)
    add(72, 1)  // centré
  }

  // Commentaire motif (TEXT informatif)
  add(0, 'TEXT')
  add(8, 'gravure')
  add(10, 5)
  add(20, 5)
  add(30, 0)
  add(40, 4)
  add(1, `LUMICUT | Motif: ${motifId} | ${widthMM}x${heightMM}mm`)

  add(0, 'ENDSEC')
  add(0, 'EOF')

  return lines.join('\n')
}
