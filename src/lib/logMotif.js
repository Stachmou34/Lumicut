// Log silencieux d'un motif Iconify utilisé dans Supabase
// Upsert : crée la ligne si nouvelle, incrémente times_ordered si existante
// Fire-and-forget — n'interrompt jamais le flux utilisateur

import { supabase } from './supabaseClient'

export function logMotifUsage({ id, title, svgString }) {
  if (!supabase) return // mode local sans Supabase configuré

  supabase
    .from('motifs')
    .upsert(
      {
        id,
        name:          title || id,
        source:        'iconify',
        svg_content:   svgString,
        last_used_at:  new Date().toISOString(),
        times_ordered: 1, // valeur initiale à l'insert
      },
      {
        onConflict:        'id',
        ignoreDuplicates:  false,
      }
    )
    .then(() => {
      // Incrémenter times_ordered séparément (upsert ne supporte pas l'incrément natif)
      return supabase.rpc('increment_motif_usage', { motif_id: id })
    })
    .catch(() => {
      // Erreur silencieuse — le log est best-effort
    })
}
