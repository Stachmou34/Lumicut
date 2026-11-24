import * as THREE from 'three'
import { Pass } from 'postprocessing'

// Image du rendu physique posée sur l'image temps réel, dans la chaîne d'effets de la vue 3D :
// juste après le rendu de la scène, avant le bloom et la compression des hautes lumières. Les deux
// rendus passent ainsi par les mêmes effets et le passage de l'un à l'autre se fait en fondu.
//
// Débruitage : tant que le calcul n'a que quelques dizaines d'échantillons par pixel, la lumière renvoyée
// par la pièce reste granuleuse. Chaque pixel est moyenné avec ses voisins qui, dans l'image temps réel
// (nette, même scène, même lumière), ont la même couleur : le grain disparaît sans flouter les contours
// (découpes du motif, bords du panneau, meubles). Le rayon diminue à mesure que le calcul s'affine.
// L'image du traceur est en lumière linéaire, à virgule flottante, sans filtrage : on la lit texel par texel,
// en écrêtant les rares pixels aberrants (lucioles).

// Luminance au-delà de laquelle un pixel isolé est ramené (bien au-dessus du blanc de l'écran)
const MAX_LUMA = 24

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D map;       // accumulation du traceur
  uniform sampler2D raster;    // image temps réel (guide des contours)
  uniform float opacity;
  uniform float maxLuma;
  uniform float sigma;         // rayon du débruitage (texels du traceur)
  uniform float guideSigma;    // écart de couleur toléré dans l'image temps réel
  varying vec2 vUv;

  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

  vec3 fetchClamped(ivec2 px) {
    vec3 c = texelFetch(map, px, 0).rgb;
    float l = dot(c, LUMA);
    return l > maxLuma ? c * (maxLuma / l) : c;
  }
  // Couleur comprimée (hautes lumières ramenées) pour comparer des pixels clairs et sombres
  vec3 compress(vec3 c) {
    return c / (1.0 + dot(c, LUMA));
  }

  void main() {
    vec3 base = texture2D(raster, vUv).rgb;
    vec2 size = vec2(textureSize(map, 0));
    vec2 pos = vUv * size - 0.5;
    vec2 center = floor(pos + 0.5);
    vec3 guide = compress(base);
    float stride = max(1.0, sigma * 0.75);
    vec3 sum = vec3(0.0);
    float total = 0.0;
    for (int j = -2; j <= 2; j++) {
      for (int i = -2; i <= 2; i++) {
        vec2 t = center + vec2(float(i), float(j)) * stride;
        vec2 tc = clamp(t, vec2(0.0), size - 1.0);
        vec2 d = tc - pos;
        float w = exp(-dot(d, d) / (2.0 * sigma * sigma));
        vec3 g = compress(texture2D(raster, (tc + 0.5) / size).rgb) - guide;
        w *= exp(-dot(g, g) / (2.0 * guideSigma * guideSigma));
        sum += fetchClamped(ivec2(tc)) * w;
        total += w;
      }
    }
    vec3 traced = total > 1e-5 ? sum / total : fetchClamped(ivec2(clamp(center, vec2(0.0), size - 1.0)));
    gl_FragColor = vec4(mix(base, traced, opacity), 1.0);
  }
`

export class PathTracerPass extends Pass {
  constructor() {
    super('PathTracerPass')
    this.fullscreenMaterial = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: null },
        raster: { value: null },
        opacity: { value: 0 },
        maxLuma: { value: MAX_LUMA },
        sigma: { value: 2 },
        guideSigma: { value: 0.06 },
      },
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    })
    // Image du traceur (texture de son accumulation), opacité du fondu (0 : rendu temps réel seul)
    // et nombre d'échantillons déjà calculés (règle le débruitage)
    this.map = null
    this.opacity = 0
    this.samples = 0
  }

  render(renderer, inputBuffer, outputBuffer) {
    // Rien à poser : l'image temps réel passe telle quelle au passage suivant
    this.needsSwap = Boolean(this.map) && this.opacity > 0
    if (!this.needsSwap) return
    const u = this.fullscreenMaterial.uniforms
    u.map.value = this.map
    u.raster.value = inputBuffer.texture
    u.opacity.value = this.opacity
    // Débruitage fort au début, presque nul quand l'image est nette
    u.sigma.value = THREE.MathUtils.lerp(2.4, 0.7, Math.min(1, this.samples / 200))
    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer)
    renderer.render(this.scene, this.camera)
  }

  // Libère le seul matériau de la passe : les textures affichées appartiennent au traceur et à la chaîne
  // d'effets (le dispose() de Pass libérerait aussi les textures qu'elle référence)
  dispose() {
    this.map = null
    this.fullscreenMaterial?.dispose()
  }
}
