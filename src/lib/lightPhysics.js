// Photométrie du ruban LED pour le rendu physique de la vue 3D (tracé de chemins).
// Le ruban est une source lambertienne : sa luminance L (cd/m²) vaut flux / (π × surface émettrice).
// Pour un ruban de flux linéique q (lumens par mètre) et de largeur émettrice e (m) : L = q / (π × e),
// quelle que soit la longueur collée. Le moteur 3D travaille en unités photométriques (luminance en
// cd/m² pour une source rectangulaire), comme le rendu temps réel.

// Flux pris quand Philips ne le publie pas, ou pour le ruban blanc (référence fournisseur pas encore
// choisie) : 400 lm/m, celui du Hue Flux (hypothèse)
export const FALLBACK_LUMENS_PER_M = 400

// Part de la largeur du ruban occupée par les LED (le reste est le support et ses bords)
export const EMITTING_SHARE = 0.6

// Exposition de la « caméra » : ramène les luminances réelles à l'échelle des lumières de la pièce,
// comme un appareil photo réglé pour une pièce le soir. Réglée une fois pour toutes ; les écarts
// entre rubans (lumens) restent ceux de la réalité.
export const CAMERA_EXPOSURE = 1 / 900

// Flux linéique du ruban choisi (lm/m), d'après le catalogue (flux annoncé ÷ longueur du ruban vendu)
export function lumensPerMeter(lighting) {
  const l = lighting?.length
  return l?.lumens && l.m ? l.lumens / l.m : FALLBACK_LUMENS_PER_M
}

// Luminance de la face lumineuse du ruban, à l'exposition de la caméra (unités du moteur 3D)
export function stripLuminance(lmPerMeter, stripWidthM) {
  return (lmPerMeter / (Math.PI * stripWidthM * EMITTING_SHARE)) * CAMERA_EXPOSURE
}
