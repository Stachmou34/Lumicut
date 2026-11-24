import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { buildCutMask } from '../../../lib/cutMask'
import { getPanelMaterial, buildWoodGrainCanvas, safeHexColor } from '../../../lib/panelMaterials'
import { panelProfile } from '../../../lib/panelProfile'
import { stripLoop, loopPieces, stripSamples, LOOP_SIDES, NOTCH_WIDTH_MM, NOTCH_DEPTH_MM, STRIP_START_MM } from '../../../lib/stripLayout'
import { gradientAt } from '../../../lib/lighting/colorTemperature'
import { useDamped, useDampedColors } from '../../../lib/useDamped'

// Distance panneau ↔ mur assurée par les entretoises (mètres)
export const STANDOFF_GAP = 0.03
// Nombre de tranches empilées pour donner de l'épaisseur aux découpes vues de biais
const LAYERS = 7
// Couleurs suivies le long du ruban : un dégradé Philips Hue se déroule du départ à la fin du ruban
const SAMPLES = 24
// Définition de la lumière vue à travers les découpes (pixels sur le grand côté)
const GLOW_PX = 64
// Largeur minimale d'une source du halo (m) : un ruban étroit éclaire quand même une bande de mur
const MIN_LIGHT_BAND = 0.025
// Réglage du halo : une source par tronçon de ruban, à sa vraie place dans le creux
const HALO_GAIN = 0.15

// Régénère la texture de découpe quand le design change (motif, texte, dimensions…)
function useCutMaskTexture(design) {
  const [texture, setTexture] = useState(null)
  const latest = useRef(null)
  const invalidate = useThree(s => s.invalidate)
  const key = JSON.stringify(design)

  useEffect(() => {
    let cancelled = false
    const maxPx = window.innerWidth < 768 ? 1024 : 2048
    buildCutMask(design, maxPx)
      .then(canvas => {
        if (cancelled) return
        const tex = new THREE.CanvasTexture(canvas)
        tex.anisotropy = 8
        latest.current?.dispose()
        latest.current = tex
        setTexture(tex)
        invalidate()
      })
      .catch(err => console.error('Masque de découpe :', err))
    return () => { cancelled = true }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  // Libère la texture GPU au démontage
  useEffect(() => () => latest.current?.dispose(), [])
  return texture
}

// Texture de surbrillance du contrôle de fabrication (zones qui tombent ou fragiles)
function useOverlayTexture(url) {
  const [texture, setTexture] = useState(null)
  const latest = useRef(null)
  const invalidate = useThree(s => s.invalidate)

  useEffect(() => {
    let alive = true
    if (!url) {
      latest.current?.dispose()
      latest.current = null
      setTexture(null)
      invalidate()
      return
    }
    new THREE.TextureLoader().load(url, tex => {
      if (!alive) { tex.dispose(); return }
      tex.colorSpace = THREE.SRGBColorSpace
      latest.current?.dispose()
      latest.current = tex
      setTexture(tex)
      invalidate()
    })
    return () => { alive = false }
  }, [url, invalidate])

  useEffect(() => () => latest.current?.dispose(), [])
  return texture
}

// Composante linéaire → sRGB (0-255), pour dessiner les couleurs mélangées dans un canvas
const toSrgb255 = v => Math.round(255 * Math.min(1, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055))

// Lumière vue à travers les découpes : le mur éclairé par le ruban. Chaque point du ruban colore
// surtout le mur près de lui (mélange pondéré par la distance) : un dégradé se retrouve autour du
// panneau, comme sur le ruban ; une seule couleur donne une lumière uniforme.
// Renvoie la texture et une fonction qui la redessine avec les couleurs du moment.
function useGlowTexture(W, H, samples) {
  const size = useMemo(() => (W >= H
    ? { w: GLOW_PX, h: Math.max(8, Math.round((GLOW_PX * H) / W)) }
    : { w: Math.max(8, Math.round((GLOW_PX * W) / H)), h: GLOW_PX }), [W, H])

  const glow = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = size.w
    canvas.height = size.h
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return { canvas, texture, image: canvas.getContext('2d').createImageData(size.w, size.h) }
  }, [size])
  useEffect(() => () => glow.texture.dispose(), [glow])

  // Poids de chaque point du ruban pour chaque pixel : calculés une fois par géométrie
  const weights = useMemo(() => {
    const n = samples.length
    const out = new Float32Array(size.w * size.h * n)
    const soft = (0.2 * Math.min(W, H)) ** 2
    for (let j = 0; j < size.h; j++) {
      for (let i = 0; i < size.w; i++) {
        const x = ((i + 0.5) / size.w - 0.5) * W
        const y = (0.5 - (j + 0.5) / size.h) * H
        const base = (j * size.w + i) * n
        let sum = 0
        for (let k = 0; k < n; k++) {
          const w = 1 / ((x - samples[k].x) ** 2 + (y - samples[k].y) ** 2 + soft)
          out[base + k] = w
          sum += w
        }
        for (let k = 0; k < n; k++) out[base + k] /= sum
      }
    }
    return out
  }, [samples, size, W, H])

  const draw = colors => {
    const { data } = glow.image
    const n = colors.length
    for (let p = 0; p < size.w * size.h; p++) {
      let r = 0, g = 0, b = 0
      for (let k = 0; k < n; k++) {
        const w = weights[p * n + k]
        r += colors[k].r * w
        g += colors[k].g * w
        b += colors[k].b * w
      }
      data[p * 4] = toSrgb255(r)
      data[p * 4 + 1] = toSrgb255(g)
      data[p * 4 + 2] = toSrgb255(b)
      data[p * 4 + 3] = 255
    }
    glow.canvas.getContext('2d').putImageData(glow.image, 0, 0)
    glow.texture.needsUpdate = true
  }

  return { texture: glow.texture, draw, key: `${size.w}x${size.h}|${weights.length}` }
}

// Panneau découpé au laser et rétroéclairé (la quincaillerie est dans Fixings.jsx).
// Profil en U : façade découpée + bords de même épaisseur qui reviennent vers le support (2 cm en tout).
// Le ruban, collé au fond du creux contre le bord, part de l'encoche du câble (milieu du bord du bas)
// et éclaire le mur : c'est lui qui fait le halo et la lumière vue à travers les découpes.
// Repère local : support (mur ou plafond) en z = 0, face avant tournée vers +z ;
// gap = distance entre le support et le dos du U (déport des entretoises).
// halo = false coupe la lumière projetée sur le support (vue éclatée : le panneau est décollé du mur).
// backView : panneau retourné pour montrer son dos (le ruban allumé reste visible dans le creux).
// overlayUrl : surbrillance du contrôle de fabrication, posée sur la face avant.
// ledGradient : couleurs d'un dégradé Philips Hue (sinon null) ; boost : luminosité relative du ruban choisi.
// strip : section du ruban (mm), longueur gardée et tour complet (cm), voir lightingFor.
// Couleurs, allumage et intensité changent en fondu.
export default function LitPanel({
  design, materialId, ledColor, ledGradient = null, boost = 1, lightOn, intensity, isNight,
  gap = STANDOFF_GAP, halo = true, overlayUrl = null, backView = false,
  strip = { widthMm: 15, heightMm: 6, cutCm: 0, runCm: 0 },
}) {
  const mask = useCutMaskTexture(design)
  const overlay = useOverlayTexture(overlayUrl)
  const mat = getPanelMaterial(materialId)
  const led = safeHexColor(ledColor)
  const W = design.width / 100
  const H = design.height / 100
  // Cotes du U (m) : épaisseur totale, façade, bords ; la façade commence au fond du creux
  const profile = panelProfile(materialId)
  const D = profile.depthMm / 1000
  const T = profile.faceMm / 1000
  const R = profile.rimMm / 1000
  const rimDepth = D - T
  const faceBack = gap + rimDepth
  const ledOn = lightOn && intensity > 0

  // Ruban : section, tour suivi contre le bord, longueur collée (même proportion que la coupe réelle)
  const stripW = strip.widthMm / 1000
  const stripH = Math.min(strip.heightMm / 1000, rimDepth - 0.001)
  const loop = useMemo(
    () => stripLoop(W, H, R + stripW / 2, STRIP_START_MM / 1000),
    [W, H, R, stripW]
  )
  const laid = strip.runCm > 0 ? loop.length * Math.min(1, strip.cutCm / strip.runCm) : loop.length
  const pieces = useMemo(() => loopPieces(loop, 0, laid), [loop, laid])
  const samples = useMemo(() => stripSamples(loop, laid, SAMPLES), [loop, laid])
  const zLed = faceBack - stripH // face lumineuse du ruban, tournée vers le mur

  // Couleur de chaque point du ruban : une couleur, ou le dégradé déroulé le long du ruban
  const targets = useMemo(
    () => samples.map(s => (ledGradient ? gradientAt(ledGradient, s.f) : led)),
    [samples, ledGradient, led]
  )
  const colors = useDampedColors(targets, 4)
  const power = useDamped(ledOn ? 1 : 0, 3.2)
  const level = useDamped(intensity, 6)
  const haloOn = useDamped(halo ? 1 : 0, 4)
  // Panneau retourné (dos vers la pièce) : le mur éclairé vu à travers les découpes n'a plus de sens
  const wallGlow = useDamped(backView ? 0 : 1, 6)
  const glowTex = useGlowTexture(W, H, samples)

  // Veinage bois pour le contreplaqué
  const grain = useMemo(() => {
    if (!mat.grain) return null
    const tex = new THREE.CanvasTexture(buildWoodGrainCanvas())
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [mat.grain])
  useEffect(() => () => grain?.dispose(), [grain])

  // Positions des tranches de la façade, de son dos (fond du creux) vers la face avant
  const layers = useMemo(
    () => Array.from({ length: LAYERS }, (_, i) => faceBack + (T * i) / (LAYERS - 1)),
    [T, faceBack]
  )

  // Bords du U : quatre bandes pleines entre le dos du U et la façade ; celle du bas est entaillée
  // au milieu par l'encoche du câble (ouverte côté mur)
  const nw = NOTCH_WIDTH_MM / 1000
  const nd = Math.min(NOTCH_DEPTH_MM / 1000, rimDepth - 0.002)
  const sideBottom = (W - nw) / 2
  const rims = [
    { p: [0, H / 2 - R / 2, 0], s: [W, R, rimDepth] },
    { p: [-(nw + sideBottom) / 2, -H / 2 + R / 2, 0], s: [sideBottom, R, rimDepth] },
    { p: [(nw + sideBottom) / 2, -H / 2 + R / 2, 0], s: [sideBottom, R, rimDepth] },
    { p: [0, -H / 2 + R / 2, nd / 2], s: [nw, R, rimDepth - nd] },
    { p: [W / 2 - R / 2, 0, 0], s: [R, H - 2 * R, rimDepth] },
    { p: [-W / 2 + R / 2, 0, 0], s: [R, H - 2 * R, rimDepth] },
  ]

  // Morceaux droits du ruban, prolongés d'une demi-largeur dans les coins (ruban plié à 90°)
  const stripBoxes = pieces.map((p, j) => {
    const before = j > 0 ? stripW / 2 : 0
    const after = j < pieces.length - 1 ? stripW / 2 : 0
    const dx = (p.to[0] - p.from[0]) / p.length
    const dy = (p.to[1] - p.from[1]) / p.length
    const shift = (after - before) / 2
    return {
      side: p.side,
      center: [(p.from[0] + p.to[0]) / 2 + dx * shift, (p.from[1] + p.to[1]) / 2 + dy * shift],
      length: p.length + before + after,
      angle: Math.atan2(dy, dx),
      horizontal: Math.abs(dx) > Math.abs(dy),
      // Point du ruban (0 → 1) au milieu du morceau : donne sa couleur
      sample: Math.min(SAMPLES - 1, Math.floor(((p.start + p.length / 2) / laid) * SAMPLES)),
    }
  })
  const bySide = Object.fromEntries(stripBoxes.map(b => [b.side, b]))

  // Halo : une source par tronçon, sur la face lumineuse du ruban, tournée vers le mur.
  // Puissance répartie sur la surface des sources (même réglage quel que soit le format)
  const band = Math.max(stripW, MIN_LIGHT_BAND)
  const haloLuminance = ((isNight ? 9 : 3) * boost * HALO_GAIN * (0.85 * W * 0.85 * H)) / Math.max(0.01, laid * band)

  const lights = useRef([])
  const ledMats = useRef([])
  const glowMat = useRef(null)
  const drawn = useRef({ version: -1, key: '' })

  // Applique à chaque image les valeurs en fondu : couleurs, allumage, intensité, halo
  useFrame(() => {
    const p = power.current
    const lv = level.current
    const cols = colors.current.colors
    for (let side = 0; side < LOOP_SIDES; side++) {
      const box = bySide[side]
      const light = lights.current[side]
      if (light) {
        light.intensity = box ? haloLuminance * p * lv * haloOn.current : 0
        if (box) light.color.copy(cols[box.sample])
      }
      const m = ledMats.current[side]
      if (m && box) m.color.copy(cols[box.sample]).multiplyScalar(Math.max(0.08, p * lv))
    }
    const g = glowMat.current
    if (g) {
      g.opacity = p * wallGlow.current
      g.visible = g.opacity > 0.002
      g.color.setScalar(lv)
    }
    // La texture n'est redessinée que si une couleur ou la géométrie a changé
    if (drawn.current.version !== colors.current.version || drawn.current.key !== glowTex.key) {
      glowTex.draw(cols)
      drawn.current = { version: colors.current.version, key: glowTex.key }
    }
  })

  return (
    <group>
      {/* Mur éclairé par le ruban, vu à travers les découpes : apparaît en fondu à l'allumage */}
      <mesh position={[0, 0, gap - 0.005]} renderOrder={1}>
        <planeGeometry args={[W * 0.985, H * 0.985]} />
        <meshBasicMaterial ref={glowMat} map={glowTex.texture} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* Panneau découpé : tranches empilées partageant le même masque (alphaTest = découpe nette) */}
      {mask && layers.map((z, i) => {
        const isFront = i === layers.length - 1
        return (
          <mesh key={i} position={[0, 0, z]} castShadow={isFront} receiveShadow={isFront}>
            <planeGeometry args={[W, H]} />
            <meshStandardMaterial
              key={`${materialId}-${isFront}`}
              color={isFront ? mat.color : mat.edge}
              map={isFront ? grain : null}
              roughness={mat.roughness}
              metalness={mat.metalness}
              alphaMap={mask}
              alphaTest={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}

      {/* Surbrillance des zones à problème (rouge = tombe, orange = fragile, jaune = trop fin) */}
      {overlay && (
        <mesh position={[0, 0, gap + D + 0.0008]} renderOrder={2}>
          <planeGeometry args={[W, H]} />
          <meshBasicMaterial map={overlay} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {/* Bords du U, découpés dans la même plaque : ils cachent le ruban collé au fond du creux */}
      <group position={[0, 0, gap + rimDepth / 2]}>
        {rims.map((e, i) => (
          <mesh key={i} position={e.p} castShadow receiveShadow>
            <boxGeometry args={e.s} />
            <meshStandardMaterial color={mat.color} roughness={mat.roughness} metalness={mat.metalness} />
          </mesh>
        ))}
      </group>

      {/* Chants de la façade (son épaisseur, à l'avant de la tranche du U) */}
      <group position={[0, 0, faceBack + T / 2]}>
        {[
          { p: [0, H / 2, 0], s: [W, 0.001, T] },
          { p: [0, -H / 2, 0], s: [W, 0.001, T] },
          { p: [W / 2, 0, 0], s: [0.001, H, T] },
          { p: [-W / 2, 0, 0], s: [0.001, H, T] },
        ].map((e, i) => (
          <mesh key={i} position={e.p}>
            <boxGeometry args={e.s} />
            <meshStandardMaterial color={mat.edge} roughness={mat.roughness} />
          </mesh>
        ))}
      </group>

      {/* Ruban collé au fond du creux, contre le bord : support blanc, face lumineuse vers le mur */}
      {stripBoxes.map(b => (
        <group key={b.side} position={[b.center[0], b.center[1], 0]} rotation={[0, 0, b.angle]}>
          <mesh position={[0, 0, faceBack - stripH / 2 - 0.0002]}>
            <boxGeometry args={[b.length, stripW, stripH]} />
            <meshStandardMaterial color="#ecebe6" roughness={0.55} />
          </mesh>
          <mesh position={[0, 0, zLed - 0.0004]}>
            <boxGeometry args={[b.length, stripW * 0.62, 0.0006]} />
            <meshBasicMaterial ref={el => { ledMats.current[b.side] = el }} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Halo projeté sur le mur par le ruban : une source par tronçon, à sa place dans le creux.
          Toujours cinq sources (éteintes si le ruban n'atteint pas le tronçon) : pas de recompilation des matériaux */}
      {Array.from({ length: LOOP_SIDES }, (_, side) => {
        const b = bySide[side]
        return (
          <rectAreaLight
            key={side}
            ref={el => { lights.current[side] = el }}
            intensity={0}
            width={b ? (b.horizontal ? b.length : band) : 0.01}
            height={b ? (b.horizontal ? band : b.length) : 0.01}
            position={b ? [b.center[0], b.center[1], zLed - 0.002] : [0, 0, gap]}
          />
        )
      })}
    </group>
  )
}
