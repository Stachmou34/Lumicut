import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraControls, Environment, Lightformer } from '@react-three/drei'
import { useConfiguratorStore } from '../../../store/configuratorStore'
import { ROOM_SIZE, PLACEMENTS, getRoom } from '../../../lib/rooms'
import { getFixing, computeFixingPoints } from '../../../lib/fixings'
import { panelProfile } from '../../../lib/panelProfile'
import { designFromState } from '../../../lib/panelDesign'
import { textAnchor } from '../../../lib/panelLayout'
import { useDamped } from '../../../lib/useDamped'
import LitPanel from './LitPanel'
import { lightingFor, stripSection } from '../../../lib/lighting/lightingCatalog'
import { lumensPerMeter } from '../../../lib/lightPhysics'
import PhysicalRender from './PhysicalRender'
import StudioEffects from './StudioEffects'
import RoomScene from './RoomScene'
import Fixings, { ExplodeOffset, EXPLODE, SuspensionCables, PowerCable } from './Fixings'
import PanelEditor3D from './PanelEditor3D'
import { getStep } from '../../../lib/studioSteps'

// Cadrages au choix du client (« Face » devient « Dessous » pour un panneau au plafond)
const VIEWS = ['face', 'angle', 'detail', 'room']
const SHOT_LABELS = {
  face: 'Face', angle: '3/4', detail: 'Détail', room: 'Pièce',
  text: 'Texte', edge: 'Matière', halo: 'Lumière', fixing: 'Fixation', back: 'Dos',
}

// Caméra « garage » : chaque section du studio amène la caméra sur la zone travaillée

// Limites de rotation de la caméra selon la pose (angle polaire : 0 = au-dessus du point visé, π = dessous).
// Au plafond, la caméra reste toujours sous le panneau : au-dessus, elle serait dans le plafond.
// Suspendu, elle peut monter un peu au-dessus du panneau pour voir les câbles, jusqu'au plafond.
const LIMITS = {
  wall:    { azimuth: 1.45, minPolar: Math.PI / 2 - 0.5,  maxPolar: Math.PI / 2 + 0.3 },
  ceiling: { azimuth: 1.6, minPolar: Math.PI / 2 + 0.12, maxPolar: Math.PI - 0.08 },
  pendant: { azimuth: 1.6, minPolar: Math.PI / 2 - 0.25, maxPolar: Math.PI - 0.08 },
}

// Espace entre support et dos du panneau : déport des entretoises, ou place du serre-câble
function computeGap(mountingId, depthMm) {
  return getFixing(mountingId).kind === 'cable' ? 0.012 : depthMm / 1000
}

// Position du repère du panneau (support en z = 0) et centre visible de sa face avant
function computeMount(room, placement, gap) {
  if (placement === 'wall') {
    return { position: [0, room.wallCenterY, 0], rotation: [0, 0, 0], center: [0, room.wallCenterY, gap] }
  }
  // Plafond ou suspendu : face avant tournée vers le sol
  const drop = placement === 'pendant' ? room.pendantDrop ?? 0.45 : 0
  const [x, z] = room.ceilingAnchor
  const y = room.ceiling - drop
  return { position: [x, y, z], rotation: [Math.PI / 2, 0, 0], center: [x, y - gap, z] }
}

// Passe un point du repère du panneau au repère de la pièce
function toWorld(mount, local) {
  const v = new THREE.Vector3(...local).applyEuler(new THREE.Euler(...mount.rotation))
  return [v.x + mount.position[0], v.y + mount.position[1], v.z + mount.position[2]]
}

// Marges de la caméra dans la pièce (m) : murs et côté ouvert, sol
const CAMERA_MARGIN = 0.1
const FLOOR_MARGIN = 0.3

// Garde la caméra dans la pièce, au-dessus du sol et sous le plafond
function clampToRoom([x, y, z], ceiling) {
  return [
    THREE.MathUtils.clamp(x, -ROOM_SIZE.width / 2 + 0.1, ROOM_SIZE.width / 2 - 0.1),
    THREE.MathUtils.clamp(y, 0.3, ceiling - 0.05),
    THREE.MathUtils.clamp(z, 0.08, ROOM_SIZE.depth - 0.2),
  ]
}

// Plans rapprochés exprimés dans le repère du panneau (x droite, y haut, z vers l'avant)
function localShot(id, { W, H, gap, thickness, d, design, exploded, ceiling, fixingPoint }) {
  const front = gap + thickness
  if (id === 'text') {
    const side = Math.min(W, H)
    const u = side / 200
    const anchor = textAnchor(design)
    const ty = (100 - anchor.y) * u
    const tx = (anchor.x - 100) * u * 0.6
    const dist = Math.max(0.32, side * 1.05)
    return { cam: [tx, ty + (ceiling ? dist * 0.3 : 0.02), dist], target: [tx, ty, front] }
  }
  if (id === 'edge') {
    return { cam: [W / 2 + 0.09, H / 2 + 0.07, front + 0.17], target: [W / 2 - 0.05, H / 2 - 0.04, front - thickness / 2] }
  }
  if (id === 'halo') {
    return { cam: [W * 0.55 + 0.2, H * 0.15 + (ceiling ? 0.3 : 0), d * 0.95], target: [0, 0, gap] }
  }
  if (id === 'back') {
    // Panneau retourné à BACK_OFFSET du mur : vu de trois quarts, un peu au-dessus, pour lire le U
    const tz = gap + thickness / 2 + BACK_OFFSET
    return { cam: [W * 0.45 + 0.16, H * 0.4 + 0.1 + (ceiling ? 0.25 : 0), tz + d * 0.82], target: [0, -H * 0.05, tz] }
  }
  if (id === 'fixing') {
    const [px, py] = fixingPoint
    // Vue éclatée : de profil, l'axe de montage s'étale de gauche à droite.
    // Sinon : vue rasante depuis le bord, qui montre le capuchon et l'entretoise dans le vide derrière le panneau.
    return exploded
      ? { cam: [px + 0.32, py + 0.08, 0.2], target: [px - 0.02, py, 0.12] }
      : { cam: [px + 0.16, py + 0.035, front + 0.05], target: [px, py, gap * 0.5] }
  }
  return null
}

// Caméra orbitale bridée + transitions douces vers les cadrages prédéfinis ou les plans de travail
function CameraRig({ request, placement, mount, room, panelW, panelH, gap, thickness, design, exploded, mountingId }) {
  const ref = useRef()
  const { size, camera, scene } = useThree()
  const limits = LIMITS[placement] ?? LIMITS.wall
  const [cx, cy, cz] = mount.center

  // La caméra reste dans la pièce : elle s'arrête devant le sol, les murs, le plafond et les meubles
  // (surfaces marquées « collider »), et ne sort jamais du volume intérieur, côté ouvert compris.
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const colliders = []
    scene.traverse(o => { if (o.isMesh && o.userData.collider) colliders.push(o) })
    c.colliderMeshes = colliders
    c.setBoundary(new THREE.Box3(
      new THREE.Vector3(-ROOM_SIZE.width / 2 + CAMERA_MARGIN, FLOOR_MARGIN, 0.012),
      new THREE.Vector3(ROOM_SIZE.width / 2 - CAMERA_MARGIN, room.ceiling - 0.03, ROOM_SIZE.depth - CAMERA_MARGIN),
    ))
    c.boundaryEnclosesCamera = true
  }, [scene, room.id, room.ceiling, placement])

  // Tests automatisés (développement uniquement) : accès à la caméra et à ses contrôles
  useEffect(() => {
    if (import.meta.env.DEV) window.__lumicutCamera = { camera, controls: ref.current }
  }, [camera])

  useEffect(() => {
    const c = ref.current
    if (!c) return
    // Recul nécessaire pour cadrer le panneau avec une marge (fov vertical de la caméra)
    const half = Math.tan((camera.fov * Math.PI) / 360)
    const aspect = size.width / Math.max(1, size.height)
    const d = Math.max((panelH * 1.9) / 2 / half, (panelW * 1.5) / 2 / half / aspect, 1.1)
    const maxZ = ROOM_SIZE.depth - 0.25
    const ceiling = placement !== 'wall'
    let id = request.id
    if (id === 'text' && !(design.showText && design.textContent)) id = 'face'

    // Plans de travail : calculés dans le repère du panneau, valables pour toutes les poses
    const points = computeFixingPoints(design.width, design.height)
    const topRight = points.reduce((a, b) => (b.x + b.y > a.x + a.y ? b : a))
    const shot = localShot(id, {
      W: panelW, H: panelH, gap, thickness, d, design, exploded, ceiling,
      fixingPoint: [topRight.x / 100, topRight.y / 100],
    })
    if (shot) {
      const [px, py, pz] = clampToRoom(toWorld(mount, shot.cam), room.ceiling)
      const [tx, ty, tz] = toWorld(mount, shot.target)
      c.setLookAt(px, py, pz, tx, ty, tz, true)
      return
    }

    if (!ceiling) {
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
  }, [request, placement, cx, cy, cz, panelW, panelH, gap, thickness, exploded, mountingId,
    design.showText, design.textContent, design.textPosition, design.textAlign, design.width, design.height,
    room.ceiling, size.width, size.height, camera]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <CameraControls
      ref={ref}
      makeDefault
      smoothTime={0.55}
      minDistance={0.12}
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
        {/* Lumière de la lampe renvoyée par le sol et les murs : le rendu physique la calcule,
            le rendu temps réel l'ajoute ici (même niveau mesuré sur le mur du fond) */}
        <ambientLight intensity={0.075} color="#ffcf9e" />
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

// Dos du panneau : il se décolle du mur, pivote d'un demi-tour autour de son axe vertical et s'arrête
// à BACK_OFFSET du mur, creux en U tourné vers la pièce (ruban, encoche). value : 0 (au mur) → 1 (retourné).
// reach : écart ajouté pendant la rotation pour que les bords ne passent jamais dans le mur.
const BACK_OFFSET = 0.16
function FlipToBack({ value, pivot, reach, children }) {
  const outer = useRef()
  useFrame(() => {
    const f = value.current
    if (!outer.current) return
    outer.current.position.z = pivot + BACK_OFFSET * f + reach * Math.sin(Math.PI * f)
    outer.current.rotation.y = Math.PI * f
  })
  return (
    <group ref={outer} position={[0, 0, pivot]}>
      <group position={[0, 0, -pivot]}>{children}</group>
    </group>
  )
}

// Panneau + quincaillerie + câbles, avec les animations de vue éclatée et de dos du panneau
function PanelAssembly({ s, design, mount, room, placement, gap, thickness, hollow, backView }) {
  const explodedOn = s.exploded && placement !== 'pendant'
  const explode = useDamped(explodedOn ? 1 : 0, 4)
  const flip = useDamped(backView ? 1 : 0, 2.6)
  // Panneau décollé du mur (même pendant le retour) : capuchons, câble et édition masqués
  const [away, setAway] = useState(false)
  const awayRef = useRef(false)
  useFrame(() => {
    const a = flip.current > 0.01
    if (a !== awayRef.current) {
      awayRef.current = a
      setAway(a)
    }
  })
  // Ruban choisi : section, longueur gardée et tour complet du creux (même calcul que le prix)
  const lighting = lightingFor(s)
  const section = stripSection(s.lightModel)
  const strip = { widthMm: section.widthMm, heightMm: section.heightMm, cutCm: lighting.cutCm, runCm: lighting.runCm }
  // Support éclairé par le ruban : le mur, ou le plafond (panneau suspendu : plus haut, de la hauteur de suspension)
  const [support, setSupport] = useState(null)
  const supportOffset = placement === 'pendant' ? room.pendantDrop ?? 0.45 : 0
  const supportColor = placement === 'wall' ? room.wall : room.ceilingColor ?? '#f4f2ee'
  return (
    <>
      <group ref={setSupport} position={mount.position} rotation={mount.rotation}>
        <ExplodeOffset value={explode} distance={EXPLODE.panel}>
          <FlipToBack value={flip} pivot={gap + thickness / 2} reach={design.width / 200 + 0.05}>
          <LitPanel
            design={design}
            materialId={s.material}
            ledColor={s.ledColor}
            ledGradient={s.ledMode === 'gradient' && s.lightModel !== 'standard' ? s.ledGradient : null}
            strip={strip}
            lumensPerMeter={lumensPerMeter(lighting)}
            lightOn={s.lightOn}
            intensity={s.ledIntensity}
            gap={gap}
            halo={!explodedOn && !backView}
            overlayUrl={s.showCutCheck ? s.cutCheck?.overlayUrl : null}
            support={support}
            supportOffset={supportOffset}
            supportColor={supportColor}
          />
          </FlipToBack>
        </ExplodeOffset>
        {/* Édition directe à la souris (désactivée en vue éclatée et quand le panneau est retourné) */}
        {!explodedOn && !away && <PanelEditor3D design={design} gap={gap} thickness={thickness} />}
        <Fixings
          widthCm={design.width}
          heightCm={design.height}
          mountingId={s.mounting}
          gap={gap}
          thickness={thickness}
          hollow={hollow}
          explode={explode}
          capsHidden={away}
        />
        {placement === 'wall' && s.powerCable === 'apparent' && !away && (
          <PowerCable
            panelH={design.height / 100}
            gap={gap}
            hollow={hollow}
            rim={thickness - hollow}
            stripW={section.widthMm / 1000}
            centerY={mount.position[1]}
          />
        )}
      </group>
      {placement === 'pendant' && (
        <SuspensionCables
          anchor={room.ceilingAnchor}
          panelBackY={mount.position[1] - gap - hollow}
          ceilingY={room.ceiling}
          widthCm={design.width}
          heightCm={design.height}
          mountingId={s.mounting}
        />
      )}
    </>
  )
}

// État du calcul de la lumière physique, pour le bouton de la vue 3D
function physicalStatus(progress, active) {
  if (progress?.failed) return 'indisponible ici'
  if (!active) return 'en pause'
  if (!progress || progress.compiling) return 'préparation…'
  if (progress.samples >= progress.max) return 'net'
  return `${Math.round((progress.samples / progress.max) * 100)} %`
}

// Vue 3D du studio : le panneau configuré, posé dans la pièce choisie.
// focus = étape ouverte dans le studio (la caméra prend son cadrage si le mode auto est actif) ;
// focusTick change à chaque changement d'étape, même vers l'étape ouverte, pour recadrer.
export default function Studio3D({ focus, focusTick = 0 }) {
  const s = useConfiguratorStore()
  const [request, setRequest] = useState({ id: getStep(focus).shot, n: 0 })
  const [autoCamera, setAutoCamera] = useState(true)
  const glRef = useRef(null)
  const isNight = s.dayNight === 'night'
  const room = getRoom(s.ambiance)
  const placement = s.placement ?? 'wall'
  const gap = computeGap(s.mounting, s.standoffDepth)
  // Épaisseur totale du panneau en U, et profondeur du creux que traversent les entretoises (m)
  const profile = panelProfile(s.material)
  const thickness = profile.depthMm / 1000
  const hollow = profile.hollowMm / 1000
  const mount = computeMount(room, placement, gap)
  // Dos du panneau (étape Éclairage, panneau au mur) : le panneau se retourne pour montrer le creux en U,
  // le ruban collé contre le bord et l'encoche du câble
  const [backView, setBackView] = useState(false)
  const backPlayed = useRef(false)
  const canShowBack = focus === 'led' && placement === 'wall' && !s.exploded
  // Éclairage atelier : sur le plan fixation et sur le dos du panneau, la nuit, on éclaire comme en
  // journée pour que la quincaillerie et le U restent lisibles au lieu de disparaître dans le noir
  const workshop = isNight && (request.id === 'fixing' || request.id === 'back')
  const nightLook = isNight && !workshop

  // Lumière physique (tracé de chemins) : par défaut sur ordinateur quand la carte graphique prépare le calcul
  // en tâche de fond (sinon la page se figerait quelques secondes), au choix ailleurs.
  // physicalChoice : choix du client (null tant qu'il n'a pas touché au bouton)
  const [physicalChoice, setPhysicalChoice] = useState(null)
  const [physicalAuto, setPhysicalAuto] = useState(false)
  const physical = physicalChoice ?? physicalAuto
  const [ptProgress, setPtProgress] = useState(null)
  const composerRef = useRef(null)
  // Coupée pendant l'édition à la souris et quand la surbrillance du contrôle est affichée (repères du rendu temps réel)
  const ptActive = physical && !s.showCutCheck && !s.selectedElement

  const design = useMemo(() => designFromState(s), [ // eslint-disable-line react-hooks/exhaustive-deps
    s.motifId, s.aiMotifSvg, s.librarySvg, s.libraryForme, s.libraryStyles, s.cutStyle, s.cutStyleParams, s.editGesture, s.generator, s.width, s.height, s.motifScale, s.motifX, s.motifY, s.motifRotation,
    s.motifMirrorH, s.motifMirrorV, s.showText, s.textContent, s.textSecondary, s.textFont, s.textAlign,
    s.textLetterSpacing, s.textSize, s.textPosition, s.textX, s.textY, s.textRotation, s.mounting, s.material,
  ])

  // La caméra suit l'étape ouverte, et la vue éclatée se regarde de près
  useEffect(() => {
    if (autoCamera && focus) setRequest({ id: getStep(focus).shot, n: Date.now() })
  }, [focus, focusTick, autoCamera])
  // Sélection d'un élément à la souris : la caméra se place de face pour l'éditer
  useEffect(() => {
    if (!autoCamera || !s.selectedElement) return
    setRequest(r => {
      const target = s.selectedElement === 'text' ? 'text' : 'face'
      return r.id === target ? r : { id: target, n: Date.now() }
    })
  }, [s.selectedElement, autoCamera])
  useEffect(() => {
    if (s.exploded) setRequest({ id: 'fixing', n: Date.now() })
  }, [s.exploded])

  // Première ouverture de l'étape Éclairage : le panneau se retourne (dos, ruban qui s'allume),
  // puis revient au mur, où le halo apparaît. Ensuite, le bouton « Voir le dos » le refait.
  useEffect(() => {
    if (!canShowBack) {
      setBackView(false)
      return undefined
    }
    if (backPlayed.current) return undefined
    backPlayed.current = true
    const start = setTimeout(() => setBackView(true), 700)
    const end = setTimeout(() => setBackView(false), 5200)
    return () => { clearTimeout(start); clearTimeout(end) }
  }, [canShowBack])
  // La caméra suit : dos du panneau, puis plan de l'étape au retour
  const firstBack = useRef(true)
  useEffect(() => {
    if (firstBack.current) { firstBack.current = false; return }
    if (backView) setRequest({ id: 'back', n: Date.now() })
    // Retour au mur : plan de l'étape, sauf si un autre cadrage a été choisi entre-temps
    else setRequest(r => (r.id === 'back' ? { id: getStep(focus).shot, n: Date.now() } : r))
  }, [backView]) // eslint-disable-line react-hooks/exhaustive-deps

  // Capture PNG de la vue courante (servira aussi de vignette panier / commande)
  const handleSnapshot = () => {
    const canvas = glRef.current?.domElement
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `lumicut-${s.motifId}-${s.width}x${s.height}-${room.id}-${placement}.png`
    a.click()
  }

  const pill = active => `px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active ? 'bg-amber-400 text-black' : 'text-slate-300 hover:text-white'}`

  return (
    <div className="relative w-full h-full bg-slate-950">
      <Canvas
        shadows
        dpr={[1, 2]}
        frameloop="demand"
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ fov: 35, position: [0, 1.5, 3], near: 0.01, far: 40 }}
        onCreated={({ gl }) => {
          glRef.current = gl
          setPhysicalAuto(
            window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches &&
            gl.extensions.has('KHR_parallel_shader_compile') &&
            gl.extensions.has('EXT_color_buffer_float')
          )
        }}
        onPointerMissed={() => s.setSelectedElement(null)}
      >
        <color attach="background" args={[isNight ? '#05060a' : '#dfe6ee']} />
        <Suspense fallback={null}>
          <Lighting isNight={isNight} />
          {/* Environnement procédural (aucun fichier HDR à télécharger) pour les reflets */}
          <Environment resolution={256} environmentIntensity={nightLook ? 0.04 : 0.6}>
            <Lightformer form="rect" intensity={3} position={[-3, 2.5, 3]} scale={[3, 2, 1]} />
            <Lightformer form="rect" intensity={1} position={[3, 1.5, 2]} scale={[2, 2, 1]} />
          </Environment>
          <RoomScene ambiance={room.id} isNight={isNight} />
          <PanelAssembly
            s={s}
            design={design}
            mount={mount}
            room={room}
            placement={placement}
            gap={gap}
            thickness={thickness}
            hollow={hollow}
            backView={backView && canShowBack}
          />
          <CameraRig
            request={request}
            placement={placement}
            mount={mount}
            room={room}
            panelW={design.width / 100}
            panelH={design.height / 100}
            gap={gap}
            thickness={thickness}
            design={design}
            exploded={s.exploded && placement !== 'pendant'}
            mountingId={s.mounting}
          />
          {physical && (
            <PhysicalRender
              composer={composerRef}
              paused={!ptActive}
              version={JSON.stringify([
                design, s.material, s.ledColor, s.ledGradient, s.ledMode, s.lightModel, s.lightOn, s.ledIntensity,
                s.dayNight, workshop, s.ambiance, placement, s.mounting, s.standoffDepth, s.powerCable, s.exploded, backView,
              ])}
              onProgress={setPtProgress}
            />
          )}
          <StudioEffects ref={composerRef} night={nightLook} />
        </Suspense>
      </Canvas>

      {/* Emplacement de pose + cadrages */}
      <div className="absolute top-3 left-3 flex flex-wrap gap-2 pr-3 sm:pr-28">
        {/* Sur mobile, l'emplacement se choisit à l'étape Pose : on garde la place pour la vue */}
        <div className="hidden md:flex gap-1 bg-slate-900/70 backdrop-blur rounded-full p-1 border border-slate-700">
          {PLACEMENTS.map(p => (
            <button key={p.id} onClick={() => s.setPlacement(p.id)} className={pill(placement === p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-slate-900/70 backdrop-blur rounded-full p-1 border border-slate-700">
          {VIEWS.map(id => (
            <button key={id} onClick={() => { setBackView(false); setRequest({ id, n: Date.now() }) }} className={pill(request.id === id)}>
              {id === 'face' && placement !== 'wall' ? 'Dessous' : SHOT_LABELS[id]}
            </button>
          ))}
        </div>
        {/* Caméra automatique : suit l'étape ouverte dans le panneau d'étape */}
        <button
          onClick={() => setAutoCamera(v => !v)}
          title="La caméra se place sur la zone que vous modifiez"
          className={`px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur transition-colors ${autoCamera ? 'bg-amber-400/15 border-amber-400/40 text-amber-300' : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:text-white'}`}
        >
          🎥<span className="hidden sm:inline"> Auto{autoCamera && !VIEWS.includes(request.id) ? ` · ${SHOT_LABELS[request.id]}` : ''}</span>
        </button>
        {/* Étape Éclairage : retourner le panneau pour voir le creux en U et le ruban */}
        {canShowBack && (
          <button
            onClick={() => setBackView(v => !v)}
            aria-pressed={backView}
            aria-label={backView ? 'Remettre le panneau au mur' : 'Voir le dos du panneau'}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur transition-colors ${backView ? 'bg-amber-400 text-black border-amber-400' : 'bg-slate-900/70 border-slate-700 text-slate-200 hover:text-white'}`}
          >
            {backView
              ? <>↩ <span className="sm:hidden">Au mur</span><span className="hidden sm:inline">Remettre au mur</span></>
              : <>🔄 <span className="sm:hidden">Dos</span><span className="hidden sm:inline">Voir le dos</span></>}
          </button>
        )}
      </div>

      {/* Dos du panneau : ce que l'on regarde */}
      <div className="absolute inset-x-0 bottom-16 hidden sm:flex justify-center px-3 pointer-events-none">
        <AnimatePresence>
          {backView && canShowBack && (
            <motion.p
              key="dos"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3 }}
              className="max-w-md text-center text-xs sm:text-sm text-slate-100 bg-slate-900/80 backdrop-blur rounded-2xl px-4 py-2 border border-slate-700"
            >
              Dos du panneau : creux en U de 2 cm, ruban collé contre le bord, câble par l’encoche
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {workshop && (
        <p className="hidden sm:block absolute top-14 left-3 text-[11px] text-amber-200 bg-slate-900/70 backdrop-blur rounded-full px-3 py-1 border border-slate-700">
          💡 Éclairage atelier pour voir {request.id === 'back' ? 'le dos du panneau' : 'la fixation'}
        </p>
      )}

      {/* Capture (ordinateur et tablette : sur mobile, l'aperçu est trop petit pour tous les boutons) */}
      <button
        onClick={handleSnapshot}
        className="hidden sm:block absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-900/70 backdrop-blur border border-slate-700 text-slate-300 hover:text-white transition-colors"
      >
        📸 Capture
      </button>

      {/* Intensité lumineuse (simule le variateur), masquée sur mobile pour laisser voir le panneau */}
      {s.lightOn && (
        <label className="absolute bottom-3 left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-3 bg-slate-900/70 backdrop-blur rounded-full px-4 py-2 border border-slate-700">
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

      <p className="hidden sm:block absolute bottom-3 left-3 text-xs text-slate-400 font-mono tracking-widest bg-slate-900/60 rounded-full px-3 py-1">
        {s.width} × {s.height} cm
      </p>

      {/* Contrôle de fabrication : un clic affiche les zones à problème sur le panneau */}
      {s.cutCheck?.status && s.cutCheck.status !== 'error' && (
        <button
          onClick={() => s.cutCheck.status !== 'ok' && s.setShowCutCheck(!s.showCutCheck)}
          className={`absolute bottom-3 sm:bottom-12 left-3 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur transition-opacity ${s.cutCheck.pending ? 'opacity-60' : ''} ${
            s.cutCheck.status === 'ok'
              ? 'bg-emerald-900/60 border-emerald-600/50 text-emerald-200 cursor-default'
              : s.cutCheck.status === 'bad'
                ? 'bg-red-900/70 border-red-500/60 text-red-100'
                : 'bg-amber-900/70 border-amber-500/60 text-amber-100'
          }`}
        >
          {s.cutCheck.status === 'ok'
            ? '✓ Découpe vérifiée'
            : s.cutCheck.status === 'bad'
              ? `⚠ ${s.cutCheck.islands.length} morceau${s.cutCheck.islands.length > 1 ? 'x' : ''} tombe${s.cutCheck.islands.length > 1 ? 'nt' : ''}${s.showCutCheck ? '' : ' · voir'}`
              : s.cutCheck.stripBand
                ? `⚠ Bande du ruban${s.showCutCheck ? '' : ' · voir'}`
                : `⚠ Découpe fragile${s.showCutCheck ? '' : ' · voir'}`}
        </button>
      )}

      {/* Lumière physique : interrupteur et avancement du calcul */}
      <button
        onClick={() => { setPhysicalChoice(!physical); setPtProgress(null) }}
        aria-pressed={physical}
        title="Calcul réaliste de la lumière (ruban dans le U, rebonds sur le mur, ombres douces) quand la vue est immobile"
        className={`absolute right-3 bottom-16 sm:bottom-auto sm:top-12 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur transition-colors ${physical ? 'bg-amber-400/15 border-amber-400/40 text-amber-200' : 'bg-slate-900/70 border-slate-700 text-slate-300 hover:text-white'}`}
      >
        ✨ Lumière réelle{physical ? ` · ${physicalStatus(ptProgress, ptActive)}` : ''}
      </button>

      <p className="absolute bottom-3 right-3 text-[10px] text-slate-500 hidden md:block">
        Glisser pour tourner · molette pour zoomer
      </p>
    </div>
  )
}
