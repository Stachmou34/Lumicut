import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Rendu physique de la 3D : module chargé à la demande, préparé d'avance par le serveur de développement
  // (sinon la page se recharge la première fois qu'on active la « Lumière réelle »)
  optimizeDeps: { include: ['three-gpu-pathtracer'] },
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
