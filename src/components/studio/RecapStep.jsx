import { useConfiguratorStore } from '../../store/configuratorStore'
import { computePrice, OPTION_PRICES } from '../../lib/computePrice'
import { formatEuros, formatSurcharge } from '../../lib/formatEuros'
import { motifLabel } from '../../lib/panelDesign'
import { materialLabel } from '../../lib/materials'
import { getFixing } from '../../lib/fixings'
import { getPlacementLabel } from '../../lib/rooms'
import { isLibraryMotif } from '../../lib/library/libraryClient'
import { CUT_STYLES } from '../../lib/library/cutStyles'
import { lightingSummary, isHueModel, GRADIENT_PRESETS, COLOR_PRESETS } from '../../lib/lighting/lightingCatalog'
import { kelvinToHex } from '../../lib/lighting/colorTemperature'
import { PANEL_DEPTH_MM } from '../../lib/panelProfile'
import { SubTitle, OptionCard } from './StepUI'
import DeliveryEstimate from './DeliveryEstimate'
import ShareDesignButton from './ShareDesignButton'

// Le ruban part dans le colis, non posé : le client le colle lui-même au dos du panneau
const STRIP_NOTE = 'Livré non posé, à coller au dos du panneau'

// Pastille de l'éclairage : blanc (selon sa température), couleur ou dégradé
function LightSwatch({ state }) {
  const { ledMode, ledColor, ledGradient, ledKelvin } = state
  const background = ledMode === 'gradient'
    ? `linear-gradient(90deg, ${ledGradient.join(', ')})`
    : ledMode === 'white' ? kelvinToHex(ledKelvin) : ledColor
  return <span className="inline-block align-middle w-3.5 h-3.5 rounded-full ring-1 ring-white/20 ml-1.5" style={{ background }} />
}

// Ambiance affichée en aperçu avec un ruban Hue (le client la change ensuite dans l'application)
function huePreviewLabel({ ledMode, ledKelvin, ledPreset }) {
  if (ledMode === 'white') return `aperçu en blanc ${ledKelvin} K`
  if (ledMode === 'gradient') return `aperçu « ${GRADIENT_PRESETS.find(g => g.id === ledPreset)?.label ?? 'dégradé personnalisé'} »`
  return `aperçu « ${COLOR_PRESETS.find(p => p.id === ledPreset)?.label ?? 'couleur personnalisée'} »`
}

// Case à cocher d'une option
function Check({ on }) {
  return (
    <span className={`w-6 h-6 flex-shrink-0 rounded-md border grid place-items-center text-sm font-bold ${on ? 'bg-amber-400 border-amber-400 text-black' : 'border-slate-500'}`}>
      {on ? '✓' : ''}
    </span>
  )
}

// État du contrôle de découpe, avec un raccourci vers l'étape qui permet de corriger
function CutStatus({ onStep }) {
  const cutCheck = useConfiguratorStore(s => s.cutCheck)
  if (!cutCheck?.status || cutCheck.status === 'error') return null
  if (cutCheck.status === 'ok') {
    return (
      <div className="rounded-2xl border border-emerald-700/50 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200">
        ✓ Découpe vérifiée : aucun morceau ne tombe, rien dans la bande du ruban.
      </div>
    )
  }
  // Bande du ruban : le motif se réduit ou se déplace, le texte se déplace, à l'étape Personnaliser
  const fixStep = cutCheck.textIslands > 0 || (cutCheck.status !== 'bad' && cutCheck.stripBand) ? 'custom' : 'motif'
  const message = cutCheck.status === 'bad'
    ? '⚠ Des morceaux tomberaient à la découpe.'
    : cutCheck.stripBand
      ? '⚠ Le motif ou le texte entre dans la bande réservée au ruban, le long des bords.'
      : '⚠ Découpe fragile par endroits.'
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm flex items-center justify-between gap-3 ${cutCheck.status === 'bad' ? 'border-red-700/50 bg-red-900/20 text-red-200' : 'border-amber-700/50 bg-amber-900/20 text-amber-200'}`}>
      <span>{message}</span>
      <button type="button" onClick={() => onStep(fixStep)} className="flex-shrink-0 font-semibold underline underline-offset-2">
        Corriger
      </button>
    </div>
  )
}

// Étape « Résumé » : chaque choix avec son prix et un lien pour le modifier, les options, le total
export default function RecapStep({ onStep }) {
  const state = useConfiguratorStore()
  const {
    material, sizePreset, width, height, showText, textContent, textSecondary,
    placement, mounting, standoffDepth, motifId, libraryStyles, cutStyle,
    giftWrap, toggleGiftWrap, dimmer, toggleDimmer,
  } = state
  const price = computePrice(state)
  const hue = isHueModel(state.lightModel)
  const fixing = getFixing(mounting)
  const style = isLibraryMotif(motifId) && libraryStyles !== false
    ? (CUT_STYLES.find(s => s.id === cutStyle) ?? CUT_STYLES[1])
    : null

  const rows = [
    { step: 'motif', label: 'Motif', value: style ? `${motifLabel(state)} · style ${style.label.toLowerCase()}` : motifLabel(state) },
    {
      step: 'custom',
      label: 'Texte',
      value: showText && textContent ? `« ${textContent} »${textSecondary ? ` · ${textSecondary}` : ''}` : 'Sans texte',
    },
    {
      step: 'size',
      label: 'Format',
      value: `${sizePreset !== 'custom' ? sizePreset : 'Sur mesure'} · ${width} × ${height} cm`,
      amount: formatEuros(price.base),
    },
    { step: 'material', label: 'Matériau', value: `${materialLabel(material)} · panneau en U de ${PANEL_DEPTH_MM / 10} cm`, amount: formatSurcharge(price.material) },
    {
      step: 'led',
      label: 'Éclairage',
      value: hue ? (
        <>
          {lightingSummary(state)}
          <span className="block text-slate-400">{huePreviewLabel(state)}<LightSwatch state={state} /></span>
          <span className="block text-slate-400">{STRIP_NOTE}</span>
        </>
      ) : (
        <>
          {lightingSummary(state)}<LightSwatch state={state} />
          <span className="block text-slate-400">{STRIP_NOTE}</span>
        </>
      ),
      amount: formatSurcharge(price.lighting),
    },
    {
      step: 'fixing',
      label: 'Pose',
      value: `${getPlacementLabel(placement)} · ${fixing.label}${fixing.kind !== 'cable' ? ` · déport ${standoffDepth} mm` : ''}`,
      amount: 'Inclus',
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <CutStatus onStep={onStep} />

      <ul className="rounded-2xl border border-slate-800 divide-y divide-slate-800">
        {rows.map(r => (
          <li key={r.step} className="flex items-start gap-3 px-4 py-3.5">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500">{r.label}</div>
              <div className="text-sm text-slate-100 leading-snug break-words">{r.value}</div>
            </div>
            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
              {r.amount && <span className="text-sm text-slate-300 tabular-nums">{r.amount}</span>}
              <button
                type="button"
                onClick={() => onStep(r.step)}
                aria-label={`Modifier : ${r.label}`}
                className="text-sm text-amber-400 hover:text-amber-300 hover:underline"
              >
                Modifier
              </button>
            </div>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3">
        <SubTitle hint="À ajouter ou retirer librement avant la commande.">Options</SubTitle>
        <OptionCard
          active={giftWrap}
          onClick={toggleGiftWrap}
          leading={<Check on={giftWrap} />}
          title="Emballage cadeau"
          subtitle="Emballage luxe, prêt à offrir."
          aside={`+${formatEuros(OPTION_PRICES.giftWrap)}`}
          compact
        />
        {hue ? (
          <p className="text-sm text-slate-400">
            Avec Philips Hue, l’intensité se règle dans l’application : pas besoin de variateur.
          </p>
        ) : (
          <OptionCard
            active={dimmer}
            onClick={toggleDimmer}
            leading={<Check on={dimmer} />}
            title="Variateur de luminosité"
            subtitle="Pour changer d’ambiance."
            aside={`+${formatEuros(OPTION_PRICES.dimmer)}`}
            compact
          />
        )}
      </section>

      <section className="rounded-2xl bg-slate-800/50 border border-slate-800 p-4 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-slate-300">Total TTC</span>
          <span className="text-2xl font-semibold tabular-nums text-white">{formatEuros(price.total, { cents: true })}</span>
        </div>
        <p className="text-sm text-slate-400 -mt-1">
          {price.freeShipping ? 'Livraison offerte en France.' : 'Frais de livraison calculés au panier.'}
        </p>
        <DeliveryEstimate />
      </section>

      <ShareDesignButton />
    </div>
  )
}
