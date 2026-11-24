import { useMemo, useState } from 'react'
import { useConfiguratorStore } from '../../store/configuratorStore'
import { lightingFor, lightingChange, presetChange } from '../../lib/lighting/lightingCatalog'
import StripInstallPreview from '../studio/StripInstallPreview'
import { Segmented } from '../studio/StepUI'

// Démonstration du guide : la même animation de pose que dans le studio, sur un panneau S.
// Le visiteur change de ruban ou d'ambiance : largeur, longueur à garder et reste à l'encoche
// suivent le calcul réel du studio.
const STRIPS = [
  { id: 'standard', label: 'Blanc fixe' },
  { id: 'hue-essential', label: 'Essential' },
  { id: 'hue-flux', label: 'Flux' },
  { id: 'hue-omniglow', label: 'OmniGlow' },
]
const AMBIANCES = [
  { id: 'warm', label: 'Blanc chaud' },
  { id: 'blue', label: 'Couleur' },
  { id: 'coucher-de-soleil', label: 'Dégradé' },
]

export default function PoseDemo() {
  // Configuration de départ du studio (motif par défaut), au format S, entretoises inox
  const base = useMemo(
    () => ({ ...useConfiguratorStore.getInitialState(), width: 40, height: 20, material: 'acrylic-black', mounting: 'standoff-steel' }),
    []
  )
  const [lightModel, setLightModel] = useState('hue-flux')
  const [ambiance, setAmbiance] = useState('warm')
  // Le ruban blanc ne fait que du blanc : comme dans le studio, une couleur passe sur un ruban Philips Hue
  const preset = lightModel === 'standard' ? 'warm' : ambiance
  const pickAmbiance = id => {
    setAmbiance(id)
    if (id !== 'warm' && lightModel === 'standard') setLightModel('hue-flux')
  }
  const state = useMemo(() => {
    const withModel = { ...base, ...lightingChange(base, { lightModel }) }
    return { ...withModel, ...lightingChange(withModel, presetChange(preset)) }
  }, [base, lightModel, preset])
  const lighting = lightingFor(state)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-10 lg:gap-14 items-center">
      <div className="min-w-0">
        <StripInstallPreview state={state} lighting={lighting} pinned={false} guideLink={false} />
      </div>
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-white">La pose, en animation</h3>
          <p className="mt-2 text-slate-400 leading-relaxed">
            Le dos d’un panneau S, comme dans le studio : le ruban part de l’encoche, fait le tour contre le bord,
            s’arrête au dernier repère, puis s’allume. Changez de ruban : sa largeur, la longueur à garder et le reste
            à l’encoche suivent le même calcul que le studio.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Ruban</span>
          <Segmented options={STRIPS} value={lightModel} onChange={setLightModel} label="Ruban de la démonstration" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Ambiance</span>
          <Segmented options={AMBIANCES} value={preset} onChange={pickAmbiance} label="Ambiance de la démonstration" />
          <p className="text-sm text-slate-500">Le ruban blanc ne fait que du blanc : une couleur ou un dégradé passe sur un ruban Philips Hue.</p>
        </div>
      </div>
    </div>
  )
}
