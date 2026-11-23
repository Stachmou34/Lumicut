// Parcours du studio, étape par étape, comme la page d'achat Apple ou un configurateur automobile.
// title + question : en-tête de l'étape (« Format. Quelle taille vous faut-il ? »).
// shot : cadrage de la caméra 3D à l'ouverture de l'étape (plans définis dans Studio3D).
export const STUDIO_STEPS = [
  { id: 'motif',    label: 'Motif',         title: 'Motif.',            question: 'Lequel vous ressemble ?',            shot: 'face' },
  { id: 'custom',   label: 'Personnaliser', title: 'Personnalisation.', question: 'Un texte, et le motif à sa place.',  shot: 'face' },
  { id: 'size',     label: 'Format',        title: 'Format.',           question: 'Quelle taille vous faut-il ?',       shot: 'room' },
  { id: 'material', label: 'Matériau',      title: 'Matériau.',         question: 'Quelle finition préférez-vous ?',    shot: 'edge' },
  { id: 'led',      label: 'Éclairage',     title: 'Éclairage.',        question: 'Blanc fixe ou couleurs à volonté ?', shot: 'halo' },
  { id: 'fixing',   label: 'Pose',          title: 'Pose.',             question: 'Où et comment l’installer ?',        shot: 'fixing' },
  { id: 'recap',    label: 'Résumé',        title: 'Résumé.',           question: 'Vérifiez vos choix.',                shot: 'room' },
]

// Position d'une étape dans le parcours (la première si l'identifiant est inconnu)
export function stepIndex(id) {
  return Math.max(0, STUDIO_STEPS.findIndex(s => s.id === id))
}

export function getStep(id) {
  return STUDIO_STEPS[stepIndex(id)]
}

// Étape suivante ou précédente, null aux extrémités du parcours
export function nextStep(id) {
  return STUDIO_STEPS[stepIndex(id) + 1] ?? null
}

export function prevStep(id) {
  return STUDIO_STEPS[stepIndex(id) - 1] ?? null
}
