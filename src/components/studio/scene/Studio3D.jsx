import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { CameraControls, Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { useConfiguratorStore } from '../../../store/configuratorStore'
import { motifs } from '../../../motifs/index'
import LitPanel, { STANDOFF_GAP } from './LitPanel'
import RoomScene, { PANEL_CENTER_Y } from './RoomScene'

// Tables nécessaires aux sources rectangulaires (halo des LED sur le mur)
RectAreaLightUniformsLib.init()

// Cadrages proposés au client
const VIEWS = [
  { id: 'face',   label: 'Face' },
  { id: 'angle',  label: '3/4' },
  { id: 'detail', label: 'Détail' },
  { id: 'room',   label: 'Pièce' },
]

// Caméra orbitale bridée + transitions douces vers les cadrages prédéfinis
function CameraRig({ request, panelW, panelH, centerY }) {
  const ref = useRef()
  const { size, camera } = useThree()

  useEffect(() => {
    const c = ref.current
    if (!c) return
    // Recul nécessaire pour cadrer le panneau avec une marge (fov vertical de la caméra)
    const half = Math.tan((camera.fov * Math.PI) / 360)
    const aspect = size.width / Math.max(1, size.height)
    const d = Math.max((panelH * 1.9) / 2 / half, (panelW * 1.5) / 2 / half / aspect, 1.1)
    const z = STANDOFF_GAP
    if (request.id === 'face') c.setLookAt(0, centerY, d, 0, centerY, z, true)
    if (request.id === 'angle') c.setLookAt(d * 0.5, centerY + 0.05, d * 0.87, 0, centerY, z, true)
    if (request.id === 'detail') c.setLookAt(panelW * 0.15 + 0.1, centerY + panelH * 0.12, 0.45, panelW * 0.12, centerY + panelH * 0.05, z, true)
    if (request.id === 'room') c.setLookAt(1.3, 1.6, Math.max(5, d * 2.2), 0, 1.05, 0.4, true)
  }, [request, panelW, panelH, centerY, size.width, size.height, camera])

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={0.3}
      maxDistance={6}
      minAzimuthAngle={-0.75}
      maxAzimuthAngle={0.75}
      minPolarAngle={Math.PI / 2 - 0.45}
      maxPolarAngle={Math.PI / 2 + 0.25}
      truckSpeed={0}
      dollyToCursor
    />
  )
}

// Éclairage de la pièce : lumière du jour par une fenêtre, ou pénombre le soir
function Lighting({ isNight }) {
  if (isNight) {
    return (
      <>
        <ambientLight intensity={0.05} color="#8fa3c8" />
        <hemisphereLight args={['#4a5a80', '#1a140e', 0.15]} />
        <pointLight position={[2.6, 2.3, 3.2]} intensity={2.5} distance={9} decay={2} color="#ffd9a8" />
      </>
    )
  }
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#ffffff', '#c8b9a2', 0.6]} />
      <directionalLight
        position={[-2.8, 3.4, 3.2]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-2.5}
        shadow-camera-right={2.5}
        shadow-camera-top={3}
        shadow-camera-bottom={-0.5}
        shadow-camera-near={0.5}
        shadow-camera-far={10}
      />
    </>
  )
}

// Vue 3D du studio : le panneau configuré, accroché au mur d'une pièce
export default function Studio3D() {
  const s = useConfiguratorStore()
  const [request, setRequest] = useState({ id: 'face', n: 0 })
  const glRef = useRef(null)
  const isNight = s.dayNight === 'night'
  const centerY = PANEL_CENTER_Y[s.ambiance] ?? PANEL_CENTER_Y.salon

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

  // Capture PNG de la vue courante (servira aussi de vignette panier / commande)
  const handleSnapshot = () => {
    const canvas = glRef.current?.domElement
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `lumicut-${s.motifId}-${s.width}x${s.height}.png`
    a.click()
  }

  return (
    <div className="relative w-full h-full bg-slate-950">
      <Canvas
        shadows
        dpr={[1, 2]}
        frameloop="demand"
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ fov: 35, position: [0, centerY, 3], near: 0.02, far: 40 }}
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
          <RoomScene ambiance={s.ambiance} />
          <LitPanel
            design={design}
            materialId={s.material}
            ledColor={s.ledColor}
            lightOn={s.lightOn}
            intensity={s.ledIntensity}
            isNight={isNight}
            centerY={centerY}
          />
          <CameraRig request={request} panelW={design.width / 100} panelH={design.height / 100} centerY={centerY} />
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

      {/* Cadrages */}
      <div className="absolute top-3 left-3 flex gap-1 bg-slate-900/70 backdrop-blur rounded-full p-1 border border-slate-700">
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setRequest({ id: v.id, n: Date.now() })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${request.id === v.id ? 'bg-amber-400 text-black' : 'text-slate-300 hover:text-white'}`}
          >
            {v.label}
          </button>
        ))}
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
