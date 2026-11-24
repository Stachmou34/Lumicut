import { Routes, Route } from 'react-router-dom'
// Pages de la boutique
import Landing from './pages/Landing'
import Studio from './pages/Studio'
import Gallery from './pages/Gallery'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import CGV from './pages/CGV'
import MentionsLegales from './pages/MentionsLegales'
import PolitiqueConfidentialite from './pages/PolitiqueConfidentialite'
import Credits from './pages/Credits'
import GuidePose from './pages/GuidePose'
import CookieBanner from './components/shared/CookieBanner'
// Administration
import AdminLayout from './components/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Orders from './pages/admin/Orders'
import Production from './pages/admin/Production'
import Customers from './pages/admin/Customers'
import Catalog from './pages/admin/Catalog'
import Reviews from './pages/admin/Reviews'
import Analytics from './pages/admin/Analytics'
import EmailLogs from './pages/admin/EmailLogs'

export default function App() {
  return (
    <>
    <CookieBanner />
    <Routes>
      {/* Boutique */}
      <Route path="/" element={<Landing />} />
      <Route path="/studio" element={<Studio />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/order-confirmation" element={<OrderConfirmation />} />
      <Route path="/cgv" element={<CGV />} />
      <Route path="/mentions-legales" element={<MentionsLegales />} />
      <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
      <Route path="/credits" element={<Credits />} />
      <Route path="/pose" element={<GuidePose />} />
      {/* Administration */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="production" element={<Production />} />
        <Route path="customers" element={<Customers />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="emails" element={<EmailLogs />} />
      </Route>
    </Routes>
    </>
  )
}
