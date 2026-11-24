// Lumière du ruban sur le support (mur ou plafond), pour le rendu temps réel de la vue 3D.
// Le ruban, collé au fond du creux du U, éclaire le support à quelques centimètres. On calcule
// l'éclairement exact qu'il y produit : source rectangulaire lambertienne parallèle au support,
// et rayons arrêtés par les bords du U (seuls passent ceux qui sortent par l'ouverture du dos).
// C'est ce qui donne un halo serré, très lumineux au ras du panneau puis qui s'éteint en quelques
// centimètres (d'autant plus loin que le panneau est décollé), et une lumière plus forte derrière
// le motif près des bords que vers le centre.
// Le premier rebond (le support éclairé renvoie la lumière sur le dos du panneau, qui la renvoie
// à son tour) est estimé par une bande lumineuse sur le dos du panneau, le long du ruban.
// Mêmes formules dans le shader de la vue 3D (LitPanel) et dans les tests.
//
// Repère du panneau : support en z = 0, panneau vu de face, origine au centre, x vers la droite,
// y vers le haut, mètres.

// ∫0^X ∫0^Y du dv / (1 + u² + v²)² : un coin de rectangle à l'aplomb du point éclairé, en unités
// de la hauteur de la source
export function cornerFactor(X, Y) {
  const sx = Math.sqrt(1 + X * X)
  const sy = Math.sqrt(1 + Y * Y)
  return 0.5 * ((X / sx) * Math.atan(Y / sx) + (Y / sy) * Math.atan(X / sy))
}

// ∫∫ h² / r⁴ dA sur le rectangle [x0, x1] × [y0, y1] (coordonnées relatives au point éclairé),
// source à la hauteur h : l'éclairement vaut la luminance de la source multipliée par ce facteur.
// Plan entier : π (une source lambertienne infinie éclaire à π × sa luminance).
export function rectFactor(x0, x1, y0, y1, h) {
  if (x1 <= x0 || y1 <= y0) return 0
  const a0 = x0 / h
  const a1 = x1 / h
  const b0 = y0 / h
  const b1 = y1 / h
  return cornerFactor(a1, b1) - cornerFactor(a0, b1) - cornerFactor(a1, b0) + cornerFactor(a0, b0)
}

// Partie du plan de la source (hauteur h) que voit un point du support : un rayon venant du creux
// doit traverser le plan du dos du U (z = gap) dans l'ouverture entre les bords intérieurs.
// Le rayon y passe à la fraction t = (h - gap) / h du trajet ; la condition sur la source est un
// rectangle (une condition par axe).
export function visibleRegion(px, py, { halfW, halfH, rim, gap }, h) {
  const t = (h - gap) / h
  const k = h / gap
  const ox = halfW - rim
  const oy = halfH - rim
  return {
    x0: (-ox - t * px) * k,
    x1: (ox - t * px) * k,
    y0: (-oy - t * py) * k,
    y1: (oy - t * py) * k,
  }
}

// Éclairement d'un point du support par une liste de rectangles lumineux
// [{ x0, x1, y0, y1, h, L }] (bords du U compris). Renvoie l'éclairement (même unité que L × 1).
export function supportIrradiance(px, py, geo, emitters) {
  let e = 0
  for (const r of emitters) {
    const v = visibleRegion(px, py, geo, r.h)
    const x0 = Math.max(r.x0, v.x0) - px
    const x1 = Math.min(r.x1, v.x1) - px
    const y0 = Math.max(r.y0, v.y0) - py
    const y1 = Math.min(r.y1, v.y1) - py
    e += r.L * rectFactor(x0, x1, y0, y1, r.h)
  }
  return e
}

// Partie lumineuse d'un morceau droit du ruban (rectangle aligné sur les axes), et bande du dos du
// panneau qu'éclaire le mur sous ce morceau (du bord intérieur du U vers le centre, largeur `band`).
// piece : { center: [x, y], length, horizontal } ; edge : distance du milieu du ruban au bord extérieur.
export function pieceRects(piece, { emitW, halfW, halfH, rim, band }) {
  const [cx, cy] = piece.center
  const half = piece.length / 2
  if (piece.horizontal) {
    const top = cy > 0
    const inner = top ? halfH - rim : -(halfH - rim)
    return {
      emit: { x0: cx - half, x1: cx + half, y0: cy - emitW / 2, y1: cy + emitW / 2 },
      bounce: top
        ? { x0: cx - half, x1: cx + half, y0: Math.max(0, inner - band), y1: inner }
        : { x0: cx - half, x1: cx + half, y0: inner, y1: Math.min(0, inner + band) },
    }
  }
  const right = cx > 0
  const inner = right ? halfW - rim : -(halfW - rim)
  return {
    emit: { x0: cx - emitW / 2, x1: cx + emitW / 2, y0: cy - half, y1: cy + half },
    bounce: right
      ? { x0: Math.max(0, inner - band), x1: inner, y0: cy - half, y1: cy + half }
      : { x0: inner, x1: Math.min(0, inner + band), y0: cy - half, y1: cy + half },
  }
}

// Bande du dos du panneau qui renvoie la lumière : largeur, et part du flux du ruban qu'elle renvoie.
// Le mur (réflectance ρs) éclairé sous le ruban renvoie la lumière vers le dos du panneau (ρp) ;
// environ 70 % de ce que renvoie le mur atteint le dos (le reste sort par la fente entre panneau et mur).
// Les rebonds suivants entre mur et dos du panneau ajoutent une série géométrique.
export const BOUNCE_REACH = 0.7
export function bounceShare(supportAlbedo, backAlbedo) {
  const once = BOUNCE_REACH * supportAlbedo * backAlbedo
  return once / (1 - 0.5 * once)
}

// Réflectance d'une couleur sRGB (#rrggbb) : luminance relative de la couleur en lumière linéaire
export function albedoOf(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16)
  const lin = c => {
    const v = c / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
}

// Largeur du halo direct autour du panneau (m) : distance au bord où l'éclairement du support tombe
// sous `floor` (5 %) de sa valeur au ras du bord, le long d'un grand côté.
// Géométrie (m) : gap = déport (support → dos du U), rim = épaisseur des bords, rimDepth = profondeur du
// creux, stripW / stripH = section du ruban, emitW = largeur des LED.
export function directHaloReach({ gap, rim, rimDepth, stripW, stripH, emitW }, floor = 0.05) {
  const halfH = 0.5
  const geo = { halfW: 1, halfH, rim, gap }
  const h = gap + rimDepth - Math.min(stripH, rimDepth - 0.001)
  const cy = halfH - rim - stripW / 2
  const emit = [{ x0: -0.9, x1: 0.9, y0: cy - emitW / 2, y1: cy + emitW / 2, h, L: 1 }]
  const atEdge = supportIrradiance(0, halfH + 0.0005, geo, emit)
  let reach = 0
  for (let d = 0.0005; d < 0.3; d += 0.0005) {
    if (supportIrradiance(0, halfH + d, geo, emit) >= atEdge * floor) reach = d
    else break
  }
  return reach
}
