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
// Plus le déport est grand, plus la source est loin du mur et plus le halo s'étale
function WallHalo({ width, height, color, intensity, gap }) {
  // Propriétés (et non args) : la lumière n'est pas recréée à chaque mouvement du curseur d'intensité
  return (
    <rectAreaLight
      color={color}
      intensity={intensity}
      width={width * 0.92}
      height={height * 0.92}
      position={[0, 0, gap * 0.45]}
    />
  )
}

// Panneau découpé au laser et rétroéclairé (la quincaillerie est dans Fixings.jsx).
// Repère local : support (mur ou plafond) en z = 0, face avant tournée vers +z ;
// gap = distance entre le support et le dos du panneau (déport des entretoises).
// halo = false coupe la lumière projetée sur le support (vue éclatée : le panneau est décollé du mur).
export default function LitPanel({ design, materialId, ledColor, lightOn, intensity, isNight, gap = STANDOFF_GAP, halo = true }) {
  const mask = useCutMaskTexture(design)
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
  const glow = useMemo(() => new THREE.Color(led).multiplyScalar(intensity), [led, intensity])

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
          ? <meshBasicMaterial color={glow} toneMapped={false} />
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
        color={led}
        gap={gap}
        intensity={ledOn && halo ? (isNight ? 9 : 3) * intensity : 0}
      />
    </group>
  )
}
