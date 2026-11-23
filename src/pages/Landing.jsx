import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Header from '../components/shared/Header'
import Footer from '../components/shared/Footer'
import ScrollyStory from '../components/landing/ScrollyStory'
import PricingSection from '../components/landing/PricingSection'
import GallerySection from '../components/landing/GallerySection'
import FaqSection from '../components/landing/FaqSection'
import { loadLibraryIndex, libraryIndex } from '../lib/library/libraryClient'
import { hueFromPrice, deliveryLabel } from '../lib/landingFacts'
import { formatEuros } from '../lib/formatEuros'

// Accueil : le récit au défilement (scrollytelling), puis tarifs, galerie, questions et appel final
export default function Landing() {
  const { hash } = useLocation()
  const [motifCount, setMotifCount] = useState(libraryIndex()?.motifs.length ?? null)

  useEffect(() => {
    if (motifCount == null) loadLibraryIndex().then(i => setMotifCount(i.motifs.length)).catch(() => {})
  }, [motifCount])

  // Lien « /#tarifs » depuis une autre page : on descend à la section une fois la page affichée
  useEffect(() => {
    if (!hash) return
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 50)
    return () => clearTimeout(t)
  }, [hash])

  const facts = useMemo(() => ({
    motifCount,
    hueFrom: formatEuros(hueFromPrice()),
    delivery: deliveryLabel(),
  }), [motifCount])

  return (
    <div className="bg-slate-950 text-white">
      <Header />
      <main>
        <ScrollyStory facts={facts} />
        <PricingSection />
        <GallerySection />
        <FaqSection />
        <section className="bg-[radial-gradient(ellipse_at_50%_0%,rgba(251,191,36,0.16),transparent_60%)] px-4 sm:px-8 py-24 lg:py-32 text-center">
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white">Prêt à allumer votre mur ?</h2>
          <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto">
            Composez votre panneau en quelques minutes et voyez-le en 2D et en 3D avant de commander.
          </p>
          <Link
            to="/studio"
            className="mt-8 inline-flex rounded-full bg-amber-400 hover:bg-amber-300 text-black font-semibold text-lg px-8 py-4 transition-colors"
          >
            Créer mon panneau
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  )
}
