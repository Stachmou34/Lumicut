import { ROOM_SIZE, getRoom } from '../../../lib/rooms'
import { ROOM_FURNITURE } from './RoomFurniture'

const { width: RW, depth: RD } = ROOM_SIZE

// Les surfaces marquées « collider » arrêtent la caméra : elle ne passe ni sous le sol ni à travers un mur
const COLLIDER = { collider: true }

function Surface({ color, roughness = 0.95 }) {
  return <meshStandardMaterial color={color} roughness={roughness} />
}

// Fenêtre sur le mur de gauche : lumineuse le jour, nuit noire le soir
function Window({ isNight }) {
  const w = 1.3
  const h = 1.35
  const frame = '#f6f4ef'
  return (
    <group position={[-RW / 2 + 0.01, 1.45, 2.7]} rotation={[0, Math.PI / 2, 0]}>
      {/* Ciel : surface émettrice (en rendu physique, la lumière du jour entre par la fenêtre) */}
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#000000" emissive={isNight ? '#0d1828' : '#dbeeff'} emissiveIntensity={1} toneMapped={false} />
      </mesh>
      {[
        { p: [0, h / 2, 0.02], s: [w + 0.08, 0.06, 0.05] },
        { p: [0, -h / 2, 0.02], s: [w + 0.08, 0.06, 0.05] },
        { p: [w / 2, 0, 0.02], s: [0.06, h, 0.05] },
        { p: [-w / 2, 0, 0.02], s: [0.06, h, 0.05] },
        { p: [0, 0, 0.02], s: [0.04, h, 0.04] },
      ].map((b, i) => (
        <mesh key={i} position={b.p}>
          <boxGeometry args={b.s} />
          <Surface color={frame} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// Porte d'entrée sur le mur de droite
function Door() {
  return (
    <group position={[RW / 2 - 0.01, 0, 2.9]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh position={[0, 1.025, 0.02]} receiveShadow>
        <boxGeometry args={[0.9, 2.05, 0.04]} />
        <Surface color="#8a6a4c" roughness={0.6} />
      </mesh>
      {[
        { p: [0, 2.08, 0.03], s: [1.04, 0.07, 0.06] },
        { p: [0.485, 1.04, 0.03], s: [0.07, 2.08, 0.06] },
        { p: [-0.485, 1.04, 0.03], s: [0.07, 2.08, 0.06] },
      ].map((b, i) => (
        <mesh key={i} position={b.p}>
          <boxGeometry args={b.s} />
          <Surface color="#f3f0ea" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0.34, 1.0, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.08, 10]} />
        <meshStandardMaterial color="#c9c9c9" metalness={0.9} roughness={0.25} />
      </mesh>
    </group>
  )
}

// Pièce fermée : mur du fond, murs latéraux, sol, plafond, plinthes, ouvertures et mobilier.
// Le côté +z reste ouvert : c'est là que se tient la caméra.
export default function RoomScene({ ambiance, isNight }) {
  const room = getRoom(ambiance)
  const H = room.ceiling
  const Furniture = ROOM_FURNITURE[room.id]
  const baseboard = room.id === 'restaurant' ? '#1f2622' : '#f4f1ea'

  return (
    <group>
      {/* Mur du fond */}
      <mesh position={[0, H / 2, 0]} receiveShadow userData={COLLIDER}>
        <planeGeometry args={[RW, H]} />
        <Surface color={room.wall} />
      </mesh>
      {/* Murs latéraux */}
      <mesh position={[-RW / 2, H / 2, RD / 2]} rotation={[0, Math.PI / 2, 0]} receiveShadow userData={COLLIDER}>
        <planeGeometry args={[RD, H]} />
        <Surface color={room.wall} />
      </mesh>
      <mesh position={[RW / 2, H / 2, RD / 2]} rotation={[0, -Math.PI / 2, 0]} receiveShadow userData={COLLIDER}>
        <planeGeometry args={[RD, H]} />
        <Surface color={room.wall} />
      </mesh>
      {/* Sol */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, RD / 2]} receiveShadow userData={COLLIDER}>
        <planeGeometry args={[RW, RD]} />
        <Surface color={room.floor} roughness={0.7} />
      </mesh>
      {/* Plafond (face tournée vers le bas) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, RD / 2]} receiveShadow userData={COLLIDER}>
        <planeGeometry args={[RW, RD]} />
        <Surface color={room.ceilingColor ?? '#f4f2ee'} />
      </mesh>
      {/* Plinthes */}
      <mesh position={[0, 0.04, 0.008]}>
        <boxGeometry args={[RW, 0.08, 0.016]} />
        <Surface color={baseboard} roughness={0.6} />
      </mesh>
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * (RW / 2 - 0.008), 0.04, RD / 2]}>
          <boxGeometry args={[0.016, 0.08, RD]} />
          <Surface color={baseboard} roughness={0.6} />
        </mesh>
      ))}

      {room.window && <Window isNight={isNight} />}
      {room.door && <Door />}
      {Furniture && <Furniture />}
    </group>
  )
}
