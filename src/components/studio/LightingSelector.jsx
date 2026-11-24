import { useConfiguratorStore } from '../../store/configuratorStore'
import {
  LIGHT_MODELS, STANDARD_WHITES, COLOR_PRESETS, GRADIENT_PRESETS, HUE_WHITE_RANGE, HUE_CONNECTIVITY,
  PRICES_CHECKED, DEFAULT_HUE_MODEL, lightingFor,
} from '../../lib/lighting/lightingCatalog'
import { kelvinToHex } from '../../lib/lighting/colorTemperature'
import { formatEuros } from '../../lib/formatEuros'
import { SubTitle, OptionCard, Segmented } from './StepUI'

const cm = v => `${String(Math.round(v * 10) / 10).replace('.', ',')} cm`

// Pastille de couleur (fond calculé : seule exception autorisée au style en ligne)
function Dot({ background, className = 'w-3.5 h-3.5' }) {
  return <span className={`inline-block rounded-full ring-1 ring-white/20 flex-shrink-0 ${className}`} style={{ background }} />
}

// Ruban standard : trois blancs, fixés à la fabrication
function StandardWhites({ kelvin, onPick }) {
  return (
    <section className="flex flex-col gap-3">
      <SubTitle hint="Ruban LED blanc, non connecté : la teinte choisie est fixée à la fabrication.">Teinte du blanc</SubTitle>
      <div className="grid grid-cols-3 gap-2">
        {STANDARD_WHITES.map(w => (
          <button
            key={w.id}
            type="button"
            onClick={() => onPick(w.id)}
            aria-pressed={kelvin === w.kelvin}
            className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-colors ${kelvin === w.kelvin ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-400/[0.06]' : 'border-slate-700 bg-slate-800/40 hover:border-slate-500'}`}
          >
            <Dot background={kelvinToHex(w.kelvin)} className="w-8 h-8" />
            <span className="text-sm text-slate-100 capitalize">{w.label.replace('Blanc ', '')}</span>
            <span className="text-xs font-mono text-slate-500">{w.kelvin} K</span>
          </button>
        ))}
      </div>
    </section>
  )
}

// Modèles Philips Hue, avec le prix du ruban qu'il faut pour ce panneau
function HueModels({ state, onPick }) {
  return (
    <section className="flex flex-col gap-3">
      <SubTitle hint="Prix du ruban à la longueur qu’il faut pour ce panneau.">Modèle Philips Hue</SubTitle>
      {LIGHT_MODELS.filter(m => m.hue).map(m => {
        const l = lightingFor({ ...state, lightModel: m.id })
        const active = state.lightModel === m.id
        return (
          <OptionCard
            key={m.id}
            active={active}
            onClick={() => onPick(m.id)}
            title={m.name.replace('Philips Hue ', '')}
            subtitle={`${m.tier} · ruban ${l.lengthM} m${l.length.lumens ? ` · ${l.length.lumens.toLocaleString('fr-FR')} lm` : ''}`}
            aside={`+${formatEuros(l.price)}`}
          >
            {active && <span className="block mt-2 text-sm text-slate-400 leading-relaxed">{m.summary}</span>}
          </OptionCard>
        )
      })}
    </section>
  )
}

// Fiche du ruban pour ce panneau : longueur, coupe, lumière, connexion
function HueSheet({ lighting }) {
  const { model, lengthM, cutCm, lumens } = lighting
  return (
    <div className="flex flex-col gap-1.5 bg-slate-950/50 rounded-2xl p-4 border border-slate-800 text-sm text-slate-400 leading-relaxed">
      <div className="font-semibold text-slate-200">Pour ce panneau</div>
      <p>
        Ruban de {lengthM} m, à garder sur {cm(cutCm)}
        {model.cutStepCm ? ` (repères tous les ${cm(model.cutStepCm)})` : ' (coupe au repère le plus proche)'},
        {' '}à coller au fond du creux, contre le bord.
      </p>
      <p>{lumens ? `Environ ${lumens.toLocaleString('fr-FR')} lumens sur ce panneau.` : 'Luminosité non communiquée par Philips.'}</p>
      <p>{HUE_CONNECTIVITY}</p>
      <p className="text-xs text-slate-500">Prix public Philips Hue, relevé en {PRICES_CHECKED}.</p>
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
    <section className="flex flex-col gap-3">
      <SubTitle hint="Vous changerez la couleur quand vous voudrez, dans l’application Hue. Ici, un aperçu.">
        Aperçu de l’ambiance
      </SubTitle>
      <Segmented options={MODES} value={ledMode} onChange={setLedMode} label="Type d’ambiance" />

      {ledMode === 'white' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-300">Température</span>
            <span className="text-amber-300 font-mono">{ledKelvin} K</span>
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
          <div className="flex justify-between text-xs text-slate-500">
            <span>Chaud</span>
            <span>Froid</span>
          </div>
          {model?.whiteLeds === false && (
            <p className="text-sm text-amber-300/80 leading-relaxed">
              Pas de LED blanches sur ce modèle : le blanc réel tire légèrement sur la couleur.
            </p>
          )}
        </div>
      )}

      {ledMode === 'color' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-5 gap-2">
            {COLOR_PRESETS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setLedPreset(p.id)}
                title={p.label}
                aria-label={p.label}
                aria-pressed={ledPreset === p.id}
                className={`aspect-square rounded-2xl border-2 transition-all ${ledPreset === p.id ? 'border-white scale-105' : 'border-transparent hover:border-slate-500'}`}
                style={{ background: p.color }}
              />
            ))}
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="color"
              value={ledColor}
              onChange={e => setLedColor(e.target.value)}
              className="w-10 h-10 rounded-xl border border-slate-600 bg-transparent cursor-pointer"
            />
            {ledPreset === 'custom' ? 'Couleur personnalisée' : (COLOR_PRESETS.find(p => p.id === ledPreset)?.label ?? 'Autre couleur…')}
          </label>
        </div>
      )}

      {ledMode === 'gradient' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {GRADIENT_PRESETS.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => setLedPreset(g.id)}
                aria-pressed={ledPreset === g.id}
                className={`flex flex-col gap-2 p-3 rounded-2xl border text-left transition-colors ${ledPreset === g.id ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-400/[0.06]' : 'border-slate-700 bg-slate-800/40 hover:border-slate-500'}`}
              >
                <span className="h-3 w-full rounded-full" style={{ background: `linear-gradient(90deg, ${g.colors.join(', ')})` }} />
                <span className="text-sm text-slate-200">{g.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span>Couleurs</span>
            {ledGradient.map((c, i) => (
              <input
                key={i}
                type="color"
                value={c}
                onChange={e => setLedGradientStop(i, e.target.value)}
                aria-label={`Couleur ${i + 1} du dégradé`}
                className="w-10 h-10 rounded-xl border border-slate-600 bg-transparent cursor-pointer"
              />
            ))}
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Plusieurs couleurs à la fois le long du ruban (fonction dégradé des rubans Hue).
          </p>
        </div>
      )}
    </section>
  )
}

// Le ruban part dans le colis, non posé : le client le colle lui-même au dos du panneau en U
function StripDelivery() {
  return (
    <p className="text-sm text-slate-400 leading-relaxed">
      Le ruban est livré dans le colis, non posé. Le panneau est creusé en U au dos : vous collez le ruban au fond du creux,
      contre le bord, en partant de l’encoche du câble, puis vous le branchez. Une fois posé, il est invisible de face comme de profil.{' '}
      <a href="/pose" target="_blank" rel="noopener" className="text-amber-400 hover:text-amber-300 hover:underline underline-offset-2">
        Voir le guide de pose
      </a>
    </p>
  )
}

// Étape « Éclairage » : sans couleur (LED blanche incluse) ou ruban Philips Hue
export default function LightingSelector() {
  const state = useConfiguratorStore()
  const { setLightModel, setLedPreset, ledKelvin } = state
  const lighting = lightingFor(state)
  const hueFrom = Math.min(...LIGHT_MODELS.filter(m => m.hue).map(m => lightingFor({ ...state, lightModel: m.id }).price))

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <OptionCard
          active={!lighting.hue}
          onClick={() => setLightModel('standard')}
          leading={<Dot background={kelvinToHex(2700)} className="w-10 h-10" />}
          title="Blanc fixe"
          subtitle="Ruban LED blanc, sans application"
          aside="Inclus"
        />
        <OptionCard
          active={lighting.hue}
          onClick={() => { if (!lighting.hue) setLightModel(DEFAULT_HUE_MODEL) }}
          leading={<Dot background="conic-gradient(#ff5f5f, #ffd25f, #5fff8f, #5fc8ff, #b05fff, #ff5f5f)" className="w-10 h-10" />}
          title="Philips Hue"
          subtitle="Couleurs, blancs et dégradés depuis l’application"
          aside={`dès +${formatEuros(hueFrom)}`}
        />
      </div>

      <StripDelivery />

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
