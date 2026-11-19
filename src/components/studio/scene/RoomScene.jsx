import { RoundedBox } from '@react-three/drei'

// Hauteur du centre du panneau selon la pièce (mètres) : au-dessus du meuble de référence
export const PANEL_CENTER_Y = { salon: 1.55, chambre: 1.5, bureau: 1.6 }

const WALL_COLORS = { salon: '#e9e1d3', chambre: '#dfe3ec', bureau: '#e3ebe2' }
const FLOOR_COLORS = { salon: '#9c7652', chambre: '#b9a58c', bureau: '#8d7a66' }

// Matériau tissu / bois réutilisable
function Fabric({ color }) {
  return <meshStandardMaterial color={color} roughness={0.95} />
}

// Canapé trois places : donne l'échelle d'un panneau de salon
function Sofa() {
  const tissu = '#5f6b73'
  return (
    <group position={[0, 0, 0.5]}>
      <RoundedBox args={[2.1, 0.42, 0.9]} radius={0.05} position={[0, 0.21, 0]} castShadow receiveShadow><Fabric color={tissu} /></RoundedBox>
      <RoundedBox args={[2.1, 0.45, 0.2]} radius={0.06} position={[0, 0.63, -0.35]} castShadow receiveShadow><Fabric color={tissu} /></RoundedBox>
      <RoundedBox args={[0.18, 0.6, 0.9]} radius={0.05} position={[-1.05, 0.3, 0]} castShadow receiveShadow><Fabric color={tissu} /></RoundedBox>
      <RoundedBox args={[0.18, 0.6, 0.9]} radius={0.05} position={[1.05, 0.3, 0]} castShadow receiveShadow><Fabric color={tissu} /></RoundedBox>
      <RoundedBox args={[0.45, 0.4, 0.14]} radius={0.06} position={[-0.6, 0.62, -0.2]} rotation={[0.15, 0, 0.1]} castShadow><Fabric color="#c9a24a" /></RoundedBox>
      <RoundedBox args={[0.45, 0.4, 0.14]} radius={0.06} position={[0.62, 0.62, -0.2]} rotation={[0.15, 0, -0.08]} castShadow><Fabric color="#e8e1d2" /></RoundedBox>
    </group>
  )
}

// Lit double avec tête de lit et chevets
function Bed() {
  return (
    <group>
      <RoundedBox args={[1.75, 1.0, 0.08]} radius={0.03} position={[0, 0.5, 0.04]} castShadow receiveShadow><Fabric color="#8c7b6b" /></RoundedBox>
      <RoundedBox args={[1.6, 0.5, 2.0]} radius={0.05} position={[0, 0.25, 1.08]} castShadow receiveShadow><Fabric color="#f0ece4" /></RoundedBox>
      <RoundedBox args={[1.62, 0.08, 1.3]} radius={0.03} position={[0, 0.52, 1.4]} castShadow receiveShadow><Fabric color="#7f94a8" /></RoundedBox>
      <RoundedBox args={[0.6, 0.16, 0.36]} radius={0.06} position={[-0.42, 0.6, 0.3]} castShadow><Fabric color="#ffffff" /></RoundedBox>
      <RoundedBox args={[0.6, 0.16, 0.36]} radius={0.06} position={[0.42, 0.6, 0.3]} castShadow><Fabric color="#ffffff" /></RoundedBox>
      {[-1.15, 1.15].map(x => (
        <RoundedBox key={x} args={[0.45, 0.5, 0.4]} radius={0.02} position={[x, 0.25, 0.22]} castShadow receiveShadow><Fabric color="#b08c62" /></RoundedBox>
      ))}
    </group>
  )
}

// Bureau avec écran et chaise
function Desk() {
  const bois = '#b08c62'
  return (
    <group position={[0, 0, 0.38]}>
      <RoundedBox args={[1.4, 0.04, 0.7]} radius={0.01} position={[0, 0.74, 0]} castShadow receiveShadow><Fabric color={bois} /></RoundedBox>
      {[[-0.66, -0.3], [0.66, -0.3], [-0.66, 0.3], [0.66, 0.3]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.36, z]} castShadow>
          <boxGeometry args={[0.04, 0.72, 0.04]} />
          <meshStandardMaterial color="#2b2b2b" roughness={0.6} />
        </mesh>
      ))}
      <RoundedBox args={[0.6, 0.36, 0.03]} radius={0.01} position={[0, 1.0, -0.15]} castShadow><meshStandardMaterial color="#1b1b1d" roughness={0.4} /></RoundedBox>
      <RoundedBox args={[0.5, 0.08, 0.5]} radius={0.03} position={[0.1, 0.46, 0.65]} castShadow receiveShadow><Fabric color="#3f4a52" /></RoundedBox>
      <RoundedBox args={[0.5, 0.5, 0.07]} radius={0.03} position={[0.1, 0.75, 0.9]} castShadow receiveShadow><Fabric color="#3f4a52" /></RoundedBox>
    </group>
  )
}

// Pièce simplifiée : mur, plinthe, sol et un meuble de référence pour l'échelle
export default function RoomScene({ ambiance }) {
  return (
    <group>
      <mesh position={[0, 1.6, 0]} receiveShadow>
        <planeGeometry args={[9, 3.2]} />
        <meshStandardMaterial color={WALL_COLORS[ambiance] ?? WALL_COLORS.salon} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.05, 0.008]} receiveShadow>
        <boxGeometry args={[9, 0.1, 0.016]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 3]} receiveShadow>
        <planeGeometry args={[9, 6]} />
        <meshStandardMaterial color={FLOOR_COLORS[ambiance] ?? FLOOR_COLORS.salon} roughness={0.7} />
      </mesh>
      {ambiance === 'chambre' ? <Bed /> : ambiance === 'bureau' ? <Desk /> : <Sofa />}
    </group>
  )
}
