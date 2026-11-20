import { generateMotif } from '../lib/generators'

// Mandala : remplace l'ancien dessin à anneaux fermés (14 morceaux tombaient à la découpe)
// par une rosace générée, découpable. L'identifiant « mandala » est conservé.
const spec = { type: 'mandala', seed: 23, params: { rings: 6, petals: 12, style: 'mix' } }

export const mandala = {
  id: 'mandala',
  name: 'Mandala',
  category: 'mandala',
  description: 'Motif géométrique à symétrie radiale',
  generator: spec,
  get svg() {
    return generateMotif(spec, { widthCm: 60, heightCm: 30, motifScale: 90, minBridgeMm: 2.5 }).svg
  },
}
