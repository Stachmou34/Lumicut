import Header from '../components/shared/Header'
import Footer from '../components/shared/Footer'
import Hero from '../components/landing/Hero'

export default function Landing() {
  return (
    <div className="bg-slate-950 text-white">
      <Header />
      <Hero />
      {/* Sections suivantes à venir — sprint 3 */}
      <Footer />
    </div>
  )
}
