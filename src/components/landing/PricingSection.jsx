import { Link } from 'react-router-dom'
import { SIZE_PRESETS, CUSTOM_LIMITS } from '../../lib/sizes'
import { SIZE_BASE, CUSTOM_MIN_PRICE, OPTION_PRICES } from '../../lib/computePrice'
import { FREE_SHIPPING_FR } from '../../lib/shippingCalc'
import { formatEuros } from '../../lib/formatEuros'
import { hueFromPrice, materialSurchargeRange } from '../../lib/landingFacts'

// Tarifs de l'accueil : mêmes chiffres que le studio et que le serveur de commande
export default function PricingSection() {
  const [minMat, maxMat] = materialSurchargeRange()
  const options = [
    ['Matière fumée, bois ou MDF', `+${formatEuros(minMat)} à +${formatEuros(maxMat)}`],
    ['Ruban Philips Hue (couleurs, dégradés)', `dès +${formatEuros(hueFromPrice())}`],
    ['Emballage cadeau', `+${formatEuros(OPTION_PRICES.giftWrap)}`],
    ['Variateur (ruban blanc)', `+${formatEuros(OPTION_PRICES.dimmer)}`],
  ]

  return (
    <section id="tarifs" className="scroll-mt-20 bg-slate-950 px-4 sm:px-8 py-24 lg:py-32">
      <div className="max-w-6xl mx-auto">
        <p className="text-sm font-semibold text-amber-400">Tarifs</p>
        <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight text-white">Un prix clair, éclairage compris.</h2>
        <p className="mt-4 max-w-2xl text-lg text-slate-400">
          Chaque panneau est livré avec son ruban LED blanc et son kit de pose. Prix TTC.
        </p>

        <ul className="mt-12 grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {SIZE_PRESETS.map(p => (
            <li key={p.id} className="rounded-3xl bg-white/[0.04] ring-1 ring-white/10 p-5 sm:p-6 flex flex-col">
              <span className="text-4xl font-semibold text-white">{p.id}</span>
              <span className="mt-1 text-sm text-slate-400">{p.width} × {p.height} cm</span>
              <span className="mt-1 text-sm text-slate-500">{p.hint}</span>
              <span className="mt-6 text-2xl font-semibold text-amber-300">{formatEuros(SIZE_BASE[p.id])}</span>
            </li>
          ))}
          <li className="col-span-2 lg:col-span-1 rounded-3xl bg-amber-400/[0.07] ring-1 ring-amber-400/30 p-5 sm:p-6 flex flex-col">
            <span className="text-2xl sm:text-3xl font-semibold text-white">Sur mesure</span>
            <span className="mt-1 text-sm text-slate-400">
              De {CUSTOM_LIMITS.width[0]} × {CUSTOM_LIMITS.height[0]} à {CUSTOM_LIMITS.width[1]} × {CUSTOM_LIMITS.height[1]} cm
            </span>
            <span className="mt-1 text-sm text-slate-500">Prix selon la surface</span>
            <span className="mt-6 text-2xl font-semibold text-amber-300">dès {formatEuros(CUSTOM_MIN_PRICE)}</span>
          </li>
        </ul>

        <div className="mt-10 grid lg:grid-cols-2 gap-6">
          <div className="rounded-3xl ring-1 ring-white/10 p-6">
            <h3 className="text-lg font-semibold text-white">Inclus dans chaque panneau</h3>
            <ul className="mt-4 space-y-2 text-slate-300">
              <li>✓ Découpe laser du motif et du texte</li>
              <li>✓ Ruban LED blanc : chaud, neutre ou froid</li>
              <li>✓ Kit de pose (entretoises, fixation invisible ou câbles)</li>
              <li>✓ Contrôle de découpe en direct dans le studio</li>
            </ul>
          </div>
          <div className="rounded-3xl ring-1 ring-white/10 p-6">
            <h3 className="text-lg font-semibold text-white">Options</h3>
            <ul className="mt-4 space-y-2">
              {options.map(([label, price]) => (
                <li key={label} className="flex justify-between gap-4 text-slate-300">
                  <span>{label}</span>
                  <span className="text-slate-100 whitespace-nowrap">{price}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-slate-400">Livraison offerte en France dès {formatEuros(FREE_SHIPPING_FR)}.</p>
          <Link to="/studio" className="rounded-full bg-amber-400 hover:bg-amber-300 text-black font-semibold px-6 py-3 transition-colors">
            Composer mon panneau
          </Link>
        </div>
      </div>
    </section>
  )
}
