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

## Sprint 3 — Landing page marketing ⏸ EN PAUSE

### Fait
- [x] Header fixe + Footer
- [x] Hero avec CTA

### Mis en pause — reprise après Sprint 4

---

## Sprint 4 — Paiement Stripe + Tunnel de commande ✅ TERMINÉ

### Étape 1 — Panier ✅
- [x] `cartStore.js` — Zustand + persist localStorage (updateQuantity, getTotal, getItemCount)
- [x] `Cart.jsx` — page panier avec contrôles quantité, AnimatePresence, frais de port
- [x] Badge panier dans Header
- [x] `shippingCalc.js` — calcul frais de livraison par pays + supplément grande taille
- [x] `createOrder.js` — création commande Supabase en "pending"
- [x] `stripeClient.js` — singleton Stripe + createPaymentIntent via Edge Function

### Étape 2 — Checkout ✅
- [x] `Checkout.jsx` — stepper 3 étapes (coordonnées → récap → paiement)
- [x] Étape 1 : formulaire react-hook-form + zod (firstName, lastName, email, phone, adresse, pays)
- [x] Étape 2 : récapitulatif articles + frais de port + création commande Supabase
- [x] Étape 3 : Stripe Elements `PaymentElement` (mode deferred)

### Étape 3 — Stripe ✅
- [x] Packages `@stripe/stripe-js` + `@stripe/react-stripe-js` installés
- [x] Edge Function `supabase/functions/create-payment-intent/index.ts`
- [x] Paiement via Stripe Elements avec `confirmPayment` + `return_url`

### Étape 4 — Confirmation + webhook ✅
- [x] Edge Function `supabase/functions/stripe-webhook/index.ts`
  - `payment_intent.succeeded` → `status = 'paid'`
  - `payment_intent.payment_failed` → `status = 'failed'`
- [x] `OrderConfirmation.jsx` — polling Supabase (statut "paid"), affichage dynamique

### Étape 5 — Légal ✅
- [x] `CGV.jsx` — conditions générales de vente
- [x] `MentionsLegales.jsx`
- [x] `PolitiqueConfidentialite.jsx` — conformité RGPD
- [x] `CookieBanner.jsx` — bandeau cookies avec accepter/refuser (localStorage)
- [x] Liens footer mis à jour

### Étape 6 — Intégration dashboard admin ⏳ À FAIRE
- [ ] Commandes "paid" dans `/admin/orders`
- [ ] Bouton téléchargement DXF depuis Supabase Storage

---

## Sprint 5 — Emails transactionnels + DXF automatique 🔄 EN COURS

### Étape 1 — Setup Resend (manuel, non bloquant)
- [ ] Créer compte Resend + vérifier domaine (SPF, DKIM, DMARC)
- [ ] Ajouter secrets Supabase : `RESEND_API_KEY`, `EMAIL_FROM`

### Étape 2 — Templates emails ✅
- [x] `_shared/emails/components/EmailLayout.tsx`
- [x] `_shared/emails/OrderConfirmation.tsx`
- [x] `_shared/emails/InProduction.tsx`
- [x] `_shared/emails/Shipped.tsx`
- [x] `_shared/emails/ReviewRequest.tsx`
- [x] `_shared/emails/ReferralReward.tsx`

### Étape 3 — Edge Functions ✅
- [x] `send-order-email/index.ts` — routing par type + dédup via email_logs
- [x] `send-review-requests/index.ts` — batch J+10 (cron)
- [x] `generate-order-dxf/index.ts` — génère DXF + upload Storage
- [x] `stripe-webhook/index.ts` — mis à jour (email + DXF au paiement)
- [x] Table `email_logs` ajoutée au schema.sql

### Étape 4 — Intégration dashboard ✅
- [x] `Orders.jsx` — déclenche email au changement de statut
- [x] `/admin/emails` — page EmailLogs (historique + renvoyer)
- [x] `emailClient.js` — wrapper fetch vers send-order-email
- [x] Sidebar admin — lien "Emails" ajouté

### Étape 5 — Génération DXF ✅
- [x] DXF généré automatiquement après paiement (contour + trous fixation)
- [x] Upload Supabase Storage bucket "production"
- [x] Déclenché depuis stripe-webhook

### Étape 6 — Cron demandes d'avis ✅
- [x] `send-review-requests/index.ts`
- [x] SQL cron pg_cron documenté dans schema.sql

### Notes de déploiement
- Toutes les Edge Functions déployées avec `--no-verify-jwt` (requis pour les appels externes)
- Templates React Email remplacés par HTML inline (incompatibilité Deno)
- Webhook Stripe configuré → `payment_intent.succeeded` + `payment_intent.payment_failed`
- Flow validé end-to-end : paiement → statut "paid" → email de confirmation ✅

---

## Déploiement Supabase Edge Functions (manuel)
```bash
supabase functions deploy create-payment-intent
supabase functions deploy stripe-webhook
```

## Variables d'environnement requises
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
# Côté Supabase (secrets)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```
