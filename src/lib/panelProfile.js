// Profil du panneau : une façade découpée au laser et des bords de même épaisseur qui reviennent
// vers le mur, en U, sur 2 cm en tout. Le ruban LED, livré non posé, se colle au fond du creux,
// contre le bord. Fonctions pures, partagées par la vue 3D, l'éclairage et (à terme) le fichier de découpe.
import { getPanelMaterial } from './panelMaterials'

// Épaisseur totale du panneau, façade comprise (mm)
export const PANEL_DEPTH_MM = 20

// Cotes du U pour une matière (mm) : façade et bords de même épaisseur, creux au milieu
export function panelProfile(materialId) {
  const faceMm = Math.round(getPanelMaterial(materialId).thickness * 10000) / 10
  return { depthMm: PANEL_DEPTH_MM, faceMm, rimMm: faceMm, hollowMm: PANEL_DEPTH_MM - faceMm }
}
