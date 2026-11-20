// Registre des générateurs de motifs paramétriques.
// Un motif généré est décrit par { type, seed, params } : la même description redonne toujours
// exactement le même motif (partage par lien, commande, fichier de découpe).

import { organic, lattice } from './cells'
import { mountains, forest, starrySky } from './landscapes'
import { mandala, sun, treeOfLife } from './emblems'
import { worldMap } from './worldmap'
import { createRandom, svgDocument } from './geometry'

export const GENERATORS = [mountains, forest, starrySky, treeOfLife, worldMap, organic, lattice, mandala, sun]

// Cadre plein laissé autour des motifs pleine surface (cm)
export const FRAME_CM = 2

export function getGenerator(id) {
  return GENERATORS.find(g => g.id === id) ?? GENERATORS[0]
}

// Paramètres complets (valeurs par défaut) ; le pont ne descend jamais sous le minimum du matériau
export function resolveParams(gen, params = {}, minBridgeMm = 3) {
  const out = {}
  for (const p of gen.params) out[p.key] = params[p.key] ?? p.default
  if ('bridge' in out) out.bridge = Math.max(out.bridge, minBridgeMm)
  return out
}

export function defaultSpec(id, seed = 1) {
  const gen = getGenerator(id)
  return { type: gen.id, seed, params: resolveParams(gen) }
}

export function randomSeed() {
  return 1 + Math.floor(Math.random() * 99999)
}

function hashString(s) {
  let h = 2166136261
  for (const ch of s) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Petit cache : la 2D, la 3D, l'analyse et les vignettes demandent souvent le même motif
const cache = new Map()

/**
 * Génère le SVG d'un motif.
 * keepOut : zones à garder pleines (fixations), en cm depuis le coin haut gauche, y vers le bas.
 * Renvoie { svg, fullPanel } : fullPanel = le SVG couvre tout le panneau (viewBox en cm).
 */
export function generateMotif(spec, { widthCm, heightCm, motifScale = 90, keepOut = [], minBridgeMm = 3 }) {
  const gen = getGenerator(spec.type)
  const params = resolveParams(gen, spec.params, minBridgeMm)
  const key = JSON.stringify([gen.id, spec.seed, params, widthCm, heightCm, gen.layout === 'emblem' ? motifScale : 0, keepOut])
  if (cache.has(key)) return cache.get(key)

  const rng = createRandom(((spec.seed ?? 1) * 2654435761) ^ hashString(gen.id))
  let result
  if (gen.layout === 'panel') {
    const frame = Math.min(FRAME_CM, Math.min(widthCm, heightCm) * 0.1)
    const inner = [frame, frame, widthCm - frame, heightCm - frame]
    const paths = gen.generate({ rng, params, inner, keepOut })
    result = { svg: svgDocument(widthCm, heightCm, paths), fullPanel: true }
  } else {
    const unitMm = (Math.min(widthCm, heightCm) * 10 * (motifScale / 100)) / 200
    const paths = gen.generate({ rng, params, unitMm })
    result = { svg: svgDocument(200, 200, paths), fullPanel: false }
  }
  cache.set(key, result)
  if (cache.size > 60) cache.delete(cache.keys().next().value)
  return result
}
