import { RoundedBox } from '@react-three/drei'

// Mobilier simplifié de chaque pièce, généré en code (aucun modèle 3D à télécharger).
// Sert surtout de repère d'échelle autour du panneau. Coordonnées en mètres, mur du fond en z = 0.

// Les meubles arrêtent la caméra (voir CameraRig) : elle ne passe pas au travers
const COLLIDER = { collider: true }

function Mat({ color, roughness = 0.9, metalness = 0 }) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
}

// Boîte aux arêtes adoucies, avec ombres
function Box({ args, position, rotation, color, radius = 0.02, roughness, metalness }) {
  return (
    <RoundedBox args={args} radius={radius} position={position} rotation={rotation} castShadow receiveShadow userData={COLLIDER}>
      <Mat color={color} roughness={roughness} metalness={metalness} />
    </RoundedBox>
  )
}

function Cyl({ args, position, rotation, color, roughness = 0.6, metalness = 0 }) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow userData={COLLIDER}>
      <cylinderGeometry args={args} />
      <Mat color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  )
}

function Ball({ radius, position, color }) {
  return (
    <mesh position={position} castShadow userData={COLLIDER}>
      <sphereGeometry args={[radius, 20, 16]} />
      <Mat color={color} />
    </mesh>
  )
}

// Tapis rectangulaire ou rond posé au sol
function Rug({ size, position, color, round = false }) {
  return (
    <mesh position={[position[0], 0.006, position[1]]} receiveShadow>
      {round
        ? <cylinderGeometry args={[size[0] / 2, size[0] / 2, 0.012, 48]} />
        : <boxGeometry args={[size[0], 0.012, size[1]]} />}
      <Mat color={color} roughness={1} />
    </mesh>
  )
}

// Quatre pieds fins sous un plateau
function Legs({ x, z, height, y = 0, radius = 0.022, color = '#2b2b2b', centerZ = 0 }) {
  return [[-x, -z], [x, -z], [-x, z], [x, z]].map(([px, pz]) => (
    <Cyl key={`${px}${pz}`} args={[radius, radius, height, 10]} position={[px, y + height / 2, centerZ + pz]} color={color} roughness={0.5} />
  ))
}

function Plant({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <Cyl args={[0.16, 0.12, 0.38, 24]} position={[0, 0.19, 0]} color="#d9cbb4" />
      <Ball radius={0.28} position={[0, 0.62, 0]} color="#4f7a4a" />
      <Ball radius={0.2} position={[0.14, 0.82, 0.05]} color="#5b8a52" />
      <Ball radius={0.17} position={[-0.12, 0.88, -0.04]} color="#46703f" />
    </group>
  )
}

function TableLamp({ position }) {
  return (
    <group position={position}>
      <Cyl args={[0.05, 0.07, 0.04, 16]} position={[0, 0.02, 0]} color="#3b3b3b" />
      <Cyl args={[0.01, 0.01, 0.25, 8]} position={[0, 0.16, 0]} color="#3b3b3b" />
      <Cyl args={[0.09, 0.13, 0.17, 24]} position={[0, 0.33, 0]} color="#f2ebdf" />
    </group>
  )
}

// Chaise ; rotation = 0 : dossier côté +z
function Chair({ position, rotation = 0, color = '#3f4a52', wood = '#6b4f37' }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box args={[0.44, 0.05, 0.44]} position={[0, 0.46, 0]} color={color} radius={0.015} />
      <Box args={[0.44, 0.42, 0.04]} position={[0, 0.7, 0.2]} color={color} radius={0.015} />
      <Legs x={0.19} z={0.19} height={0.44} radius={0.016} color={wood} />
    </group>
  )
}

function Salon() {
  const tissu = '#5f6b73'
  return (
    <group>
      <Rug size={[2.6, 1.8]} position={[0, 1.55]} color="#d8cfc0" />
      <group position={[0, 0, 0.5]}>
        <Box args={[2.1, 0.42, 0.9]} radius={0.05} position={[0, 0.21, 0]} color={tissu} roughness={0.95} />
        <Box args={[2.1, 0.45, 0.2]} radius={0.06} position={[0, 0.63, -0.35]} color={tissu} roughness={0.95} />
        <Box args={[0.18, 0.6, 0.9]} radius={0.05} position={[-1.05, 0.3, 0]} color={tissu} roughness={0.95} />
        <Box args={[0.18, 0.6, 0.9]} radius={0.05} position={[1.05, 0.3, 0]} color={tissu} roughness={0.95} />
        <Box args={[0.45, 0.4, 0.14]} radius={0.06} position={[-0.6, 0.62, -0.2]} rotation={[0.15, 0, 0.1]} color="#c9a24a" />
        <Box args={[0.45, 0.4, 0.14]} radius={0.06} position={[0.62, 0.62, -0.2]} rotation={[0.15, 0, -0.08]} color="#e8e1d2" />
      </group>
      {/* Table basse */}
      <Box args={[1.1, 0.05, 0.6]} position={[0, 0.4, 1.75]} color="#7a5a3c" roughness={0.6} />
      <Legs x={0.48} z={0.24} height={0.375} centerZ={1.75} />
      <Plant position={[-1.8, 0, 0.45]} />
      {/* Lampadaire */}
      <group position={[1.7, 0, 0.45]}>
        <Cyl args={[0.14, 0.16, 0.03, 24]} position={[0, 0.015, 0]} color="#2a2a2a" metalness={0.6} roughness={0.4} />
        <Cyl args={[0.012, 0.012, 1.45, 8]} position={[0, 0.75, 0]} color="#2a2a2a" metalness={0.6} roughness={0.4} />
        <Cyl args={[0.14, 0.2, 0.26, 24]} position={[0, 1.55, 0]} color="#efe7da" />
      </group>
    </group>
  )
}

function Chambre() {
  return (
    <group>
      <Rug size={[2.4, 1.6]} position={[0, 1.6]} color="#cfc6b8" />
      <Box args={[1.75, 1.0, 0.08]} radius={0.03} position={[0, 0.5, 0.04]} color="#8c7b6b" />
      <Box args={[1.6, 0.5, 2.0]} radius={0.05} position={[0, 0.25, 1.08]} color="#f0ece4" />
      <Box args={[1.62, 0.08, 1.3]} radius={0.03} position={[0, 0.52, 1.4]} color="#7f94a8" />
      <Box args={[0.6, 0.16, 0.36]} radius={0.06} position={[-0.42, 0.6, 0.3]} color="#ffffff" />
      <Box args={[0.6, 0.16, 0.36]} radius={0.06} position={[0.42, 0.6, 0.3]} color="#ffffff" />
      {[-1.15, 1.15].map(x => (
        <group key={x}>
          <Box args={[0.45, 0.5, 0.4]} position={[x, 0.25, 0.22]} color="#b08c62" />
          <TableLamp position={[x, 0.5, 0.22]} />
        </group>
      ))}
    </group>
  )
}

function Enfant() {
  const cubes = ['#f28b82', '#fbbc04', '#81c995', '#8ab4f8', '#c58af9', '#f6aea9']
  return (
    <group>
      <Rug round size={[1.6]} position={[0.3, 2.3]} color="#f2c6b4" />
      {/* Lit simple */}
      <Box args={[1.0, 0.8, 0.06]} position={[0, 0.4, 0.03]} color="#f5f1e8" />
      <Box args={[0.95, 0.42, 1.95]} position={[0, 0.21, 1.03]} color="#ffffff" radius={0.04} />
      <Box args={[0.97, 0.07, 1.3]} position={[0, 0.44, 1.3]} color="#f6c453" />
      <Box args={[0.55, 0.14, 0.32]} position={[0, 0.5, 0.25]} color="#ffffff" radius={0.05} />
      {/* Ourson sur l'oreiller */}
      <Ball radius={0.1} position={[0.22, 0.62, 0.42]} color="#b07c4f" />
      <Ball radius={0.07} position={[0.22, 0.76, 0.42]} color="#b07c4f" />
      <Ball radius={0.025} position={[0.17, 0.82, 0.42]} color="#b07c4f" />
      <Ball radius={0.025} position={[0.27, 0.82, 0.42]} color="#b07c4f" />
      {/* Coffre à jouets */}
      <Box args={[0.7, 0.42, 0.42]} position={[1.35, 0.21, 0.3]} color="#7fb5d5" radius={0.03} />
      {/* Étagère à cubes */}
      <Box args={[0.4, 1.1, 0.32]} position={[-1.5, 0.55, 0.18]} color="#efe9df" radius={0.01} />
      {cubes.map((c, i) => (
        <Box key={c} args={[0.12, 0.12, 0.12]} position={[-1.56 + (i % 2) * 0.13, 0.2 + Math.floor(i / 2) * 0.33, 0.3]} color={c} radius={0.015} />
      ))}
    </group>
  )
}

function Bureau() {
  const bois = '#b08c62'
  const livres = ['#8c2f39', '#30475e', '#d9b44a', '#3c6e47', '#e8e1d2', '#5c4b8a', '#c06c3a']
  return (
    <group>
      <group position={[0, 0, 0.38]}>
        <Box args={[1.4, 0.04, 0.7]} radius={0.01} position={[0, 0.74, 0]} color={bois} />
        <Legs x={0.66} z={0.3} height={0.72} radius={0.02} />
        <Box args={[0.6, 0.36, 0.03]} radius={0.01} position={[0, 1.0, -0.15]} color="#1b1b1d" roughness={0.4} />
        <Box args={[0.5, 0.08, 0.5]} radius={0.03} position={[0.1, 0.46, 0.65]} color="#3f4a52" />
        <Box args={[0.5, 0.5, 0.07]} radius={0.03} position={[0.1, 0.75, 0.9]} color="#3f4a52" />
      </group>
      {/* Bibliothèque */}
      <group position={[1.75, 0, 0.18]}>
        <Box args={[0.8, 1.8, 0.32]} position={[0, 0.9, 0]} color="#efe9df" radius={0.01} />
        {[0.35, 0.8, 1.25].map(y => livres.map((c, i) => (
          <Box key={`${y}${c}`} args={[0.05, 0.26 + (i % 3) * 0.03, 0.22]} position={[-0.3 + i * 0.075, y + 0.14, 0.06]} color={c} radius={0.005} />
        )))}
      </group>
      <Plant position={[-1.8, 0, 0.4]} scale={0.9} />
    </group>
  )
}

function Entree() {
  return (
    <group>
      {/* Console */}
      <Box args={[1.1, 0.04, 0.34]} position={[0, 0.8, 0.2]} color="#6b4f37" radius={0.01} roughness={0.6} />
      <Legs x={0.5} z={0.13} height={0.78} radius={0.015} centerZ={0.2} />
      <Cyl args={[0.06, 0.08, 0.26, 20]} position={[-0.35, 0.95, 0.2]} color="#c9b49a" />
      <Box args={[0.24, 0.05, 0.17]} position={[0.3, 0.845, 0.2]} color="#30475e" radius={0.005} />
      <Box args={[0.22, 0.04, 0.15]} position={[0.3, 0.89, 0.2]} color="#d9b44a" radius={0.005} />
      {/* Banc et paillasson près de la porte */}
      <Box args={[1.0, 0.06, 0.36]} position={[1.75, 0.45, 0.6]} rotation={[0, Math.PI / 2, 0]} color="#8a6a4c" radius={0.01} />
      <Box args={[0.36, 0.42, 0.06]} position={[1.75, 0.21, 0.15]} color="#8a6a4c" radius={0.01} />
      <Box args={[0.36, 0.42, 0.06]} position={[1.75, 0.21, 1.05]} color="#8a6a4c" radius={0.01} />
      <Rug size={[0.6, 0.9]} position={[2.2, 2.9]} color="#6d5c4b" />
      {/* Patères */}
      {[0.6, 0.9, 1.2].map(z => (
        <Cyl key={z} args={[0.015, 0.015, 0.1, 10]} position={[-2.55, 1.7, z]} rotation={[0, 0, Math.PI / 2]} color="#2a2a2a" metalness={0.6} roughness={0.4} />
      ))}
      <Plant position={[-1.9, 0, 2.4]} scale={0.8} />
    </group>
  )
}

function SalleAManger() {
  const bois = '#8a6545'
  return (
    <group>
      <Rug size={[2.8, 2.0]} position={[0, 2.3]} color="#d6cdbd" />
      {/* Buffet sous le panneau */}
      <Box args={[1.7, 0.8, 0.45]} position={[0, 0.4, 0.24]} color="#6e5642" />
      <Cyl args={[0.07, 0.05, 0.22, 20]} position={[-0.55, 0.91, 0.24]} color="#e3d9c6" />
      {/* Table et chaises */}
      <Box args={[1.8, 0.05, 0.95]} position={[0, 0.75, 2.3]} color={bois} radius={0.015} roughness={0.55} />
      <Legs x={0.8} z={0.38} height={0.725} radius={0.03} color={bois} centerZ={2.3} />
      {[-0.55, 0, 0.55].map(x => (
        <group key={x}>
          <Chair position={[x, 0, 2.92]} rotation={0} />
          <Chair position={[x, 0, 1.68]} rotation={Math.PI} />
        </group>
      ))}
      <Cyl args={[0.11, 0.07, 0.06, 24]} position={[0, 0.805, 2.3]} color="#c9b49a" />
    </group>
  )
}

function Restaurant() {
  const bouteilles = ['#2f5d3a', '#8a5a1f', '#c9d6d3', '#5b1f2a', '#2f5d3a', '#b07a2a', '#c9d6d3', '#3a2f5d']
  return (
    <group>
      {/* Étagères à bouteilles (sous le panneau) */}
      {[0.5, 0.95].map(y => (
        <group key={y}>
          <Box args={[2.4, 0.04, 0.25]} position={[0, y, 0.13]} color="#3a2a1f" radius={0.01} />
          {bouteilles.map((c, i) => (
            <Cyl key={i} args={[0.035, 0.035, 0.26, 12]} position={[-1.05 + i * 0.3, y + 0.15, 0.13]} color={c} roughness={0.2} />
          ))}
        </group>
      ))}
      {/* Comptoir */}
      <Box args={[2.8, 1.03, 0.6]} position={[0, 0.515, 1.3]} color="#2b2522" />
      <Box args={[2.9, 0.05, 0.7]} position={[0, 1.055, 1.3]} color="#b08d64" radius={0.015} roughness={0.4} />
      {/* Tabourets */}
      {[-0.9, -0.3, 0.3, 0.9].map(x => (
        <group key={x} position={[x, 0, 1.95]}>
          <Cyl args={[0.2, 0.2, 0.02, 24]} position={[0, 0.01, 0]} color="#1f1f1f" metalness={0.7} roughness={0.35} />
          <Cyl args={[0.025, 0.025, 0.72, 10]} position={[0, 0.38, 0]} color="#1f1f1f" metalness={0.7} roughness={0.35} />
          <Cyl args={[0.18, 0.18, 0.06, 24]} position={[0, 0.76, 0]} color="#7a3b2e" />
        </group>
      ))}
    </group>
  )
}

export const ROOM_FURNITURE = {
  salon: Salon,
  chambre: Chambre,
  enfant: Enfant,
  bureau: Bureau,
  entree: Entree,
  'salle-a-manger': SalleAManger,
  restaurant: Restaurant,
}
