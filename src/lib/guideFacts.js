// Données du guide de pose, tirées du catalogue du site (rien n'est écrit à la main)
import { SIZE_PRESETS } from './sizes'
import { LIGHT_MODELS, lightingFor } from './lighting/lightingCatalog'

// Longueur de ruban Philips Hue à garder pour chaque format standard, façade acrylique
// (le ruban blanc, lui, part déjà à la bonne longueur)
export function hueCutTable(material = 'acrylic-black') {
  return LIGHT_MODELS.filter(m => m.hue).map(model => ({
    model,
    cells: SIZE_PRESETS.map(p => {
      const l = lightingFor({ lightModel: model.id, width: p.width, height: p.height, material })
      return { preset: p.id, cutCm: l.cutCm, lengthM: l.lengthM }
    }),
  }))
}

// Exemple affiché dans les étapes : panneau S avec un ruban Flux (longueur gardée et reste à l'encoche)
export function stripExample(material = 'acrylic-black') {
  const l = lightingFor({ lightModel: 'hue-flux', width: 40, height: 20, material })
  return { cutCm: l.cutCm, runCm: l.runCm, insetCm: l.insetCm, gapCm: Math.round((l.runCm - l.cutCm) * 10) / 10 }
}
