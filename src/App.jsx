import { Routes, Route, Navigate } from 'react-router-dom'
// LumiCut pages
import Landing from './pages/Landing'
import Studio from './pages/Studio'
import Gallery from './pages/Gallery'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
// Box configurator pages (existing)
import Configurator from './pages/Configurator'
import Templates from './pages/Templates'
import Order from './pages/Order'
// Admin
import AdminLayout from './components/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Orders from './pages/admin/Orders'
import Production from './pages/admin/Production'
import Customers from './pages/admin/Customers'
import Catalog from './pages/admin/Catalog'
import Reviews from './pages/admin/Reviews'
import Analytics from './pages/admin/Analytics'

export default function App() {
  return (
    <Routes>
      {/* LumiCut */}
      <Route path="/" element={<Landing />} />
      <Route path="/studio" element={<Studio />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/order-confirmation" element={<OrderConfirmation />} />
      {/* Box configurator */}
      <Route path="/box" element={<Navigate to="/box/templates" replace />} />
      <Route path="/box/templates" element={<Templates />} />
      <Route path="/box/configurator" element={<Configurator />} />
      <Route path="/box/order" element={<Order />} />
      {/* Admin */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="production" element={<Production />} />
        <Route path="customers" element={<Customers />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>
    </Routes>
  )
}
