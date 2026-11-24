import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { getFixing, computeFixingPoints } from '../../../lib/fixings'

// Quincaillerie de pose modélisée pièce par pièce, dans le repère du panneau :
// support (mur ou plafond) en z = 0, face avant du panneau vers +z.

// Écartement de chaque pièce en vue éclatée (m), du support vers l'avant :
// cheville → vis → entretoise → panneau → capuchon
export const EXPLODE = { dowel: 0.045, screw: 0.085, barrel: 0.12, panel: 0.15, cap: 0.2 }

// Décale ses enfants le long de z selon une valeur animée 0 → 1 (vue éclatée)
export function ExplodeOffset({ value, distance, children }) {
  const ref = useRef()
  useFrame(() => {
    if (ref.current) ref.current.position.z = value.current * distance
  })
  return <group ref={ref}>{children}</group>
}

function Finish({ fixing }) {
  return <meshStandardMaterial color={fixing.finish} metalness={fixing.metalness} roughness={fixing.roughness} />
}

function Steel() {
  return <meshStandardMaterial color="#8d8f93" metalness={0.9} roughness={0.35} />
}

// Cylindre orienté selon z (l'axe de toutes les fixations)
function Rod({ radius, radiusTop, length, z, children, segments = 24 }) {
  return (
    <mesh position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[radiusTop ?? radius, radius, length, segments]} />
      {children}
    </mesh>
  )
}

// Cheville + vis murale : cachées dans le support, visibles en vue éclatée
function WallAnchor({ explode }) {
  return (
    <>
      <ExplodeOffset value={explode} distance={EXPLODE.dowel}>
        <Rod radius={0.004} length={0.04} z={-0.02} segments={12}>
          <meshStandardMaterial color="#9aa0a6" roughness={0.85} />
        </Rod>
      </ExplodeOffset>
      <ExplodeOffset value={explode} distance={EXPLODE.screw}>
        <Rod radius={0.0024} length={0.05} z={-0.012} segments={10}><Steel /></Rod>
        <Rod radius={0.0045} length={0.003} z={0.0135} segments={16}><Steel /></Rod>
      </ExplodeOffset>
    </>
  )
}

// Entretoise : corps fixé au support, qui traverse le creux du U jusqu'à la façade ;
// capuchon vissé à travers le trou de la façade
function Standoff({ x, y, fixing, gap, thickness, hollow, explode }) {
  const reach = gap + hollow
  const face = thickness - hollow
  return (
    <group position={[x, y, 0]}>
      <WallAnchor explode={explode} />
      <ExplodeOffset value={explode} distance={EXPLODE.barrel}>
        <Rod radius={0.0095} length={reach} z={reach / 2}><Finish fixing={fixing} /></Rod>
      </ExplodeOffset>
      <ExplodeOffset value={explode} distance={EXPLODE.cap}>
        {/* Capuchon légèrement bombé, posé sur la face avant */}
        <Rod radius={0.0095} radiusTop={0.0082} length={0.008} z={gap + thickness + 0.004}><Finish fixing={fixing} /></Rod>
        {/* Tige filetée : traverse le trou Ø 10 de la façade et se visse dans l'entretoise */}
        <Rod radius={0.003} length={face + 0.014} z={reach + face / 2 - 0.004} segments={12}><Steel /></Rod>
      </ExplodeOffset>
    </group>
  )
}

// Fixation invisible : platine collée au dos de la façade, dans le creux ; aucun perçage en façade
function HiddenMount({ x, y, fixing, gap, hollow, explode }) {
  const reach = gap + hollow
  return (
    <group position={[x, y, 0]}>
      <WallAnchor explode={explode} />
      <ExplodeOffset value={explode} distance={EXPLODE.barrel}>
        <Rod radius={0.008} length={reach - 0.003} z={(reach - 0.003) / 2}><Finish fixing={fixing} /></Rod>
      </ExplodeOffset>
      <ExplodeOffset value={explode} distance={EXPLODE.panel}>
        <mesh position={[0, 0, reach - 0.0015]} castShadow>
          <boxGeometry args={[0.04, 0.04, 0.003]} />
          <Finish fixing={fixing} />
        </mesh>
      </ExplodeOffset>
    </group>
  )
}

// Suspension : serre-câble au dos de la façade, dans le creux ; écrou de blocage en façade
function CableGrip({ x, y, fixing, gap, thickness, hollow }) {
  return (
    <group position={[x, y, 0]}>
      <Rod radius={0.004} length={0.014} z={gap + hollow - 0.007} segments={16}><Finish fixing={fixing} /></Rod>
      <Rod radius={0.003} radiusTop={0.0025} length={0.004} z={gap + thickness + 0.002} segments={16}><Finish fixing={fixing} /></Rod>
    </group>
  )
}

// Toutes les fixations du panneau, aux points calculés par lib/fixings.js.
// thickness : épaisseur totale du U ; hollow : profondeur du creux, que traversent entretoises et câbles
export default function Fixings({ widthCm, heightCm, mountingId, gap, thickness, hollow = 0, explode }) {
  const fixing = getFixing(mountingId)
  const points = useMemo(() => computeFixingPoints(widthCm, heightCm), [widthCm, heightCm])
  return points.map(p => {
    const key = `${p.x}${p.y}`
    const props = { x: p.x / 100, y: p.y / 100, fixing, gap, thickness, hollow, explode }
    if (fixing.kind === 'cable') return <CableGrip key={key} {...props} />
    if (fixing.kind === 'hidden') return <HiddenMount key={key} {...props} />
    return <Standoff key={key} {...props} />
  })
}

// Câbles de suspension et rosaces, en coordonnées de la pièce (le plafond est au-dessus).
// panelBackY : hauteur du dos de la façade, au fond du creux, où les serre-câbles sont fixés
export function SuspensionCables({ anchor, panelBackY, ceilingY, widthCm, heightCm, mountingId }) {
  const fixing = getFixing(mountingId)
  const points = useMemo(() => computeFixingPoints(widthCm, heightCm), [widthCm, heightCm])
  const bottom = panelBackY + 0.014 // haut du serre-câble
  const length = ceilingY - bottom
  return points.map(p => {
    const x = anchor[0] + p.x / 100
    const z = anchor[1] + p.y / 100
    return (
      <group key={`${p.x}${p.y}`}>
        <mesh position={[x, bottom + length / 2, z]}>
          <cylinderGeometry args={[0.0008, 0.0008, length, 6]} />
          <meshStandardMaterial color="#9a9a9a" metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh position={[x, ceilingY - 0.006, z]}>
          <cylinderGeometry args={[0.018, 0.018, 0.012, 24]} />
          <Finish fixing={fixing} />
        </mesh>
      </group>
    )
  })
}

// Câble d'alimentation apparent : sort derrière le panneau et descend le long du mur jusqu'à une prise
export function PowerCable({ panelW, panelH, gap, centerY }) {
  const x0 = panelW / 2 - 0.1
  const socketY = 0.32 - centerY
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x0, -panelH / 2 + 0.06, gap * 0.5),
      new THREE.Vector3(x0, -panelH / 2 - 0.03, 0.006),
      new THREE.Vector3(x0 + 0.01, socketY + 0.14, 0.005),
      new THREE.Vector3(x0 + 0.07, socketY + 0.05, 0.006),
      new THREE.Vector3(x0 + 0.09, socketY + 0.005, 0.02),
    ], false, 'centripetal')
    return new THREE.TubeGeometry(curve, 96, 0.0025, 8, false)
  }, [x0, panelH, gap, socketY])
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color="#f2f2f0" roughness={0.6} />
      </mesh>
      <mesh position={[x0 + 0.09, socketY, 0.006]} receiveShadow>
        <boxGeometry args={[0.08, 0.08, 0.012]} />
        <meshStandardMaterial color="#f7f7f5" roughness={0.5} />
      </mesh>
      <mesh position={[x0 + 0.09, socketY, 0.026]} castShadow>
        <boxGeometry args={[0.036, 0.036, 0.03]} />
        <meshStandardMaterial color="#f2f2f0" roughness={0.5} />
      </mesh>
    </group>
  )
}
