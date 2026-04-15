import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

function PieceShape({ piece, index }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape()
    const poly = piece.polygon
    if (!poly || poly.length < 2) return s
    s.moveTo(poly[0][0], poly[0][1])
    for (let i = 1; i < poly.length; i++) s.lineTo(poly[i][0], poly[i][1])
    s.closePath()
    for (const hole of (piece.holes || [])) {
      const h = new THREE.Path()
      h.moveTo(hole[0][0], hole[0][1])
      for (let i = 1; i < hole.length; i++) h.lineTo(hole[i][0], hole[i][1])
      h.closePath()
      s.holes.push(h)
    }
    return s
  }, [piece])

  // Position each piece in a simple "exploded" layout
  const cols = 3
  const col = index % cols
  const row = Math.floor(index / cols)
  const S = 0.005  // scale mm → units
  const xs = piece.polygon.map(([x]) => x)
  const ys = piece.polygon.map(([, y]) => y)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2

  const shapeGeom = useMemo(() => new THREE.ShapeGeometry(shape), [shape])
  const edgeGeom = useMemo(() => new THREE.EdgesGeometry(shapeGeom), [shapeGeom])

  return (
    <group position={[col * 1.5 - 1.5, -row * 1.2, 0]} scale={[S, S, S]}>
      <mesh rotation={[0, 0, 0]} position={[-cx, -cy, 0]}>
        <primitive object={shapeGeom} attach="geometry" />
        <meshStandardMaterial color={piece.color} side={THREE.DoubleSide} transparent opacity={0.9} />
      </mesh>
      <lineSegments position={[-cx, -cy, 0.01]}>
        <primitive object={edgeGeom} attach="geometry" />
        <lineBasicMaterial color={piece.color} />
      </lineSegments>
    </group>
  )
}

function AssembledBox({ params }) {
  const { width, depth, height } = params
  const S = 0.005
  const W = (width || 150) * S
  const D = (depth || 100) * S
  const H = (height || 60) * S

  const faces = [
    { pos: [0, 0, 0],      rot: [-Math.PI/2,0,0], w: W, h: D, color: '#3b82f6' },
    { pos: [0, H/2, D/2],  rot: [0,0,0],          w: W, h: H, color: '#ec4899' },
    { pos: [0, H/2, -D/2], rot: [0,Math.PI,0],    w: W, h: H, color: '#f97316' },
    { pos: [-W/2, H/2, 0], rot: [0,Math.PI/2,0],  w: D, h: H, color: '#10b981' },
    { pos: [W/2, H/2, 0],  rot: [0,-Math.PI/2,0], w: D, h: H, color: '#8b5cf6' },
  ]

  return (
    <group>
      {faces.map((f, i) => (
        <mesh key={i} position={f.pos} rotation={f.rot}>
          <planeGeometry args={[f.w, f.h]} />
          <meshStandardMaterial color={f.color} side={THREE.DoubleSide} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  )
}

export default function Viewer3D({ pieces, params }) {
  return (
    <Canvas
      camera={{ position: [1.5, 1.2, 1.5], fov: 45 }}
      style={{ background: '#0f172a', width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <AssembledBox params={params} />
      <OrbitControls makeDefault />
    </Canvas>
  )
}
