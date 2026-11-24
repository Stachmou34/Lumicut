import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { buildCutMask } from '../../../lib/cutMask'
import { getPanelMaterial, buildWoodGrainCanvas, safeHexColor } from '../../../lib/panelMaterials'
import { panelProfile } from '../../../lib/panelProfile'
import { stripLoop, loopPieces, stripSamples, LOOP_SIDES, NOTCH_WIDTH_MM, NOTCH_DEPTH_MM, STRIP_START_MM } from '../../../lib/stripLayout'
import { gradientAt } from '../../../lib/lighting/colorTemperature'
import { useDamped, useDampedColors } from '../../../lib/useDamped'
import { stripLuminance, EMITTING_SHARE, FALLBACK_LUMENS_PER_M } from '../../../lib/lightPhysics'
import { albedoOf, bounceShare, pieceRects } from '../../../lib/haloLight'
import { createSupportGlowMaterial, GLOW_COLORS } from './supportGlowMaterial'

// Distance panneau ↔ mur assurée par les entretoises (mètres)
export const STANDOFF_GAP = 0.03
// Nombre de tranches empilées pour donner de l'épaisseur aux découpes vues de biais
const LAYERS = 7
// Couleurs suivies le long du ruban : un dégradé Philips Hue se déroule du départ à la fin du ruban
const SAMPLES = GLOW_COLORS
// Marge autour du panneau couverte par la lumière calculée sur le support (m), au-delà du halo direct
const GLOW_MARGIN = 0.15

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

// Panneau découpé au laser et rétroéclairé (la quincaillerie est dans Fixings.jsx).
// Profil en U : façade découpée + bords de même épaisseur qui reviennent vers le support (2 cm en tout).
// Le ruban, collé au fond du creux contre le bord, part de l'encoche du câble (milieu du bord du bas)
// et éclaire le mur : c'est lui qui fait le halo et la lumière vue à travers les découpes.
// Repère local : support (mur ou plafond) en z = 0, face avant tournée vers +z ;
// gap = distance entre le support et le dos du U (déport des entretoises).
// halo = false coupe la lumière projetée sur le support (vue éclatée, dos du panneau : il est décollé du mur).
// overlayUrl : surbrillance du contrôle de fabrication, posée sur la face avant.
// ledGradient : couleurs d'un dégradé Philips Hue (sinon null).
// strip : section du ruban (mm), longueur gardée et tour complet (cm), voir lightingFor ;
// lumensPerMeter : flux du ruban (lumens par mètre), qui fixe sa luminance réelle.
// support : objet 3D du support (repère où il est en z = -supportOffset), où la lumière du ruban est
// dessinée sans suivre le panneau quand il se décolle ; supportColor : couleur du support.
// Couleurs, allumage et intensité changent en fondu.
// Rendu temps réel : la lumière du ruban sur le support est calculée point par point (supportGlowMaterial).
// Rendu physique : les sources du ruban (invisibles en temps réel, userData.ptOnly) portent dans
// userData.pt leur vraie taille (largeur des LED) et leur luminance réelle ; les éléments marqués
// userData.rasterOnly (lumière calculée sur le support, surbrillance du contrôle) n'existent que pour
// le rendu temps réel.
export default function LitPanel({
  design, materialId, ledColor, ledGradient = null, lightOn, intensity,
  gap = STANDOFF_GAP, halo = true, overlayUrl = null,
  strip = { widthMm: 15, heightMm: 6, cutCm: 0, runCm: 0 }, lumensPerMeter = FALLBACK_LUMENS_PER_M,
  support = null, supportOffset = 0, supportColor = '#e9e1d3',
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
  // Lumière sur le support : s'éteint quand le panneau s'en décolle (vue éclatée, dos du panneau)
  const haloOn = useDamped(halo ? 1 : 0, 4)
  const glowMaterial = useMemo(() => createSupportGlowMaterial(), [])
  useEffect(() => () => glowMaterial.dispose(), [glowMaterial])
  const glowMesh = useRef(null)

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

  // Lumière du ruban : surface émettrice réelle (les LED, sur 60 % de la largeur du ruban) et luminance
  // réelle, tirée du flux annoncé (mêmes valeurs pour le rendu temps réel et le rendu physique)
  const emitW = stripW * EMITTING_SHARE
  const luminance = stripLuminance(lumensPerMeter, stripW)

  // Lumière calculée sur le support (temps réel) : hauteurs mesurées depuis le support (panneau
  // suspendu : le plafond est supportOffset plus loin), rectangles lumineux des morceaux de ruban,
  // et bandes du dos du panneau qui renvoient la lumière (rebond, selon les couleurs du support et du panneau)
  const hLed = zLed + supportOffset
  const hBack = faceBack + supportOffset
  const bandW = Math.max(0.005, Math.min(2 * hBack, Math.min(W, H) / 2 - R - stripW))
  const glowRects = stripBoxes.map(b => pieceRects(b, { emitW, halfW: W / 2, halfH: H / 2, rim: R, band: bandW }))
  const supportLinear = useMemo(() => new THREE.Color(supportColor), [supportColor])
  // Dos du panneau : couleur de la matière, plus le reflet de l'acrylique brillant (environ 4 %)
  const backAlbedo = Math.min(0.95, albedoOf(mat.color) + (mat.roughness < 0.5 ? 0.04 : 0))
  const bounceLuminance = (bounceShare(albedoOf(supportColor), backAlbedo) * luminance * emitW) / bandW
  const glowMargin = GLOW_MARGIN + 2 * supportOffset

  // Rendu physique : une source par couleur suivie le long du ruban (un dégradé reste un dégradé),
  // coupée aux coins
  const ptPieces = useMemo(() => {
    const list = []
    for (let k = 0; k < SAMPLES; k++) {
      for (const piece of loopPieces(loop, (k * laid) / SAMPLES, ((k + 1) * laid) / SAMPLES)) {
        const horizontal = Math.abs(piece.to[0] - piece.from[0]) > Math.abs(piece.to[1] - piece.from[1])
        list.push({
          center: [(piece.from[0] + piece.to[0]) / 2, (piece.from[1] + piece.to[1]) / 2],
          width: horizontal ? piece.length : emitW,
          height: horizontal ? emitW : piece.length,
          sample: k,
        })
      }
    }
    return list
  }, [loop, laid, emitW])

  const lights = useRef([])
  const ledMats = useRef([])

  // Applique à chaque image les valeurs en fondu : couleurs, allumage, intensité, halo
  useFrame(() => {
    const p = power.current
    const lv = level.current
    const cols = colors.current.colors
    // Sources du rendu physique : le ruban éclaire toujours (même panneau décollé ou retourné)
    ptPieces.forEach((piece, i) => {
      const light = lights.current[i]
      if (!light) return
      light.color.copy(cols[piece.sample])
      light.userData.ptOnly = true
      light.userData.pt = { width: piece.width, height: piece.height, intensity: luminance * p * lv }
    })
    for (let side = 0; side < LOOP_SIDES; side++) {
      const box = bySide[side]
      const m = ledMats.current[side]
      if (m && box) m.color.copy(cols[box.sample]).multiplyScalar(Math.max(0.08, p * lv))
    }

    // Lumière calculée sur le support, et ombre du panneau (tant qu'il est posé)
    const k = p * lv * haloOn.current
    const u = glowMaterial.uniforms
    u.uL.value = luminance * k
    u.uLb.value = bounceLuminance * k
    u.uShade.value = haloOn.current
    u.uDepth.value = gap + D + supportOffset
    u.uMargin.value = glowMargin
    const mesh = glowMesh.current
    if (mesh) mesh.visible = k > 0.001 || haloOn.current > 0.001
    u.uHalf.value.set(W / 2, H / 2)
    u.uRim.value = R
    u.uGap.value = gap + supportOffset
    u.uH.value = hLed
    u.uHb.value = hBack
    u.uAlbedo.value.copy(supportLinear)
    u.uCount.value = pieces.length
    pieces.forEach((piece, i) => {
      const r = glowRects[i]
      u.uEmit.value[i].set(r.emit.x0, r.emit.x1, r.emit.y0, r.emit.y1)
      u.uBand.value[i].set(r.bounce.x0, r.bounce.x1, r.bounce.y0, r.bounce.y1)
      u.uSeg.value[i].set(piece.from[0], piece.from[1], piece.to[0], piece.to[1])
      u.uSegF.value[i].set(piece.start / laid, (piece.start + piece.length) / laid)
    })
    for (let i = 0; i < SAMPLES; i++) u.uColors.value[i].copy(cols[i])
  })

  return (
    <group>
      {/* Support éclairé par le ruban (halo autour du panneau, lumière vue à travers les découpes) :
          dessiné dans le repère du support, il ne suit pas le panneau quand celui-ci se décolle */}
      {support && createPortal(
        <mesh ref={glowMesh} position={[0, 0, 0.0005 - supportOffset]} renderOrder={1} material={glowMaterial} userData={{ rasterOnly: true }}>
          <planeGeometry args={[W + 2 * glowMargin, H + 2 * glowMargin]} />
        </mesh>,
        support
      )}

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
        <mesh position={[0, 0, gap + D + 0.0008]} renderOrder={2} userData={{ rasterOnly: true }}>
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

      {/* Sources du rendu physique : la face lumineuse du ruban, tournée vers le mur, à sa place dans le
          creux. Invisibles pour le rendu temps réel (qui calcule la lumière sur le support lui-même) */}
      {ptPieces.map((piece, i) => (
        <rectAreaLight
          key={i}
          ref={el => { lights.current[i] = el }}
          visible={false}
          intensity={0}
          width={piece.width}
          height={piece.height}
          position={[piece.center[0], piece.center[1], zLed - 0.001]}
        />
      ))}
    </group>
  )
}
