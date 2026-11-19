import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { CameraControls, Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { useConfiguratorStore } from '../../../store/configuratorStore'
import { motifs } from '../../../motifs/index'
import { ROOM_SIZE, PLACEMENTS, getRoom } from '../../../lib/rooms'
import LitPanel, { STANDOFF_GAP } from './LitPanel'
import RoomScene from './RoomScene'

// Tables nécessaires aux sources rectangulaires (halo des LED sur le mur ou le plafond)
RectAreaLightUniformsLib.init()

// Cadrages proposés au client (« Face » devient « Dessous » pour un panneau au plafond)
const VIEWS = ['face', 'angle', 'detail', 'room']
const VIEW_LABELS = { face: 'Face', angle: '3/4', detail: 'Détail', room: 'Pièce' }

// Limites de rotation de la caméra selon la pose
const LIMITS = {
  wall:    { azimuth: 0.75, minPolar: Math.PI / 2 - 0.45, maxPolar: Math.PI / 2 + 0.25 },
  ceiling: { azimuth: 1.3,  minPolar: Math.PI / 2 - 0.15, maxPolar: Math.PI - 0.08 },
}

// Calcule la position du panneau (support en z = 0 du repère local) et son centre visible
function computeMount(room, placement) {
  if (placement === 'wall') {
    return {
      position: [0, room.wallCenterY, 0],
      rotation: [0, 0, 0],
      center: [0, room.wallCenterY, STANDOFF_GAP],
    }
  }
  // Plafond ou suspendu : face avant tournée vers le sol
  const drop = placement === 'pendant' ? room.pendantDrop ?? 0.45 : 0
  const [x, z] = room.ceilingAnchor
  const y = room.ceiling - drop
  return {
    position: [x, y, z],
    rotation: [Math.PI / 2, 0, 0],
    center: [x, y - STANDOFF_GAP, z],
  }
}

// Câbles et rosaces d'un panneau suspendu
function PendantCables({ anchor, panelTopY, ceilingY, panelW, panelH }) {
  const [ax, az] = anchor
  const length = ceilingY - panelTopY
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [
    ax + sx * (panelW / 2 - 0.035),
    az + sz * (panelH / 2 - 0.035),
  ])
  return corners.map(([x, z]) => (
    <group key={`${x}${z}`}>
      <mesh position={[x, panelTopY + length / 2, z]}>
        <cylinderGeometry args={[0.0012, 0.0012, length, 6]} />
        <meshStandardMaterial color="#9a9a9a" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[x, ceilingY - 0.006, z]}>
        <cylinderGeometry args={[0.018, 0.018, 0.012, 20]} />
        <meshStandardMaterial color="#d9d9d9" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[x, panelTopY + 0.006, z]}>
        <cylinderGeometry args={[0.006, 0.006, 0.012, 12]} />
        <meshStandardMaterial color="#c9c9c9" metalness={0.9} roughness={0.25} />
      </mesh>
    </group>
  ))
}

// Caméra orbitale bridée + transitions douces vers les cadrages prédéfinis
function CameraRig({ request, placement, center, panelW, panelH }) {
  const ref = useRef()
  const { size, camera } = useThree()
  const limits = placement === 'wall' ? LIMITS.wall : LIMITS.ceiling
  const [cx, cy, cz] = center

  useEffect(() => {
    const c = ref.current
    if (!c) return
    // Recul nécessaire pour cadrer le panneau avec une marge (fov vertical de la caméra)
    const half = Math.tan((camera.fov * Math.PI) / 360)
    const aspect = size.width / Math.max(1, size.height)
    const d = Math.max((panelH * 1.9) / 2 / half, (panelW * 1.5) / 2 / half / aspect, 1.1)
    const maxZ = ROOM_SIZE.depth - 0.25
    const id = request.id

    if (placement === 'wall') {
      if (id === 'face') c.setLookAt(0, cy, Math.min(d, maxZ), 0, cy, cz, true)
      if (id === 'angle') c.setLookAt(d * 0.5, cy + 0.05, Math.min(d * 0.87, maxZ), 0, cy, cz, true)
      if (id === 'detail') c.setLookAt(panelW * 0.15 + 0.1, cy + panelH * 0.12, 0.45, panelW * 0.12, cy + panelH * 0.05, cz, true)
      if (id === 'room') c.setLookAt(1.3, 1.6, Math.min(maxZ, Math.max(5, d * 2.2)), 0, cy - 0.45, 0.4, true)
      return
    }
    // Plafond / suspendu : on regarde vers le haut, sans descendre sous 0,4 m.
    // Caméras basses et proches : vu de loin, un panneau au plafond n'est qu'une tranche.
    const dy = Math.min(d * 0.95, cy - 0.4)
    const dz = Math.sqrt(Math.max(d * d - dy * dy, 0)) + 0.12
    if (id === 'face') c.setLookAt(cx, cy - dy, Math.min(cz + dz, maxZ), cx, cy, cz, true)
    if (id === 'angle') c.setLookAt(cx + 0.9, 1.2, Math.min(cz + 1.6, maxZ), cx, cy, cz, true)
    if (id === 'detail') c.setLookAt(cx + 0.25 + panelW * 0.1, cy - 0.55, cz + 0.35, cx + panelW * 0.12, cy, cz, true)
    if (id === 'room') c.setLookAt(1.4, 1.25, Math.min(maxZ, cz + 3.0), cx * 0.8, Math.max(1.65, cy - 0.85), cz * 0.9, true)
  }, [request, placement, cx, cy, cz, panelW, panelH, size.width, size.height, camera])

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={0.3}
      maxDistance={6}
      minAzimuthAngle={-limits.azimuth}
      maxAzimuthAngle={limits.azimuth}
      minPolarAngle={limits.minPolar}
      maxPolarAngle={limits.maxPolar}
      truckSpeed={0}
      dollyToCursor
    />
  )
}

// Éclairage de la pièce : lumière du jour par la fenêtre, ou pénombre le soir
function Lighting({ isNight }) {
  if (isNight) {
    return (
      <>
        <ambientLight intensity={0.05} color="#8fa3c8" />
        <hemisphereLight args={['#4a5a80', '#1a140e', 0.15]} />
        <pointLight position={[1.8, 2.0, 3.6]} intensity={2.5} distance={9} decay={2} color="#ffd9a8" />
      </>
    )
  }
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#ffffff', '#c8b9a2', 0.6]} />
      {/* Lumière renvoyée par le sol : évite un plafond terne en journée */}
      <directionalLight position={[0.5, -1, 1.5]} intensity={0.9} color="#fff6ea" />
      <directionalLight
        position={[-2.8, 3.4, 3.2]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3.5}
        shadow-camera-bottom={-1}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
      />
    </>
  )
}

// Vue 3D du studio : le panneau configuré, posé dans la pièce choisie
export default function Studio3D() {
  const s = useConfiguratorStore()
  const [request, setRequest] = useState({ id: 'face', n: 0 })
  const glRef = useRef(null)
  const isNight = s.dayNight === 'night'
  const room = getRoom(s.ambiance)
  const placement = s.placement ?? 'wall'
  const mount = computeMount(room, placement)

  // Motif courant : bibliothèque ou SVG importé (Iconify)
  const svg = s.motifId === 'ai-generated' && s.aiMotifSvg
    ? s.aiMotifSvg
    : (motifs.find(m => m.id === s.motifId) ?? motifs[0]).svg

  const design = useMemo(() => ({
    svg,
    width: s.width || 60,
    height: s.height || 30,
    motifScale: s.motifScale,
    motifX: s.motifX,
    motifY: s.motifY,
    motifRotation: s.motifRotation,
    motifMirrorH: s.motifMirrorH,
    motifMirrorV: s.motifMirrorV,
    showText: s.showText,
    textContent: s.textContent,
    textSecondary: s.textSecondary,
    textFont: s.textFont,
    textAlign: s.textAlign,
    textLetterSpacing: s.textLetterSpacing,
    textSize: s.textSize,
    textPosition: s.textPosition,
  }), [svg, s.width, s.height, s.motifScale, s.motifX, s.motifY, s.motifRotation, s.motifMirrorH,
    s.motifMirrorV, s.showText, s.textContent, s.textSecondary, s.textFont, s.textAlign,
    s.textLetterSpacing, s.textSize, s.textPosition])

  const panelW = design.width / 100
  const panelH = design.height / 100

  // Capture PNG de la vue courante (servira aussi de vignette panier / commande)
  const handleSnapshot = () => {
    const canvas = glRef.current?.domElement
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `lumicut-${s.motifId}-${s.width}x${s.height}-${room.id}-${placement}.png`
    a.click()
  }

  const pill = active => `px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active ? 'bg-amber-400 text-black' : 'text-slate-300 hover:text-white'}`

  return (
    <div className="relative w-full h-full bg-slate-950">
      <Canvas
        shadows
        dpr={[1, 2]}
        frameloop="demand"
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ fov: 35, position: [0, 1.5, 3], near: 0.02, far: 40 }}
        onCreated={({ gl }) => { glRef.current = gl }}
      >
        <color attach="background" args={[isNight ? '#05060a' : '#dfe6ee']} />
        <Suspense fallback={null}>
          <Lighting isNight={isNight} />
          {/* Environnement procédural (aucun fichier HDR à télécharger) pour les reflets */}
          <Environment resolution={256} environmentIntensity={isNight ? 0.04 : 0.6}>
            <Lightformer form="rect" intensity={3} position={[-3, 2.5, 3]} scale={[3, 2, 1]} />
            <Lightformer form="rect" intensity={1} position={[3, 1.5, 2]} scale={[2, 2, 1]} />
          </Environment>
          <RoomScene ambiance={room.id} isNight={isNight} />
          <group position={mount.position} rotation={mount.rotation}>
            <LitPanel
              design={design}
              materialId={s.material}
              ledColor={s.ledColor}
              lightOn={s.lightOn}
              intensity={s.ledIntensity}
              isNight={isNight}
              standoffs={placement !== 'pendant'}
            />
          </group>
          {placement === 'pendant' && (
            <PendantCables
              anchor={room.ceilingAnchor}
              panelTopY={mount.position[1] - STANDOFF_GAP}
              ceilingY={room.ceiling}
              panelW={panelW}
              panelH={panelH}
            />
          )}
          <CameraRig request={request} placement={placement} center={mount.center} panelW={panelW} panelH={panelH} />
          <EffectComposer multisampling={4} enableNormalPass={false}>
            {/* La nuit, seuil bas : seules les découpes éclairées et le halo dépassent ce niveau */}
            <Bloom
              mipmapBlur
              luminanceThreshold={isNight ? 0.12 : 0.95}
              luminanceSmoothing={isNight ? 0.08 : 0.2}
              intensity={isNight ? 1.6 : 0.4}
              radius={0.72}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* Emplacement de pose + cadrages */}
      <div className="absolute top-3 left-3 flex flex-wrap gap-2 pr-28">
        <div className="flex gap-1 bg-slate-900/70 backdrop-blur rounded-full p-1 border border-slate-700">
          {PLACEMENTS.map(p => (
            <button key={p.id} onClick={() => s.setPlacement(p.id)} className={pill(placement === p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-slate-900/70 backdrop-blur rounded-full p-1 border border-slate-700">
          {VIEWS.map(id => (
            <button key={id} onClick={() => setRequest({ id, n: Date.now() })} className={pill(request.id === id)}>
              {id === 'face' && placement !== 'wall' ? 'Dessous' : VIEW_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      {/* Capture */}
      <button
        onClick={handleSnapshot}
        className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-900/70 backdrop-blur border border-slate-700 text-slate-300 hover:text-white transition-colors"
      >
        📸 Capture
      </button>

      {/* Intensité lumineuse (simule le variateur) */}
      {s.lightOn && (
        <label className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/70 backdrop-blur rounded-full px-4 py-2 border border-slate-700">
          <span className="text-xs text-slate-400">Intensité</span>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={s.ledIntensity}
            onChange={e => s.setLedIntensity(Number(e.target.value))}
            className="w-32"
          />
        </label>
      )}

      <p className="absolute bottom-3 left-3 text-xs text-slate-400 font-mono tracking-widest bg-slate-900/60 rounded-full px-3 py-1">
        {s.width} × {s.height} cm
      </p>

      <p className="absolute bottom-3 right-3 text-[10px] text-slate-500 hidden md:block">
        Glisser pour tourner · molette pour zoomer
      </p>
    </div>
  )
}
