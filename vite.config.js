import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy pour l'API Anthropic — contourne le CORS en développement
    proxy: {
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
        headers: {
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      },
      // Proxy SVGRepo — contourne le CORS pour l'API et les téléchargements
      '/api/iconify': {
        target: 'https://api.iconify.design',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/iconify/, ''),
      },
    },
  },
})
