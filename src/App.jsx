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
    </Routes>
  )
}
