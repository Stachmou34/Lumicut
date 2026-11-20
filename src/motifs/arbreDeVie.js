import { generateMotif } from '../lib/generators'

// Arbre de vie : le motif emblématique, désormais généré pour être découpable
// (cercle coupé par des ponts, branches sans boucle, feuilles séparées).
// L'identifiant reste « arbre-de-vie » pour les liens, le conseiller et l'administration.
const spec = { type: 'treeOfLife', seed: 7, params: {} }

export const arbreDeVie = {
  id: 'arbre-de-vie',
  name: 'Arbre de Vie',
  category: 'nature',
  description: 'Le motif emblématique, idéal pour un salon',
  generator: spec,
  // SVG de référence (format M), pour les vignettes et les écrans qui n'ont pas les dimensions
  get svg() {
    return generateMotif(spec, { widthCm: 60, heightCm: 30, motifScale: 90, minBridgeMm: 2.5 }).svg
  },
}
