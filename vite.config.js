import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Développement seulement : recherche d'icônes « En ligne » (en ligne, le site appelle api.iconify.design directement)
      '/api/iconify': {
        target: 'https://api.iconify.design',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/iconify/, ''),
      },
    },
  },
})
