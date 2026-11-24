import { useConfiguratorStore } from '../../store/configuratorStore'

// Police pochoir proposée quand l'intérieur des lettres tomberait
export const STENCIL_FONT = 'Saira Stencil One'

const plural = (n, one, many) => (n > 1 ? many : one)
// « en haut, à gauche et en bas »
const listSides = sides => (sides.length > 1 ? `${sides.slice(0, -1).join(', ')} et ${sides.at(-1)}` : sides[0] ?? '')
const cmLabel = mm => `${String(Math.ceil(mm) / 10).replace('.', ',')} cm`

// Bande du ruban : ce qui y entre, et comment le sortir (réduction automatique du motif quand elle suffit)
export function StripBandNotice({ band, onFixScale, className = '' }) {
  const who = band.motifInBand && band.textInBand ? 'Le motif et le texte entrent' : band.textInBand ? 'Le texte entre' : 'Le motif entre'
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <p className="text-sky-200/90">
        {who} dans la bande de {cmLabel(band.bandMm)} réservée au ruban, {listSides(band.sides)} (en bleu) :
        le ruban s’y colle au dos du panneau et se verrait à travers la découpe.
        {!band.fixScale && band.motifInBand && ' Réduisez ou recentrez le motif.'}
        {band.textInBand && ' Rapprochez le texte du centre ou réduisez-le.'}
      </p>
      {band.fixScale && onFixScale && (
        <button
          type="button"
          onClick={() => onFixScale(band.fixScale)}
          className="self-start px-2 py-1 rounded-md bg-sky-400 text-slate-950 font-semibold hover:bg-sky-300"
        >
          Réduire le motif à {band.fixScale} %
        </button>
      )}
    </div>
  )
}

// Carte « Contrôle de fabrication » : ce qui tomberait, ce qui serait fragile, et comment corriger
export default function FabricationCheck() {
  const { cutCheck, showCutCheck, setShowCutCheck, setTextFont, textFont, setMotifTransform } = useConfiguratorStore()

  if (!cutCheck || (!cutCheck.status && cutCheck.pending)) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-xs text-slate-400">
        Contrôle de découpe en cours…
      </div>
    )
  }
  if (cutCheck.status === 'error') {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-xs text-slate-400">
        Contrôle de découpe indisponible pour ce motif.
      </div>
    )
  }

  const { status, islands = [], fragile = [], thin = [], textIslands = 0, stripBand = null, autoFit = null, minBridgeMm, pending } = cutCheck
  const motifIslands = islands.length - textIslands
  const tone = status === 'ok'
    ? 'border-emerald-700/50 bg-emerald-900/20 text-emerald-300'
    : status === 'bad'
      ? 'border-red-700/50 bg-red-900/20 text-red-300'
      : 'border-amber-700/50 bg-amber-900/20 text-amber-300'

  const title = status === 'ok'
    ? '✓ Prêt pour la découpe'
    : status === 'bad'
      ? `⚠ ${islands.length} ${plural(islands.length, 'morceau tomberait', 'morceaux tomberaient')} à la découpe`
      : stripBand
        ? '⚠ Découpe dans la bande du ruban'
        : '⚠ Découpe fragile par endroits'

  return (
    <div className={`rounded-lg border p-3 text-xs flex flex-col gap-2 transition-opacity ${tone} ${pending ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{title}</span>
        {status !== 'ok' && (
          <button
            onClick={() => setShowCutCheck(!showCutCheck)}
            className="flex-shrink-0 px-2 py-1 rounded-md bg-slate-900/60 border border-slate-600 text-slate-200 hover:border-slate-400"
          >
            {showCutCheck ? 'Masquer' : 'Voir sur le panneau'}
          </button>
        )}
      </div>

      {status === 'ok' && (
        <p className="text-emerald-200/70">
          Aucun morceau ne tombe, aucun passage plus fin que {minBridgeMm} mm, rien dans la bande du ruban le long des bords.
        </p>
      )}

      {motifIslands > 0 && (
        <p className="text-red-200/90">
          Le motif contient {motifIslands} {plural(motifIslands, 'partie entièrement entourée', 'parties entièrement entourées')} de
          découpe (en rouge) : {plural(motifIslands, 'elle tomberait', 'elles tomberaient')}. Les motifs du catalogue et ceux
          de l’onglet « Créer » sont garantis sans ce problème.
        </p>
      )}

      {textIslands > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-red-200/90">
            Le texte a {textIslands} {plural(textIslands, 'lettre dont l’intérieur tomberait', 'lettres dont l’intérieur tomberait')} (O, A, e…).
          </p>
          {textFont !== STENCIL_FONT && (
            <button
              onClick={() => setTextFont(STENCIL_FONT)}
              className="self-start px-2 py-1 rounded-md bg-amber-400 text-black font-semibold hover:bg-amber-300"
            >
              Utiliser une police pochoir
            </button>
          )}
        </div>
      )}

      {fragile.length > 0 && (
        <p className="text-amber-200/90">
          {fragile.length} {plural(fragile.length, 'partie ne tient', 'parties ne tiennent')} que par un passage de moins
          de {minBridgeMm} mm (en orange) : agrandissez le texte ou le motif, ou épaississez les ponts.
        </p>
      )}

      {stripBand && <StripBandNotice band={stripBand} onFixScale={v => setMotifTransform({ motifScale: v })} />}

      {autoFit && !stripBand && (
        <p className="text-sky-200/80">
          Motif réglé à {autoFit.to} % (au lieu de {autoFit.from} %) pour laisser libre la bande du ruban, le long des bords.
        </p>
      )}

      {thin.length > 0 && (
        <p className="text-amber-200/90">
          {thin.length} {plural(thin.length, 'zone de matière est', 'zones de matière sont')} plus {plural(thin.length, 'fine', 'fines')} que
          {' '}{minBridgeMm} mm (en jaune) : risque de casse ou de brûlure.
        </p>
      )}
    </div>
  )
}
