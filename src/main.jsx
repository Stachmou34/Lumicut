import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
// Polices pochoir auto-hébergées : leurs lettres gardent l'intérieur (O, A, e) attaché à la découpe
import '@fontsource/saira-stencil-one'
import '@fontsource/stardos-stencil'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
