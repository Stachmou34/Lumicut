import { forwardRef, useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing'

// Traitement de l'image de la vue 3D, comme un appareil photo : la scène est calculée en lumière
// linéaire (valeurs au-delà du blanc de l'écran possibles), puis
// 1. bloom : les zones plus lumineuses que le blanc débordent légèrement (éblouissement de l'objectif),
//    au lieu de faire briller tout le halo comme un néon ;
// 2. compression des hautes lumières (Khronos PBR Neutral, conçue pour les visuels de produits) : couleurs
//    fidèles jusqu'aux tons moyens, hautes lumières qui tendent vers le blanc au lieu d'être écrêtées en
//    aplats de couleur.
// Le rendu physique (PhysicalRender) pose son image juste avant ces effets : même traitement.
// Les effets sont créés une fois et réglés ensuite : leur ordre dans la chaîne ne change jamais.

// Exposition, comme un appareil photo en réglage automatique : plus longue le soir, dans la pièce sombre
const EXPOSURE = { night: 1.3, day: 1 }

// Bloom : seuil en luminance linéaire (1 = blanc de l'écran)
const BLOOM = {
  night: { threshold: 0.85, smoothing: 0.4, intensity: 0.55, radius: 0.62 },
  day: { threshold: 1.1, smoothing: 0.3, intensity: 0.25, radius: 0.55 },
}

const StudioEffects = forwardRef(function StudioEffects({ night }, ref) {
  const invalidate = useThree(s => s.invalidate)
  const gl = useThree(s => s.gl)
  const bloom = useMemo(() => new BloomEffect({ blendFunction: BlendFunction.ADD, mipmapBlur: true }), [])
  const toneMapping = useMemo(() => new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), [])

  useEffect(() => {
    const b = night ? BLOOM.night : BLOOM.day
    bloom.luminanceMaterial.threshold = b.threshold
    bloom.luminanceMaterial.smoothing = b.smoothing
    bloom.intensity = b.intensity
    bloom.mipmapBlurPass.radius = b.radius
    gl.toneMappingExposure = night ? EXPOSURE.night : EXPOSURE.day
    invalidate()
  }, [night, bloom, gl, invalidate])

  useEffect(() => () => {
    bloom.dispose()
    toneMapping.dispose()
  }, [bloom, toneMapping])

  return (
    <EffectComposer ref={ref} multisampling={4} enableNormalPass={false}>
      <primitive object={bloom} dispose={null} />
      <primitive object={toneMapping} dispose={null} />
    </EffectComposer>
  )
})

export default StudioEffects
