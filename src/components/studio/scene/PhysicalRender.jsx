import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PathTracerPass } from './pathTracerPass'

// Rendu physique de la lumière, par tracé de chemins (three-gpu-pathtracer) : quand la vue est immobile,
// la scène est recalculée rayon par rayon. La lumière du ruban part de sa vraie place dans le creux du U,
// les bords du U en arrêtent une partie, elle rebondit sur le mur et dans la pièce, passe par le motif,
// et les ombres sont douces. Pendant un mouvement ou un changement, le rendu temps réel reste affiché ;
// l'image physique apparaît en fondu dès qu'elle est assez nette, puis s'affine.
// Elle est posée dans la chaîne d'effets de la vue (PathTracerPass), avant le bloom et la compression des
// hautes lumières : même traitement d'image que le rendu temps réel, qui sert aussi de guide au débruitage.
//
// composer : la chaîne d'effets (ref de l'EffectComposer) ;
// version : change à chaque modification de la scène (le calcul repart après une courte pause) ;
// paused : calcul suspendu (édition à la souris, repères affichés) sans perdre le traceur déjà préparé ;
// onProgress({ samples, max, compiling, failed }) : avancement, pour l'indicateur de la vue 3D.

// Échantillons par pixel visés : au-delà, l'image ne bouge plus à l'œil et le calcul s'arrête
export const MAX_SAMPLES = 320
// Échantillons avant d'afficher l'image physique (moins de grain), et durée de son fondu (ms)
const MIN_SAMPLES = 12
const FADE_MS = 700
// Pause après un changement de la scène avant de relancer le calcul (laisse finir les fondus)
const SETTLE_MS = 1300
// Pause après un mouvement de caméra avant de reprendre le calcul (pas de calcul perdu pendant le geste)
const MOVE_PAUSE_MS = 250
// Luminance maximale d'un échantillon : les rares chemins qui tombent sur le ruban après plusieurs
// rebonds donneraient des points isolés très lumineux (« lucioles ») ; au-delà de ce niveau (déjà
// blanc à l'écran), l'échantillon est ramené. Ce qui est vu directement ou éclairé normalement n'y touche pas.
const SAMPLE_CLAMP = 8

// Écrêtage par échantillon, ajouté au calcul du traceur juste avant l'accumulation de l'échantillon
function clampSamples(material) {
  const end = 'gl_FragColor.a *= opacity;'
  if (!material?.fragmentShader?.includes(end)) return
  material.fragmentShader = material.fragmentShader.replace(end, `
    float sampleLuma = dot( gl_FragColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
    if ( sampleLuma > ${SAMPLE_CLAMP.toFixed(1)} ) gl_FragColor.rgb *= ${SAMPLE_CLAMP.toFixed(1)} / sampleLuma;
    ${end}`)
  material.needsUpdate = true
}

// Lecture de la scène par le traceur : les éléments du rendu temps réel seulement sont masqués, les sources
// du rendu physique seulement sont montrées et prennent leur taille et leur luminance réelles (userData.pt),
// le temps de la lire
function withPhysicalScene(scene, fn) {
  const restore = []
  scene.traverse(o => {
    if (o.userData.rasterOnly && o.visible) {
      o.visible = false
      restore.push(() => { o.visible = true })
    }
    if (o.userData.ptOnly && !o.visible) {
      o.visible = true
      restore.push(() => { o.visible = false })
    }
    if (o.isRectAreaLight && o.userData.pt) {
      const before = { width: o.width, height: o.height, intensity: o.intensity }
      Object.assign(o, o.userData.pt)
      restore.push(() => Object.assign(o, before))
    }
  })
  try {
    fn()
  } finally {
    restore.forEach(f => f())
  }
}

export default function PhysicalRender({ composer, version, paused = false, onProgress }) {
  const gl = useThree(s => s.gl)
  const scene = useThree(s => s.scene)
  const camera = useThree(s => s.camera)
  const controls = useThree(s => s.controls)
  const invalidate = useThree(s => s.invalidate)
  const tracer = useRef(null)
  const ready = useRef(false)
  const timer = useRef(null)
  const reported = useRef('')
  const shownAt = useRef(null)
  const movedAt = useRef(0)
  const poll = useRef(null)
  const progress = useRef(onProgress)
  progress.current = onProgress
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const pass = useMemo(() => new PathTracerPass(), [])

  const report = state => {
    const key = JSON.stringify(state)
    if (key === reported.current) return
    reported.current = key
    progress.current?.(state)
  }

  // Lecture (ou relecture) de la scène, une fois les fondus terminés
  const build = () => {
    const t = tracer.current
    if (!t) return
    try {
      withPhysicalScene(scene, () => t.setScene(scene, camera))
      shownAt.current = null
      ready.current = true
    } catch (err) {
      console.error('Rendu physique :', err)
      report({ samples: 0, max: MAX_SAMPLES, compiling: false, failed: true })
    }
    invalidate()
  }
  const schedule = () => {
    ready.current = false
    pass.opacity = 0
    clearTimeout(timer.current)
    if (pausedRef.current) {
      invalidate()
      return
    }
    timer.current = setTimeout(build, SETTLE_MS)
    report({ samples: 0, max: MAX_SAMPLES, compiling: false, failed: false })
    invalidate()
  }

  // Passe d'affichage de l'image physique, juste après le rendu de la scène, avant les effets
  // (posée à la première image, et reposée si la chaîne d'effets est recréée) ; retirée au démontage
  useEffect(() => () => composer?.current?.removePass(pass), [composer, pass])
  useEffect(() => () => pass.dispose(), [pass])

  // Création du traceur : module chargé à la demande (il n'alourdit pas le reste du site)
  useEffect(() => {
    let alive = true
    if (!gl.extensions.has('EXT_color_buffer_float')) {
      report({ samples: 0, max: MAX_SAMPLES, compiling: false, failed: true })
      return undefined
    }
    import('three-gpu-pathtracer').then(({ WebGLPathTracer }) => {
      if (!alive) return
      const t = new WebGLPathTracer(gl)
      // Définition du calcul : environ 1,25 pixel physique par point d'écran, au plus la définition de l'écran
      t.renderScale = Math.min(1, 1.25 / gl.getPixelRatio())
      t.tiles.set(2, 2)
      // Textures des matières à la définition du masque de découpe (2048 px) : les découpes fines du motif
      // laissent passer autant de lumière que dans le rendu temps réel
      t.textureSize.set(2048, 2048)
      // Cinq rebonds : la lumière fait l'aller-retour mur ↔ dos du panneau et éclaire la pièce
      t.bounces = 5
      // Reflets flous après le premier rebond : beaucoup moins de lucioles, aspect inchangé
      t.filterGlossyFactor = 1
      clampSamples(t._pathTracer?.material)
      // Le traceur ne fait qu'accumuler : l'affichage passe par la chaîne d'effets (PathTracerPass)
      t.renderToCanvas = false
      t.rasterizeScene = false
      t.dynamicLowRes = false
      t.renderDelay = 0
      tracer.current = t
      schedule()
    }).catch(err => {
      console.error('Rendu physique indisponible :', err)
      report({ samples: 0, max: MAX_SAMPLES, compiling: false, failed: true })
    })
    return () => {
      alive = false
      clearTimeout(timer.current)
      clearTimeout(poll.current)
      const t = tracer.current
      tracer.current = null
      ready.current = false
      pass.opacity = 0
      pass.map = null
      if (t) {
        // dispose() de cette version oublie une partie de ses ressources : on libère le tout ici
        for (const part of [t._pathTracer, t._lowResPathTracer, t._quad]) {
          try { part?.dispose?.() } catch { /* déjà libéré */ }
        }
        try { t._quad?.material?.dispose?.() } catch { /* déjà libéré */ }
      }
      invalidate()
    }
  }, [gl]) // eslint-disable-line react-hooks/exhaustive-deps

  // Changement de la scène, pause ou reprise : le calcul repart de zéro après une courte pause
  useEffect(() => {
    if (tracer.current) schedule()
  }, [version, paused]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mouvement de caméra : le calcul repart de zéro (le rendu temps réel s'affiche pendant le geste),
  // et ne reprend qu'une fois la caméra arrêtée
  useEffect(() => {
    if (!controls) return undefined
    let resume = null
    const onUpdate = () => {
      if (!ready.current) return
      tracer.current?.updateCamera()
      shownAt.current = null
      pass.opacity = 0
      movedAt.current = performance.now()
      clearTimeout(resume)
      resume = setTimeout(invalidate, MOVE_PAUSE_MS + 20)
    }
    controls.addEventListener('update', onUpdate)
    return () => {
      clearTimeout(resume)
      controls.removeEventListener('update', onUpdate)
    }
  }, [controls, pass, invalidate])

  // Avant la chaîne d'effets (priorité 1) : un échantillon de plus, puis le fondu de l'image physique
  useFrame(() => {
    const c = composer?.current
    if (c && !c.passes.includes(pass)) c.addPass(pass, 1)
    const t = tracer.current
    if (!t || !ready.current) {
      pass.opacity = 0
      return
    }
    // Préparation du programme de calcul (en tâche de fond sur la plupart des cartes graphiques) :
    // on repasse de temps en temps au lieu de redessiner la vue à chaque image
    if (t.isCompiling) {
      pass.opacity = 0
      report({ samples: 0, max: MAX_SAMPLES, compiling: true, failed: false })
      clearTimeout(poll.current)
      poll.current = setTimeout(invalidate, 150)
      return
    }
    const now = performance.now()
    const still = now - movedAt.current >= MOVE_PAUSE_MS
    if (still && t.samples < MAX_SAMPLES) t.renderSample()
    const samples = Math.min(MAX_SAMPLES, Math.floor(t.samples))
    if (samples >= MIN_SAMPLES && still) {
      if (shownAt.current === null) shownAt.current = now
      pass.opacity = Math.min(1, (now - shownAt.current) / FADE_MS)
    } else {
      // Calcul reparti de zéro (caméra, taille de la vue) : nouveau fondu quand l'image sera prête
      shownAt.current = null
      pass.opacity = 0
    }
    pass.map = t.target.texture
    pass.samples = samples
    report({ samples: samples - (samples % 8), max: MAX_SAMPLES, compiling: t.isCompiling, failed: false })
    if (still && (samples < MAX_SAMPLES || pass.opacity < 1)) invalidate()
  }, 0.5)

  return null
}
