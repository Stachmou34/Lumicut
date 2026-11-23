import { useConfiguratorStore } from '../../store/configuratorStore'
import { SubTitle, OptionCard } from './StepUI'
import FabricationCheck from './FabricationCheck'
import TextEditor from './TextEditor'
import MotifAdjuster from './MotifAdjuster'
import MotifTextComposer from './MotifTextComposer'

// Étape « Personnaliser » : texte facultatif, puis place du motif sur le panneau
export default function PersonalizeStep() {
  const showText = useConfiguratorStore(s => s.showText)
  const setShowText = useConfiguratorStore(s => s.setShowText)

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <SubTitle hint="Prénom, date, citation : découpé dans la matière, comme le motif.">Texte</SubTitle>
        <div className="grid grid-cols-2 gap-3">
          <OptionCard active={!showText} onClick={() => setShowText(false)} title="Sans texte" subtitle="Le motif seul" />
          <OptionCard active={showText} onClick={() => setShowText(true)} title="Avec un texte" subtitle="Inclus" />
        </div>
        {showText && (
          <div className="flex flex-col gap-4 pt-1">
            <FabricationCheck />
            <TextEditor />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SubTitle hint="Vous pouvez aussi le déplacer, l’agrandir et le tourner directement sur l’aperçu.">
          Position du motif
        </SubTitle>
        <MotifAdjuster />
      </section>

      <section className="flex flex-col gap-3">
        <SubTitle hint="Un motif et l’emplacement du texte, prêts à compléter.">Idées de composition</SubTitle>
        <MotifTextComposer />
      </section>
    </div>
  )
}
