import { useConfiguratorStore } from '../../store/configuratorStore'
import {
  LIGHT_MODELS, STANDARD_WHITES, COLOR_PRESETS, GRADIENT_PRESETS, HUE_WHITE_RANGE, HUE_CONNECTIVITY,
  PRICES_CHECKED, DEFAULT_HUE_MODEL, lightingFor,
} from '../../lib/lighting/lightingCatalog'
import { kelvinToHex } from '../../lib/lighting/colorTemperature'

const euros = v => `${v.toFixed(2).replace('.', ',')} €`
const cm = v => `${String(Math.round(v * 10) / 10).replace('.', ',')} cm`

function SectionTitle({ children }) {
  return <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{children}</div>
}

// Choix principal : sans couleur (LED blanche) ou avec couleur (Philips Hue)
function FamilyCard({ active, title, subtitle, price, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-start gap-1 p-2.5 rounded-lg border-2 text-left transition-all ${active ? 'border-amber-400 bg-amber-400/5' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'}`}
    >
      <div className="flex items-center gap-1.5">
        {children}
        <span className="text-sm font-semibold text-slate-100">{title}</span>
      </div>
      <span className="text-[11px] leading-snug text-slate-400">{subtitle}</span>
      <span className={`text-[11px] font-semibold ${active ? 'text-amber-400' : 'text-slate-300'}`}>{price}</span>
    </button>
  )
}

// Pastille de couleur (fond calculé : seule exception autorisée au style en ligne)
function Dot({ background, className = 'w-3.5 h-3.5' }) {
  return <span className={`inline-block rounded-full ring-1 ring-white/20 flex-shrink-0 ${className}`} style={{ background }} />
}

// Ruban standard : trois blancs, fixés à la fabrication
function StandardWhites({ kelvin, onPick }) {
  return (
    <div className="flex flex-col gap-2">
      <SectionTitle>Teinte du blanc</SectionTitle>
      <div className="grid grid-cols-3 gap-1.5">
        {STANDARD_WHITES.map(w => (
          <button
            key={w.id}
            onClick={() => onPick(w.id)}
            aria-pressed={kelvin === w.kelvin}
            className={`flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition-all ${kelvin === w.kelvin ? 'border-amber-400 bg-amber-400/5' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'}`}
          >
            <Dot background={kelvinToHex(w.kelvin)} className="w-6 h-6" />
            <span className="text-[11px] text-slate-200 capitalize">{w.label.replace('Blanc ', '')}</span>
            <span className="text-[10px] font-mono text-slate-500">{w.kelvin} K</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        Ruban LED blanc, non connecté : la teinte choisie est fixée à la fabrication.
      </p>
    </div>
  )
}

// Modèles Philips Hue, avec le prix du ruban qu'il faut pour ce panneau
function HueModels({ state, onPick }) {
  return (
    <div className="flex flex-col gap-2">
      <SectionTitle>Modèle Philips Hue</SectionTitle>
      {LIGHT_MODELS.filter(m => m.hue).map(m => {
        const l = lightingFor({ ...state, lightModel: m.id })
        const active = state.lightModel === m.id
        return (
          <button
            key={m.id}
            onClick={() => onPick(m.id)}
            aria-pressed={active}
            className={`flex flex-col gap-0.5 p-2.5 rounded-lg border-2 text-left transition-all ${active ? 'border-amber-400 bg-amber-400/5' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-slate-100">{m.name.replace('Philips Hue ', '')}</span>
              <span className={`text-xs font-semibold ${active ? 'text-amber-400' : 'text-slate-300'}`}>+{euros(l.price)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2 text-[11px] text-slate-500">
              <span>{m.tier}</span>
              <span>ruban {l.lengthM} m{l.length.lumens ? ` · ${l.length.lumens.toLocaleString('fr-FR')} lm` : ''}</span>
            </div>
            {active && <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{m.summary}</p>}
          </button>
        )
      })}
    </div>
  )
}

// Fiche du ruban pour ce panneau : longueur, coupe, lumière, connexion
function HueSheet({ lighting }) {
  const { model, lengthM, cutCm, insetCm, lumens } = lighting
  return (
    <div className="flex flex-col gap-1.5 bg-slate-900/60 rounded-lg p-3 border border-slate-700 text-[11px] text-slate-400 leading-relaxed">
      <div className="text-xs font-semibold text-slate-300">Pour ce panneau</div>
      <p>
        Ruban de {lengthM} m, coupé à {cm(cutCm)}
        {model.cutStepCm ? ` (repères tous les ${cm(model.cutStepCm)})` : ' aux repères les plus proches'},
        {' '}collé au dos à {cm(insetCm)} du bord.
      </p>
      <p>{lumens ? `Environ ${lumens.toLocaleString('fr-FR')} lumens sur ce panneau.` : 'Luminosité non communiquée par Philips.'}</p>
      <p>{HUE_CONNECTIVITY}</p>
      <p className="text-slate-500">Prix public Philips Hue, relevé en {PRICES_CHECKED}.</p>
    </div>
  )
}

const MODES = [
  { id: 'white', label: 'Blanc' },
  { id: 'color', label: 'Couleur' },
  { id: 'gradient', label: 'Dégradé' },
]

// Aperçu de l'ambiance : le client choisira librement dans l'application Hue
function HuePreview({ state }) {
  const { ledMode, ledKelvin, ledColor, ledPreset, ledGradient, lightModel, setLedMode, setLedKelvin, setLedPreset, setLedColor, setLedGradientStop } = state
  const model = LIGHT_MODELS.find(m => m.id === lightModel)
  const kelvinTrack = `linear-gradient(90deg, ${[2200, 3000, 4000, 5000, 6500].map(kelvinToHex).join(', ')})`
  return (
    <div className="flex flex-col gap-2.5">
      <SectionTitle>Aperçu de l'ambiance</SectionTitle>
      <p className="text-[11px] text-slate-400 leading-relaxed -mt-1">
        Vous changerez la couleur quand vous voudrez, dans l'application Hue. Ici, un aperçu.
      </p>
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
        {MODES.map(o => (
          <button
            key={o.id}
            onClick={() => setLedMode(o.id)}
            aria-pressed={ledMode === o.id}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${ledMode === o.id ? 'bg-amber-400 text-black' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {ledMode === 'white' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Température</span>
            <span className="text-amber-400 font-mono">{ledKelvin} K</span>
          </div>
          <input
            type="range"
            min={HUE_WHITE_RANGE[0]}
            max={HUE_WHITE_RANGE[1]}
            step={100}
            value={ledKelvin}
            onChange={e => setLedKelvin(Number(e.target.value))}
            aria-label="Température du blanc"
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{ background: kelvinTrack }}
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Chaud</span>
            <span>Froid</span>
          </div>
          {model?.whiteLeds === false && (
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              Pas de LED blanches sur ce modèle : le blanc réel tire légèrement sur la couleur.
            </p>
          )}
        </div>
      )}

      {ledMode === 'color' && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-5 gap-1.5">
            {COLOR_PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => setLedPreset(p.id)}
                title={p.label}
                aria-label={p.label}
                aria-pressed={ledPreset === p.id}
                className={`aspect-square rounded-lg border-2 transition-all ${ledPreset === p.id ? 'border-white scale-105' : 'border-transparent hover:border-slate-500'}`}
                style={{ background: p.color }}
              />
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="color"
              value={ledColor}
              onChange={e => setLedColor(e.target.value)}
              className="w-8 h-8 rounded-md border border-slate-600 bg-transparent cursor-pointer"
            />
            {ledPreset === 'custom' ? 'Couleur personnalisée' : (COLOR_PRESETS.find(p => p.id === ledPreset)?.label ?? 'Autre couleur…')}
          </label>
        </div>
      )}

      {ledMode === 'gradient' && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-1.5">
            {GRADIENT_PRESETS.map(g => (
              <button
                key={g.id}
                onClick={() => setLedPreset(g.id)}
                aria-pressed={ledPreset === g.id}
                className={`flex flex-col gap-1 p-1.5 rounded-lg border-2 text-left transition-all ${ledPreset === g.id ? 'border-amber-400 bg-amber-400/5' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'}`}
              >
                <span className="h-2.5 w-full rounded-full" style={{ background: `linear-gradient(90deg, ${g.colors.join(', ')})` }} />
                <span className="text-[11px] text-slate-300">{g.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Couleurs</span>
            {ledGradient.map((c, i) => (
              <input
                key={i}
                type="color"
                value={c}
                onChange={e => setLedGradientStop(i, e.target.value)}
                aria-label={`Couleur ${i + 1} du dégradé`}
                className="w-8 h-8 rounded-md border border-slate-600 bg-transparent cursor-pointer"
              />
            ))}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Plusieurs couleurs à la fois le long du ruban (fonction dégradé des rubans Hue).
          </p>
        </div>
      )}
    </div>
  )
}

// Section « Éclairage » du studio : sans couleur (LED blanche incluse) ou ruban Philips Hue
export default function LightingSelector() {
  const state = useConfiguratorStore()
  const { setLightModel, setLedPreset, ledKelvin } = state
  const lighting = lightingFor(state)
  const hueFrom = Math.min(...LIGHT_MODELS.filter(m => m.hue).map(m => lightingFor({ ...state, lightModel: m.id }).price))

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Éclairage</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <FamilyCard
          active={!lighting.hue}
          title="Blanc fixe"
          subtitle="Sans couleur, sans application"
          price="Inclus"
          onClick={() => setLightModel('standard')}
        >
          <Dot background={kelvinToHex(2700)} />
        </FamilyCard>
        <FamilyCard
          active={lighting.hue}
          title="Philips Hue"
          subtitle="Couleurs et dégradés depuis l'app"
          price={`dès +${euros(hueFrom)}`}
          onClick={() => { if (!lighting.hue) setLightModel(DEFAULT_HUE_MODEL) }}
        >
          <Dot background="conic-gradient(#ff5f5f, #ffd25f, #5fff8f, #5fc8ff, #b05fff, #ff5f5f)" />
        </FamilyCard>
      </div>

      {!lighting.hue && <StandardWhites kelvin={ledKelvin} onPick={setLedPreset} />}

      {lighting.hue && (
        <>
          <HueModels state={state} onPick={setLightModel} />
          <HueSheet lighting={lighting} />
          <HuePreview state={state} />
        </>
      )}
    </div>
  )
}
