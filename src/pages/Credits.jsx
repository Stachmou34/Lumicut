import { useEffect, useMemo, useState } from 'react'
import Header from '../components/shared/Header'
import Footer from '../components/shared/Footer'
import { loadLibraryIndex, LICENSE_LABELS, requiresAttribution } from '../lib/library/libraryClient'

// Sources de la bibliothèque de motifs : ce qu'elles sont et ce que leur licence permet
const SOURCES = [
  {
    origin: 'PhyloPic',
    url: 'https://www.phylopic.org',
    text: 'Silhouettes d’animaux et de plantes dessinées d’après de vrais spécimens par des scientifiques et des illustrateurs. Nous n’utilisons que des images en domaine public (CC0, marque du domaine public) ou sous licence CC BY, toutes autorisant l’usage commercial.',
  },
  {
    origin: 'game-icons.net',
    url: 'https://game-icons.net',
    text: 'Pictogrammes en silhouette dessinés par Lorc, Delapouite et leurs contributeurs, sous licence Creative Commons Attribution 3.0 : l’usage commercial est permis, à condition de citer l’auteur, ce que fait cette page.',
  },
  {
    origin: 'Wikimedia Commons',
    url: 'https://commons.wikimedia.org',
    text: 'Dessins versés dans le domaine public ou sous CC0 (tour Eiffel, croix occitane, lys de Florence).',
  },
  {
    origin: 'Catalogue Hipparcos',
    url: 'https://github.com/ofrohn/d3-celestial',
    text: 'Positions et éclats réels des étoiles (mission Hipparcos de l’Agence spatiale européenne) et tracés des constellations, mis en forme par Olaf Frohn dans d3-celestial (licence BSD).',
  },
  {
    origin: 'Natural Earth',
    url: 'https://www.naturalearthdata.com',
    text: 'Contours réels des continents pour les cartes du monde (domaine public), via le paquet world-atlas de Mike Bostock (licence ISC).',
  },
]

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-white mb-3">{title}</h2>
      <div className="text-slate-400 text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

export default function Credits() {
  const [index, setIndex] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    loadLibraryIndex().then(setIndex).catch(e => setError(e.message))
  }, [])

  const byOrigin = useMemo(() => {
    const groups = {}
    for (const m of index?.motifs ?? []) (groups[m.credit.origin] ??= []).push(m)
    return groups
  }, [index])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />
      <div className="max-w-4xl mx-auto px-6 pt-28 pb-20">
        <h1 className="text-3xl font-bold mb-2">Sources et licences des motifs</h1>
        <p className="text-slate-500 text-sm mb-10">
          Les motifs du catalogue sont des dessins réels, choisis pour leur licence qui autorise la fabrication
          et la vente. Chacun a été préparé et vérifié pour la découpe laser (ponts de matière, aucun morceau qui tombe).
        </p>

        <Section title="Les sources">
          {SOURCES.map(s => (
            <p key={s.origin}>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300 font-semibold">{s.origin}</a>
              {' — '}{s.text}
            </p>
          ))}
          <p>
            Les dessins ont été adaptés pour la découpe : fusion des formes, ponts de matière ajoutés pour tenir les
            parties intérieures, pointes trop fines émoussées. Ces modifications sont les seules apportées aux originaux.
          </p>
        </Section>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!index && !error && <p className="text-slate-500 text-sm">Chargement…</p>}

        {Object.entries(byOrigin).map(([origin, list]) => (
          <Section key={origin} title={`${origin} (${list.length})`}>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
              {list.map(m => (
                <li key={m.id} className="text-xs">
                  <span className="text-slate-200">{m.name}</span>
                  {' — '}
                  <a href={m.credit.url} target="_blank" rel="noreferrer" className="hover:text-slate-200 underline decoration-slate-700">
                    {m.credit.author}
                  </a>
                  {', '}
                  <a href={m.credit.licenseUrl} target="_blank" rel="noreferrer" className={`underline decoration-slate-700 ${requiresAttribution(m.credit.license) ? 'text-slate-300' : ''}`}>
                    {LICENSE_LABELS[m.credit.license] ?? m.credit.license}
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        ))}
      </div>
      <Footer />
    </div>
  )
}
