# LumiCut — Suivi de progression

## Sprint 1 — Dashboard Admin ✅ TERMINÉ
- Dashboard admin fonctionnel (commandes, motifs, matériaux, clients)
- Store Zustand admin (`adminStore.js`)
- Pages admin dans `src/pages/admin/`

## Sprint 2 — Motifs & Intégrations ✅ TERMINÉ

### Motifs Iconify
- `SVGRepoSearch.jsx` — recherche, grille, suggestions, pagination, favoris
- `SVGRepoThumbnail.jsx` — carte motif avec bouton ♥
- `svgrepoClient.js` — wrapper Iconify API (proxy Vite `/api/iconify`)
- `svgCleaner.js` — nettoyage laser (suppression gradients/styles/texte, fills noirs)
- `svgCache.js` — cache localStorage 50 SVG max
- `favoritesStore.js` — favoris Zustand + localStorage
- `logMotif.js` — log Supabase des motifs utilisés (upsert + RPC `increment_motif_usage`)

### Conseiller IA
- `AIAdvisor.jsx` — chat conseiller intégré au studio (Anthropic API)
- `anthropicClient.js` — `sendAdvisorMessage()` uniquement (génération SVG IA abandonnée)

### Décisions
- SVGRepo abandonné (API 429) → Iconify (publique, gratuite, sans clé)
- Génération SVG IA abandonnée (qualité insuffisante)
- Proxy Vite : `/api/anthropic` → `api.anthropic.com`, `/api/iconify` → `api.iconify.design`

## Sprint 3 — Landing page marketing 🔄 EN COURS

### À faire (dans l'ordre)
- [x] Header fixe + Footer
- [x] Hero avec CTA
- [ ] HowItWorks
- [ ] SocialProof (compteurs animés)
- [ ] Gallery masonry
- [ ] Materials + formats
- [ ] MiniConfigurator (teaser)
- [ ] Testimonials + FAQ
- [ ] CTAFinal
- [ ] Animations Framer Motion globales
