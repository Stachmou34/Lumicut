import * as THREE from 'three'

// Lumière du ruban sur le support (mur ou plafond), en rendu temps réel : même calcul que
// src/lib/haloLight.js, point par point dans le shader. Éclairement exact de chaque morceau de ruban
// (rectangle lumineux parallèle au support), rayons arrêtés par les bords du U, puis premier rebond
// estimé (bande du dos du panneau éclairée par le support). Le résultat s'ajoute à l'éclairage de
// la pièce (dans le tampon linéaire, avant le bloom et la compression des hautes lumières).
// Couleurs : celle du ruban au plus près du point, ce qui déroule un dégradé autour du panneau.
// Ombre du panneau sur le support : le mur caché derrière le panneau ne reçoit la lumière de la pièce
// que par la fente entre le panneau et le mur, et le panneau masque une partie de la pièce au mur qui
// l'entoure. L'éclairage déjà dessiné du support est multiplié par cette part de pièce visible
// (mélange : source + destination × alpha), puis la lumière du ruban s'y ajoute.

// Nombre de morceaux droits du ruban et de couleurs suivies le long du ruban
export const GLOW_PIECES = 5
export const GLOW_COLORS = 24

const vertexShader = /* glsl */ `
  varying vec2 vPos;
  void main() {
    vPos = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  #define PIECES ${GLOW_PIECES}
  #define COLORS ${GLOW_COLORS}
  uniform vec2 uHalf;          // demi-largeur et demi-hauteur du panneau (m)
  uniform float uRim;          // épaisseur des bords du U
  uniform float uGap;          // hauteur du dos du U au-dessus du support
  uniform float uH;            // hauteur de la face lumineuse du ruban au-dessus du support
  uniform float uHb;           // hauteur du dos du panneau (rebond)
  uniform float uL;            // luminance du ruban (allumage et intensité compris)
  uniform float uLb;           // luminance de la bande de rebond
  uniform vec3 uAlbedo;        // couleur du support (lumière linéaire)
  uniform int uCount;          // morceaux de ruban posés
  uniform vec4 uEmit[PIECES];  // partie lumineuse de chaque morceau : x0, x1, y0, y1
  uniform vec4 uBand[PIECES];  // bande du dos du panneau le long du morceau
  uniform vec4 uSeg[PIECES];   // ligne médiane du morceau : départ (xy), arrivée (zw)
  uniform vec2 uSegF[PIECES];  // position le long du ruban (0 → 1) au départ et à l'arrivée
  uniform vec3 uColors[COLORS];
  uniform float uDepth;        // saillie du panneau : du support à sa face avant
  uniform float uShade;        // ombre du panneau (0 : panneau décollé du support, 1 : posé)
  uniform float uMargin;       // marge de la surface dessinée autour du panneau
  varying vec2 vPos;


  // Coin de rectangle à l'aplomb du point (unités de la hauteur de la source)
  float corner(vec2 c) {
    vec2 s = sqrt(1.0 + c * c);
    return 0.5 * (c.x / s.x * atan(c.y / s.x) + c.y / s.y * atan(c.x / s.y));
  }
  // ∫∫ h²/r⁴ dA sur un rectangle (x0, x1, y0, y1) relatif au point éclairé
  float rectFactor(vec4 r, float h) {
    if (r.y <= r.x || r.w <= r.z) return 0.0;
    r /= h;
    return corner(r.yw) - corner(r.xw) - corner(r.yz) + corner(r.xz);
  }
  // Partie du plan de la source (hauteur h) vue depuis p à travers l'ouverture du dos du U
  vec4 visibleRect(vec2 p, float h) {
    float t = (h - uGap) / h;
    float k = h / uGap;
    vec2 o = uHalf - uRim;
    return vec4((-o.x - t * p.x) * k, (o.x - t * p.x) * k, (-o.y - t * p.y) * k, (o.y - t * p.y) * k);
  }
  vec4 clipRel(vec4 r, vec4 v, vec2 p) {
    return vec4(max(r.x, v.x) - p.x, min(r.y, v.y) - p.x, max(r.z, v.z) - p.y, min(r.w, v.w) - p.y);
  }
  // Part de la pièce cachée par une bande infinie de hauteur h vue à la distance d de son bord
  // (facteur de forme) : 0,5 au ras du bord, tend vers 0 en s'éloignant
  float sideView(float d, float h) {
    return 0.5 * (1.0 - d / sqrt(d * d + h * h));
  }
  // Part de la pièce visible depuis un point du support (lumière d'ambiance et de la lampe) : le dessous
  // du panneau (dos du U, à la hauteur du déport) en cache la part exacte de son facteur de forme ;
  // autour du panneau, ses flancs (jusqu'à la face avant) en cachent un peu plus. Derrière le panneau
  // posé au mur, il ne reste que la fente le long des bords ; sous un panneau suspendu, presque tout.
  float roomVisibility(vec2 p) {
    float hidden = rectFactor(vec4(-uHalf.x - p.x, uHalf.x - p.x, -uHalf.y - p.y, uHalf.y - p.y), uGap) * 0.3183098862;
    float d = length(max(abs(p) - uHalf, vec2(0.0)));
    if (d > 0.0) hidden += sideView(d, uDepth) - sideView(d, uGap);
    // Ramené à rien au bord de la surface dessinée (pas de marche visible)
    hidden *= 1.0 - smoothstep(0.6 * uMargin, uMargin, d);
    return 1.0 - clamp(hidden, 0.0, 1.0);
  }

  vec3 colorAt(float f) {
    float x = clamp(f * float(COLORS) - 0.5, 0.0, float(COLORS - 1));
    int i = int(floor(x));
    int j = min(i + 1, COLORS - 1);
    return mix(uColors[i], uColors[j], x - float(i));
  }

  void main() {
    vec2 p = vPos;
    vec4 v = visibleRect(p, uH);
    vec4 vb = visibleRect(p, uHb);
    vec3 e = vec3(0.0);
    for (int k = 0; k < PIECES; k++) {
      if (k >= uCount) break;
      vec4 seg = uSeg[k];
      vec2 d = seg.zw - seg.xy;
      float t = clamp(dot(p - seg.xy, d) / max(dot(d, d), 1e-9), 0.0, 1.0);
      vec3 c = colorAt(mix(uSegF[k].x, uSegF[k].y, t));
      float f = uL * rectFactor(clipRel(uEmit[k], v, p), uH);
      // Rebond sur le dos du panneau (calcul évité quand il n'y en a pas)
      if (uLb > 0.0) f += uLb * rectFactor(clipRel(uBand[k], vb, p), uHb);
      e += c * f;
    }
    // Luminance du support : réflectance × éclairement / π ; alpha = part de la pièce visible
    gl_FragColor = vec4(uAlbedo * e * 0.3183098862, mix(1.0, roomVisibility(p), uShade));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function createSupportGlowMaterial() {
  const vec4s = () => Array.from({ length: GLOW_PIECES }, () => new THREE.Vector4())
  return new THREE.ShaderMaterial({
    uniforms: {
      uHalf: { value: new THREE.Vector2(0.3, 0.15) },
      uRim: { value: 0.004 },
      uGap: { value: 0.03 },
      uH: { value: 0.04 },
      uHb: { value: 0.046 },
      uL: { value: 0 },
      uLb: { value: 0 },
      uAlbedo: { value: new THREE.Color(0.8, 0.8, 0.8) },
      uCount: { value: 0 },
      uEmit: { value: vec4s() },
      uBand: { value: vec4s() },
      uSeg: { value: vec4s() },
      uSegF: { value: Array.from({ length: GLOW_PIECES }, () => new THREE.Vector2()) },
      uColors: { value: Array.from({ length: GLOW_COLORS }, () => new THREE.Color(1, 1, 1)) },
      uDepth: { value: 0.05 },
      uShade: { value: 1 },
      uMargin: { value: 0.15 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    // Support déjà éclairé × part de pièce visible, plus la lumière du ruban (alpha du support conservé)
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.SrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    depthWrite: false,
    // Collé au support : légèrement tiré vers la caméra pour ne pas scintiller avec lui
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
}
