// Simulation de la lumière dans le creux : sans réflexion, elle retrouve la formule exacte de la lumière
// directe (haloLight) ; le bilan d'énergie est complet ; un dos clair éclaire davantage le centre
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { simulateCavity, meanIrradiance, SURFACES, fresnel } from '../src/lib/cavitySim.js'
import { supportIrradiance } from '../src/lib/haloLight.js'

const PANEL = { width: 0.6, height: 0.3, face: 0.004, gap: 0.03, stripW: 0.0145, stripH: 0.006 }
const NONE = { diffuse: 0, index: 0, mirror: 0 }

test('reflet de l’acrylique : environ 4 % de face, total en lumière rasante', () => {
  assert.ok(Math.abs(fresnel(1, 1.49) - 0.0387) < 0.001)
  assert.ok(fresnel(0.05, 1.49) > 0.6)
})

test('sans aucune réflexion, la simulation retrouve la lumière directe exacte', () => {
  const res = simulateCavity(PANEL, { back: NONE, rimEdge: NONE, outside: NONE, strip: NONE, wall: 0, photons: 600000, seed: 3 })
  const g = res.geometry
  const geo = { halfW: g.hw, halfH: g.hh, rim: g.R, gap: g.gap }
  const emitters = g.emitters.map(r => ({ ...r, h: g.zLed, L: 1 }))
  const analytic = r => {
    let s = 0
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      s += supportIrradiance(r.x0 + ((i + 0.5) * (r.x1 - r.x0)) / 8, r.y0 + ((j + 0.5) * (r.y1 - r.y0)) / 8, geo, emitters)
    }
    return s / 64
  }
  const cy = g.hh - g.R - PANEL.stripW / 2
  for (const r of [
    { x0: -0.1, x1: 0.1, y0: cy - 0.0025, y1: cy + 0.0025 }, // sous le ruban
    { x0: -0.1, x1: 0.1, y0: g.hh + 0.005, y1: g.hh + 0.01 }, // halo, à 0,5-1 cm du bord
  ]) {
    const mc = meanIrradiance(res, r, 'direct')
    const an = analytic(r)
    assert.ok(Math.abs(mc / an - 1) < 0.04, `${mc} ≠ ${an}`)
  }
  // Tout le flux est compté : sur le mur ou arrêté par les bords du U
  const s = res.share
  assert.ok(Math.abs(s.absorbedWall + s.absorbedBack + s.absorbedOther + s.absorbedStrip + s.room + s.motif - 1) < 1e-9)
})

test('un dos blanc éclaire bien davantage le mur derrière le centre du motif qu’un dos noir', () => {
  const centre = back => meanIrradiance(
    simulateCavity(PANEL, { back, wall: 0.8, open: 0.1, photons: 300000, seed: 5 }),
    { x0: -0.03, x1: 0.03, y0: -0.03, y1: 0.03 },
  )
  const black = centre(SURFACES.blackAcrylic)
  const white = centre(SURFACES.whitePaint)
  assert.ok(white > 4 * black, `blanc ${white} / noir ${black}`)
})
