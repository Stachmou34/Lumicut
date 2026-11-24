import { useEffect, useState } from 'react'
import { useConfiguratorStore } from '../../store/configuratorStore'
import { PLACEMENTS } from '../../lib/rooms'
import {
  STANDOFF_DEPTHS_MM, POWER_OPTIONS, HOLE_INSET_CM,
  getFixing, fixingsForPlacement, computeFixingPoints, clearanceRadiusCm, describePoint, describeKit,
} from '../../lib/fixings'
import { designFromState } from '../../lib/panelDesign'
import { findHoleConflicts } from '../../lib/cutMask'
import { SubTitle, OptionCard, Segmented } from './StepUI'
import { panelProfile } from '../../lib/panelProfile'
import { stripSection } from '../../lib/lighting/lightingCatalog'
import { directHaloReach } from '../../lib/haloLight'
import { EMITTING_SHARE } from '../../lib/lightPhysics'

// Pastille de finition de chaque fixation
const SWATCH = {
  'standoff-steel': 'bg-zinc-300',
  'standoff-black': 'bg-zinc-800',
  'standoff-brass': 'bg-amber-600',
  hidden: 'bg-slate-600 border-dashed',
  cables: 'bg-zinc-400',
}

// Trous dont le capuchon ou la zone de serrage touche une découpe du motif ou du texte
function useHoleConflicts(state) {
  const design = designFromState(state)
  const key = JSON.stringify(design)
  const [conflicts, setConflicts] = useState([])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      findHoleConflicts(design, design.holes, clearanceRadiusCm(state.mounting))
        .then(list => { if (!cancelled) setConflicts(list) })
        .catch(() => { if (!cancelled) setConflicts([]) })
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return conflicts
}

// Largeur du halo direct autour du panneau (cm, au demi-centimètre) pour un déport donné : calculée
// avec la matière (bords du U) et le ruban choisis, comme la vue 3D
function haloReachCm(depthMm, material, lightModel) {
  const profile = panelProfile(material)
  const section = stripSection(lightModel)
  const reach = directHaloReach({
    gap: depthMm / 1000,
    rim: profile.rimMm / 1000,
    rimDepth: (profile.depthMm - profile.faceMm) / 1000,
    stripW: section.widthMm / 1000,
    stripH: section.heightMm / 1000,
    emitW: (section.widthMm / 1000) * EMITTING_SHARE,
  })
  return Math.round(reach * 200) / 2
}

// Étape « Pose » : emplacement, fixation, déport, alimentation
export default function FixingSelector() {
  const state = useConfiguratorStore()
  const {
    placement, setPlacement, mounting, setMounting, standoffDepth, setStandoffDepth,
    powerCable, setPowerCable, exploded, setExploded, width, height,
  } = state
  const fixing = getFixing(mounting)
  const points = computeFixingPoints(width || 60, height || 30)
  const conflicts = useHoleConflicts(state)

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <SubTitle>Emplacement</SubTitle>
        <Segmented options={PLACEMENTS} value={placement} onChange={setPlacement} label="Emplacement du panneau" />
      </section>

      <section className="flex flex-col gap-3">
        <SubTitle hint="Le kit de pose est fourni avec le panneau.">Fixation</SubTitle>
        {fixingsForPlacement(placement).map(f => (
          <OptionCard
            key={f.id}
            active={mounting === f.id}
            onClick={() => setMounting(f.id)}
            leading={<span className={`w-8 h-8 rounded-full flex-shrink-0 border border-slate-500 ${SWATCH[f.id] ?? 'bg-slate-500'}`} />}
            title={f.label}
            subtitle={f.description}
            aside="Inclus"
          />
        ))}

        {/* Perçage et contenu du kit : ce que l'atelier découpe et ce que le client reçoit */}
        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">Perçage</span>
            <span className="text-slate-300 text-right">
              {fixing.holeDiameterMm
                ? `${points.length} trous Ø ${fixing.holeDiameterMm} mm à ${HOLE_INSET_CM} cm des bords`
                : 'Aucun trou en façade'}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">Kit fourni</span>
            <span className="text-slate-300 text-right">{describeKit(mounting, points.length, standoffDepth)}</span>
          </div>
        </div>

        {conflicts.length > 0 && (
          <div className="bg-amber-900/30 border border-amber-700/40 text-amber-300 text-sm rounded-2xl px-4 py-3 flex flex-col gap-1">
            {conflicts.map(c => (
              <p key={`${c.x}${c.y}`}>⚠️ La fixation {describePoint(c)} touche le motif ou le texte.</p>
            ))}
            <p className="text-amber-400/80">Réduisez ou décalez le motif (étape Personnaliser), ou choisissez la fixation invisible.</p>
          </div>
        )}
      </section>

      {fixing.kind !== 'cable' && (
        <section className="flex flex-col gap-3">
          <SubTitle hint="Plus le panneau est décollé, plus le halo lumineux s’étale.">Déport</SubTitle>
          <Segmented
            options={STANDOFF_DEPTHS_MM.map(mm => ({ id: mm, label: `${mm} mm` }))}
            value={standoffDepth}
            onChange={setStandoffDepth}
            label="Distance au support"
          />
          <p className="text-sm text-slate-400">
            Halo d’environ {haloReachCm(standoffDepth, state.material, state.lightModel).toLocaleString('fr-FR')} cm
            autour du panneau : les bords du U arrêtent la lumière qui part plus loin.
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <SubTitle>Alimentation</SubTitle>
        {placement === 'wall' ? (
          <>
            <Segmented options={POWER_OPTIONS} value={powerCable} onChange={setPowerCable} label="Alimentation" />
            <p className="text-sm text-slate-400">{POWER_OPTIONS.find(o => o.id === powerCable)?.description}</p>
          </>
        ) : (
          <p className="text-sm text-slate-400">Raccordement au point lumineux du plafond (boîte DCL), caché par le panneau.</p>
        )}
      </section>

      {placement !== 'pendant' && (
        <button
          type="button"
          onClick={() => setExploded(!exploded)}
          aria-pressed={exploded}
          className={`w-full py-3 rounded-full text-sm font-medium border transition-colors ${exploded ? 'bg-amber-400 text-black border-amber-400' : 'bg-slate-800/60 text-slate-200 border-slate-600 hover:border-slate-400'}`}
        >
          {exploded ? '✓ Vue éclatée (cliquez pour remonter)' : '🔍 Vue éclatée : voir comment tout s’assemble'}
        </button>
      )}
    </div>
  )
}
