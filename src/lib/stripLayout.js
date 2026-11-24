// Tracé du ruban LED dans le creux du panneau en U, partagé par la vue 3D et l'animation de pose
// de l'étape Éclairage : le ruban part de l'encoche du câble (milieu du bord du bas), fait le tour
// contre le bord et s'arrête au dernier repère de coupe ; le petit reste tombe à l'encoche.
// Repère : panneau vu de face, origine au centre, x vers la droite, y vers le haut.
// Les fonctions de tracé ne dépendent pas de l'unité (mètres pour la 3D, pixels pour l'animation).

// Encoche du câble, au milieu du bord du bas (mm) : largeur, et profondeur depuis le dos du U
export const NOTCH_WIDTH_MM = 14
export const NOTCH_DEPTH_MM = 8

// Départ du ruban, juste à côté de l'encoche : distance au milieu du panneau (mm)
export const STRIP_START_MM = NOTCH_WIDTH_MM / 2 + 1

// Nombre de tronçons droits du tour (bas, côté, haut, autre côté, retour vers l'encoche)
export const LOOP_SIDES = 5

// Tour suivi par la ligne médiane du ruban, à `inset` du bord, en partant à `start` du milieu.
// Sens de pose, vu de face : vers la gauche le long du bas, le côté gauche, le haut, le côté droit,
// puis retour vers l'encoche. Tronçons : { from, to, start (distance au départ), length }.
// La longueur totale est celle de stripRunCm (lightingCatalog) : le tour complet du creux.
export function stripLoop(width, height, inset, start) {
  const x = Math.max(0, width / 2 - inset)
  const y = Math.max(0, height / 2 - inset)
  const s = Math.min(start, x)
  const corners = [[-s, -y], [-x, -y], [-x, y], [x, y], [x, -y], [-s, -y]]
  const segments = []
  let total = 0
  for (let i = 1; i < corners.length; i++) {
    const length = Math.hypot(corners[i][0] - corners[i - 1][0], corners[i][1] - corners[i - 1][1])
    segments.push({ from: corners[i - 1], to: corners[i], start: total, length })
    total += length
  }
  return { segments, length: total }
}

function pointOnSegment(seg, arc) {
  const t = seg.length ? Math.min(1, Math.max(0, (arc - seg.start) / seg.length)) : 0
  return [seg.from[0] + (seg.to[0] - seg.from[0]) * t, seg.from[1] + (seg.to[1] - seg.from[1]) * t]
}

// Morceaux droits du ruban entre deux distances du départ, un par tronçon traversé
// (side : numéro du tronçon, de 0 à LOOP_SIDES - 1). Les tronçons non atteints ne donnent rien.
export function loopPieces(loop, from, to) {
  const pieces = []
  loop.segments.forEach((seg, side) => {
    const a = Math.max(from, seg.start)
    const b = Math.min(to, seg.start + seg.length)
    if (b - a > 1e-9) {
      pieces.push({ side, from: pointOnSegment(seg, a), to: pointOnSegment(seg, b), start: a, length: b - a })
    }
  })
  return pieces
}

// Point du tour à une distance du départ, avec la direction de pose (radians)
export function loopPoint(loop, arc) {
  const a = Math.max(0, Math.min(arc, loop.length))
  const seg = loop.segments.find(s => a <= s.start + s.length + 1e-9) ?? loop.segments[loop.segments.length - 1]
  const [x, y] = pointOnSegment(seg, a)
  return { x, y, angle: Math.atan2(seg.to[1] - seg.from[1], seg.to[0] - seg.from[0]) }
}

// Polyligne du ruban entre deux distances du départ, coins compris
export function loopPolyline(loop, from, to) {
  const pieces = loopPieces(loop, from, to)
  return pieces.length ? [pieces[0].from, ...pieces.map(p => p.to)] : []
}

// Points régulièrement répartis sur le ruban posé (de 0 à `laid`), au milieu de chaque intervalle :
// { x, y, f } où f (0 → 1) est la position le long du ruban, qui donne la couleur d'un dégradé
export function stripSamples(loop, laid, count) {
  return Array.from({ length: count }, (_, i) => {
    const f = (i + 0.5) / count
    const { x, y } = loopPoint(loop, f * laid)
    return { x, y, f }
  })
}
