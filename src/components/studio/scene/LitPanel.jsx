import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { buildCutMask } from '../../../lib/cutMask'
import { getPanelMaterial, buildWoodGrainCanvas, safeHexColor } from '../../../lib/panelMaterials'

// Distance panneau ↔ mur assurée par les entretoises (mètres)
export const STANDOFF_GAP = 0.03
// Nombre de tranches empilées pour donner de l'épaisseur aux découpes vues de biais
const LAYERS = 7

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

// Halo sur le mur : une source rectangulaire placée derrière le panneau, tournée vers le mur
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

// Plus le déport est grand, plus la source est loin du mur et plus le halo s'étale.
// colors : une couleur, ou les couleurs d'un dégradé Philips Hue (une source par couleur, côte à côte).
function WallHalo({ width, height, colors, intensity, gap }) {
  const n = colors.length
  const w = (width * 0.92) / n
  // Propriétés (et non args) : la lumière n'est pas recréée à chaque mouvement du curseur d'intensité
  return colors.map((c, i) => (
    <rectAreaLight
      key={i}
      color={c}
      intensity={intensity}
      width={w}
      height={height * 0.92}
      position={[-width * 0.46 + w * (i + 0.5), 0, gap * 0.45]}
    />
  ))
}

// Texture du diffuseur pour un dégradé : les couleurs de gauche à droite
function useGradientTexture(colors) {
  const key = colors?.join() ?? ''
  const texture = useMemo(() => {
    if (!colors) return null
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    const g = ctx.createLinearGradient(0, 0, 256, 0)
    colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 1)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => texture?.dispose(), [texture])
  return texture
}

// Panneau découpé au laser et rétroéclairé (la quincaillerie est dans Fixings.jsx).
// Repère local : support (mur ou plafond) en z = 0, face avant tournée vers +z ;
// gap = distance entre le support et le dos du panneau (déport des entretoises).
// halo = false coupe la lumière projetée sur le support (vue éclatée : le panneau est décollé du mur).
// overlayUrl : surbrillance du contrôle de fabrication, posée sur la face avant.
// ledGradient : couleurs d'un dégradé Philips Hue (sinon null) ; boost : luminosité relative du ruban choisi
export default function LitPanel({ design, materialId, ledColor, ledGradient = null, boost = 1, lightOn, intensity, isNight, gap = STANDOFF_GAP, halo = true, overlayUrl = null }) {
  const mask = useCutMaskTexture(design)
  const gradientMap = useGradientTexture(ledGradient)
  const overlay = useOverlayTexture(overlayUrl)
  const mat = getPanelMaterial(materialId)
  const led = safeHexColor(ledColor)
  const W = design.width / 100
  const H = design.height / 100
  const T = mat.thickness
  const ledOn = lightOn && intensity > 0

  // Veinage bois pour le contreplaqué
  const grain = useMemo(() => {
    if (!mat.grain) return null
    const tex = new THREE.CanvasTexture(buildWoodGrainCanvas())
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [mat.grain])
  useEffect(() => () => grain?.dispose(), [grain])

  // Couleur du diffuseur allumé : on ne dépasse jamais 1 sur un canal pour conserver
  // la teinte exacte de la LED choisie (un bleu saturé virerait au cyan) ;
  // l'effet lumineux vient du bloom, réglé avec un seuil bas la nuit
  const glow = useMemo(
    () => (gradientMap ? new THREE.Color(1, 1, 1) : new THREE.Color(led)).multiplyScalar(intensity),
    [led, intensity, gradientMap]
  )

  // Positions des tranches, du dos (côté mur) vers la face avant
  const layers = useMemo(
    () => Array.from({ length: LAYERS }, (_, i) => gap + (T * i) / (LAYERS - 1)),
    [T, gap]
  )

  return (
    <group>
      {/* Diffuseur opale derrière le panneau : c'est lui qu'on voit briller à travers les découpes */}
      <mesh position={[0, 0, gap - 0.005]}>
        <planeGeometry args={[W * 0.985, H * 0.985]} />
        {ledOn
          ? <meshBasicMaterial key={gradientMap ? 'gradient' : 'flat'} color={glow} map={gradientMap} toneMapped={false} />
          : <meshStandardMaterial color="#d9d9d4" roughness={0.9} />}
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
        <mesh position={[0, 0, gap + T + 0.0008]} renderOrder={2}>
          <planeGeometry args={[W, H]} />
          <meshBasicMaterial map={overlay} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {/* Chants extérieurs (épaisseur visible sur les bords) */}
      <group position={[0, 0, gap + T / 2]}>
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

      {/* Halo projeté sur le mur par les LED */}
      <WallHalo
        width={W}
        height={H}
        colors={ledGradient ?? [led]}
        gap={gap}
        intensity={ledOn && halo ? (isNight ? 9 : 3) * intensity * boost : 0}
      />
    </group>
  )
}
