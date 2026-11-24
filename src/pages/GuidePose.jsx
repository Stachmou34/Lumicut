import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import Header from '../components/shared/Header'
import Footer from '../components/shared/Footer'
import GlowPanel from '../components/guide/GlowPanel'
import UProfileDiagram from '../components/guide/UProfileDiagram'
import PanelBackView from '../components/guide/PanelBackView'
import StandoffExploded from '../components/guide/StandoffExploded'
import { PanelIcon, StripIcon, MountIcon } from '../components/guide/KitIcons'
import { hueCutTable, stripExample } from '../lib/guideFacts'
import { kelvinToHex } from '../lib/lighting/colorTemperature'
import { COLOR_PRESETS, HUE_CONNECTIVITY } from '../lib/lighting/lightingCatalog'
import { loadLibraryShapes } from '../lib/library/useLibraryShapes'

const cm = v => `${String(Math.round(v * 10) / 10).replace('.', ',')} cm`
const preset = id => COLOR_PRESETS.find(p => p.id === id).color

const CHAPTERS = [
  ['panneau', 'Le panneau'],
  ['colis', 'Le colis'],
  ['ruban', 'Le ruban'],
  ['mur', 'Au mur'],
  ['allumer', 'Allumer'],
]

const KIT = [
  { Icon: PanelIcon, title: 'Votre panneau en U', text: 'Découpé au laser et assemblé à l’atelier, avec le motif et la matière de votre choix.' },
  { Icon: StripIcon, title: 'Le ruban LED', text: 'Blanc, déjà coupé à la bonne longueur ; ou Philips Hue, dans sa boîte d’origine.' },
  { Icon: MountIcon, title: 'Le kit de pose', text: 'Entretoises inox, noires ou laiton, fixation invisible ou câbles, selon votre choix.' },
]

const STRIP_STEPS = [
  {
    step: 'empty',
    title: 'Retournez le panneau',
    text: () => 'Posez-le façade contre une surface douce et propre, une couverture par exemple, pour ne pas la rayer. Dépoussiérez le fond du creux avec un chiffon sec.',
  },
  {
    step: 'start',
    title: 'Partez de l’encoche',
    text: () => 'L’encoche, au milieu du bord du bas, laisse passer le câble. Placez-y le début du ruban, côté prise, le câble glissé dans l’encoche.',
  },
  {
    step: 'half',
    title: 'Collez contre le bord, tout autour',
    text: () => 'Retirez la protection de l’adhésif au fur et à mesure et collez le ruban au fond du creux, bien contre le bord, face lumineuse vers vous. Dans les angles, suivez la notice de votre ruban.',
  },
  {
    step: 'done',
    title: 'Arrêtez-vous au dernier repère',
    text: ex => `Le ruban ne se coupe que sur ses repères : il ne fait donc pas tout à fait le tour, et un petit espace reste près de l’encoche. C’est normal. En format S avec un Philips Hue Flux, on garde ${cm(ex.cutCm)} sur un tour de ${cm(ex.runCm)}.`,
  },
]

const MOUNT_STEPS = [
  { title: 'Marquez les trous', text: 'Présentez le panneau au mur, de niveau, et marquez les trous à travers la façade : ils sont à 3 cm des bords.' },
  { title: 'Vissez les entretoises', text: 'Percez, posez les chevilles, puis vissez les entretoises : elles traversent le creux jusqu’à la façade.' },
  { title: 'Posez le panneau', text: 'Branchez le ruban, présentez le panneau sur les entretoises et vissez les capuchons à travers la façade.' },
]

// Ambiances allumées : motifs réels de la bibliothèque, couleurs du catalogue
const AMBIANCES = [
  { motif: 'cerf-elaphe', color: kelvinToHex(2700), halo: 'bg-amber-300/45', label: 'LED blanche, blanc chaud 2700 K' },
  { motif: 'coq', color: preset('violet'), halo: 'bg-violet-400/40', label: 'Philips Hue, violet' },
  { motif: 'colibri', color: preset('blue'), halo: 'bg-blue-500/40', label: 'Philips Hue, bleu' },
]

// Apparition douce au défilement (aucune animation si le mouvement est réduit)
function Reveal({ children, className = '', delay = 0 }) {
  const reduced = useReducedMotion() ?? false
  if (reduced) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay }}
    >
      {children}
    </motion.div>
  )
}

function Section({ id, eyebrow, title, intro, children }) {
  return (
    <section id={id} className="scroll-mt-20 px-4 sm:px-8 py-20 lg:py-28 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <p className="text-sm font-semibold text-amber-400">{eyebrow}</p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight text-white text-balance">{title}</h2>
          {intro && <p className="mt-4 max-w-2xl text-lg text-slate-400 leading-relaxed">{intro}</p>}
        </Reveal>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  )
}

function StepNumber({ n }) {
  return <span className="inline-grid place-items-center w-8 h-8 rounded-full bg-amber-400 text-black text-sm font-bold flex-shrink-0">{n}</span>
}

// Guide de pose : le panneau en U, le colis, le ruban à coller, la fixation au mur, l'allumage
export default function GuidePose() {
  const example = useMemo(() => stripExample(), [])
  const table = useMemo(() => hueCutTable(), [])

  // Motifs des visuels chargés d'avance
  useEffect(() => {
    AMBIANCES.forEach(a => loadLibraryShapes(a.motif).catch(() => {}))
  }, [])

  return (
    <div className="bg-slate-950 text-white">
      <Header />
      <main>
        {/* Ouverture */}
        <section className="px-4 sm:px-8 pt-28 lg:pt-36 pb-20 lg:pb-28">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.15fr] gap-12 items-center">
            <Reveal>
              <p className="text-sm font-semibold text-amber-400">Guide de pose</p>
              <h1 className="mt-3 text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.04] text-balance">
                Votre panneau, posé en quelques étapes.
              </h1>
              <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-xl">
                Le panneau arrive creusé en U au dos, avec son ruban LED et son kit de fixation.
                Vous collez le ruban dans le creux, vous fixez le panneau au mur : c’est allumé.
              </p>
              <nav aria-label="Étapes du guide" className="mt-8 flex flex-wrap gap-2">
                {CHAPTERS.map(([id, label], i) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-white/5 hover:bg-white/10 ring-1 ring-white/10 px-3.5 py-1.5 text-sm text-slate-200 transition-colors"
                  >
                    <span className="text-amber-400 font-semibold">{i + 1}</span>{label}
                  </a>
                ))}
              </nav>
            </Reveal>
            <Reveal delay={0.15}>
              <GlowPanel motif="cerf-elaphe" color={kelvinToHex(2700)} haloClass="bg-amber-300/50" />
            </Reveal>
          </div>
        </section>

        {/* 1. Le panneau en U */}
        <Section
          id="panneau"
          eyebrow="01 · Le panneau"
          title="Creusé en U, sur 2 cm."
          intro="La façade découpée au laser et ses bords forment un U. Le ruban se colle au fond du creux, face lumineuse tournée vers le mur : la lumière rebondit sur le mur, fait le halo et ressort par le motif."
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal className="order-2 lg:order-1">
              <dl className="flex flex-col gap-6">
                {[
                  ['2 cm d’épaisseur', 'La façade et ses bords de même épaisseur forment un U : de profil, on ne voit que la tranche.'],
                  ['Un creux de 16 mm', '14 mm avec une façade en bois ou en MDF : tous nos rubans y tiennent, sans dépasser.'],
                  ['Le halo est conservé', 'Le panneau reste à 20, 30 ou 40 mm du mur, sur ses entretoises : plus il en est loin, plus le halo s’étale.'],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5">
                    <dt className="text-lg font-semibold text-white">{t}</dt>
                    <dd className="mt-1 text-slate-400 leading-relaxed">{d}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
            <Reveal className="order-1 lg:order-2" delay={0.1}>
              <figure className="rounded-3xl bg-slate-900/60 ring-1 ring-white/10 p-4 sm:p-6">
                <UProfileDiagram className="w-full max-w-sm mx-auto h-auto" />
                <figcaption className="mt-3 text-sm text-slate-500 text-center">Le panneau en coupe, épaisseurs agrandies trois fois.</figcaption>
              </figure>
            </Reveal>
          </div>
        </Section>

        {/* 2. Le colis */}
        <Section
          id="colis"
          eyebrow="02 · Le colis"
          title="Tout est dans la boîte."
          intro="Il vous faut seulement une perceuse, un niveau, un crayon, et des ciseaux pour un ruban Philips Hue."
        >
          <div className="grid sm:grid-cols-3 gap-4">
            {KIT.map(({ Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 0.08}>
                <div className="h-full rounded-3xl bg-white/[0.03] ring-1 ring-white/10 p-6">
                  <Icon className="w-32 h-auto" />
                  <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-slate-400 leading-relaxed">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* 3. Poser le ruban */}
        <Section
          id="ruban"
          eyebrow="03 · Le ruban"
          title="Collez le ruban dans le creux."
          intro="Panneau posé à plat, façade en dessous, le ruban se colle en suivant le bord. Les vues ci-dessous montrent le dos d’un panneau S, à l’échelle."
        >
          <ol className="grid md:grid-cols-2 gap-6">
            {STRIP_STEPS.map(({ step, title, text }, i) => (
              <li key={step}>
                <Reveal delay={(i % 2) * 0.08} className="h-full rounded-3xl bg-slate-900/60 ring-1 ring-white/10 p-4 sm:p-6 flex flex-col">
                  <PanelBackView step={step} cutMm={example.cutCm * 10} className="w-full h-auto" />
                  <div className="mt-4 flex items-start gap-3">
                    <StepNumber n={i + 1} />
                    <div>
                      <h3 className="text-lg font-semibold text-white">{title}</h3>
                      <p className="mt-1 text-slate-400 leading-relaxed">{text(example)}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>

          {/* Longueurs à garder, calculées comme dans le studio */}
          <Reveal className="mt-16">
            <h3 className="text-2xl font-semibold tracking-tight text-white">Longueur de ruban Philips Hue à garder</h3>
            <p className="mt-2 max-w-3xl text-slate-400 leading-relaxed">
              Le ruban blanc arrive déjà coupé. Un ruban Philips Hue arrive dans sa boîte : gardez cette longueur en coupant sur un repère.
              Valeurs pour une façade acrylique ; en bois, en MDF ou sur mesure, la longueur exacte s’affiche dans le studio, à l’étape Éclairage.
            </p>
            <div className="mt-6 overflow-x-auto rounded-2xl ring-1 ring-white/10">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-white/[0.04] text-slate-300">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Ruban</th>
                    {table[0].cells.map(c => <th key={c.preset} scope="col" className="px-4 py-3 font-semibold">Format {c.preset}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {table.map(({ model, cells }) => (
                    <tr key={model.id}>
                      <th scope="row" className="px-4 py-3 font-medium text-white whitespace-nowrap">{model.name.replace('Philips Hue ', '')}</th>
                      {cells.map(c => (
                        <td key={c.preset} className="px-4 py-3 text-slate-300 tabular-nums">
                          {cm(c.cutCm)}
                          <span className="block text-xs text-slate-500">ruban de {c.lengthM} m</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Essential et Flux ultra-lumineux : Philips ne publie pas l’écart entre leurs repères ; coupez au repère juste en dessous de cette longueur.
            </p>
          </Reveal>
        </Section>

        {/* 4. Fixer au mur */}
        <Section
          id="mur"
          eyebrow="04 · Au mur"
          title="Fixez-le en trois gestes."
          intro="Les entretoises traversent le creux du U jusqu’à la façade : le panneau tient par sa façade, à la distance du mur que vous avez choisie."
        >
          <Reveal>
            <figure className="rounded-3xl bg-slate-900/60 ring-1 ring-white/10 p-4 sm:p-8">
              <div className="overflow-x-auto">
                <StandoffExploded className="w-full min-w-[560px] md:min-w-0 max-w-3xl mx-auto h-auto" />
              </div>
              <figcaption className="mt-3 text-sm text-slate-500 text-center">Une fixation en vue éclatée, en coupe au niveau d’un trou.</figcaption>
            </figure>
          </Reveal>
          <ol className="mt-8 grid md:grid-cols-3 gap-4">
            {MOUNT_STEPS.map(({ title, text }, i) => (
              <li key={title}>
                <Reveal delay={i * 0.08} className="h-full rounded-3xl bg-white/[0.03] ring-1 ring-white/10 p-6 flex items-start gap-3">
                  <StepNumber n={i + 1} />
                  <div>
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <p className="mt-1 text-slate-400 leading-relaxed">{text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-slate-500">
            Fixation invisible ou suspension par câbles ? Les platines et les serre-câbles se fixent de la même façon, au fond du creux.
          </p>
        </Section>

        {/* 5. Allumer */}
        <Section
          id="allumer"
          eyebrow="05 · Allumer"
          title="Branchez : c’est allumé."
          intro={`Le ruban blanc s’allume dès qu’il est branché. Avec Philips Hue, vous réglez couleurs et dégradés depuis l’application. ${HUE_CONNECTIVITY}`}
        >
          <div className="grid md:grid-cols-3 gap-6">
            {AMBIANCES.map((a, i) => (
              <Reveal key={a.motif} delay={i * 0.08}>
                <figure>
                  <GlowPanel motif={a.motif} color={a.color} haloClass={a.halo} />
                  <figcaption className="mt-3 text-sm text-slate-400 text-center">{a.label}</figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* Appel final */}
        <section className="bg-[radial-gradient(ellipse_at_50%_0%,rgba(251,191,36,0.16),transparent_60%)] px-4 sm:px-8 py-24 lg:py-32 text-center">
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white">Envie du vôtre ?</h2>
          <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto">
            Choisissez un motif, une taille, une matière et une lumière, et voyez votre panneau en 3D avant de commander.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/studio" className="inline-flex rounded-full bg-amber-400 hover:bg-amber-300 text-black font-semibold text-lg px-8 py-4 transition-colors">
              Créer mon panneau
            </Link>
            <Link to={{ pathname: '/', hash: '#faq' }} className="text-slate-300 hover:text-white font-medium transition-colors">
              Questions fréquentes →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
