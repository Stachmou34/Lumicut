import { useConfiguratorStore } from '../../store/configuratorStore'
import { MATERIALS } from '../../lib/materials'
import { getPanelMaterial } from '../../lib/panelMaterials'
import { formatSurcharge } from '../../lib/formatEuros'
import { OptionCard } from './StepUI'

// Épaisseur de la plaque en millimètres (données de rendu et de découpe)
const thicknessMm = id => Math.round(getPanelMaterial(id).thickness * 1000)

// Étape « Matériau » : une carte par matière, avec sa pastille, son épaisseur et son supplément
export default function MaterialSelector() {
  const { material, setMaterial } = useConfiguratorStore()

  return (
    <div className="flex flex-col gap-3">
      {MATERIALS.map(m => (
        <OptionCard
          key={m.id}
          active={material === m.id}
          onClick={() => setMaterial(m.id)}
          leading={
            <span
              className="w-10 h-10 flex-shrink-0 rounded-full ring-1 ring-white/15 shadow-inner"
              style={{ background: m.color }}
            />
          }
          title={m.label}
          subtitle={`Plaque de ${thicknessMm(m.id)} mm`}
          aside={formatSurcharge(m.surcharge)}
        />
      ))}
    </div>
  )
}
