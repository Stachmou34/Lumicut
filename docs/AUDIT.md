# LumiCut — Cartographie du site & points à reprendre

> Audit du code au 19/11/2026 (branche `claude/epic-planck-axkttn`, commit `b29c6d9`).
> Build de production : ✅ OK, mais **un seul bundle JS de 2 Mo** (581 Ko gzip).
> Aucun test, aucun linter, aucune CI.
>
> **Mise à jour au 20/11/2026** : l'état de chaque point (corrigé, ouvert, nouveau) est dans [`CHECKUP.md`](../CHECKUP.md).

---

## 1. Cartographie

### 1.1 Pages publiques (boutique LumiCut)

| Route | Fichier | Rôle | État |
|---|---|---|---|
| `/` | `src/pages/Landing.jsx` | Accueil : Header + Hero + Footer | ⚠️ Seulement le Hero. Les ancres `#galerie`, `#comment`, `#tarifs` pointent vers des sections inexistantes |
| `/studio` | `src/pages/Studio.jsx` | Configurateur de panneau (aperçu SVG 2D, pas Three.js) | ✅ Fonctionnel, nombreux bugs (voir §2) |
| `/gallery` | `src/pages/Gallery.jsx` | Galerie des 3 motifs maison → renvoie au studio | ✅ (sans Header/Footer) |
| `/cart` | `src/pages/Cart.jsx` | Panier (Zustand persisté) | ✅ |
| `/checkout` | `src/pages/Checkout.jsx` | Tunnel 3 étapes : coordonnées → récap (création commande) → paiement Stripe | ⚠️ voir §2 |
| `/order-confirmation` | `src/pages/OrderConfirmation.jsx` | Polling du statut `paid` | ⚠️ voir §2 |
| `/cgv`, `/mentions-legales`, `/politique-confidentialite` | `src/pages/*.jsx` | Légal | ⚠️ incomplets (voir §2.4) |
| *(liens morts)* | — | `/review?order=…` (email d'avis), « Suivre ma commande » (→ accueil), Instagram/Pinterest (`#`) | ❌ |

### 1.2 Configurateur de boîtes (héritage « Laser Box Configurator »)

| Route | Fichier | Rôle |
|---|---|---|
| `/box` | → redirige vers `/box/templates` | |
| `/box/templates` | `src/pages/Templates.jsx` | Choix parmi 6 gabarits (`src/templates/*`) |
| `/box/configurator` | `src/pages/Configurator.jsx` | Paramètres + vue 3D (Three.js) / 2D + export DXF/SVG |
| `/box/order` | `src/pages/Order.jsx` | « Commande directe disponible prochainement » |

➡️ Aucune page LumiCut ne pointe vers `/box/*`. C'est un produit différent (boîtes, pas panneaux), qui embarque Three.js dans le bundle principal.

### 1.3 Back-office `/admin` (protégé par mot de passe côté client)

| Route | Fichier | État |
|---|---|---|
| `/admin` | `pages/admin/Dashboard.jsx` | KPIs + graphiques Recharts — **date « aujourd'hui » codée en dur** |
| `/admin/orders` | `pages/admin/Orders.jsx` | Liste filtrable + modal détail |
| `/admin/production` | `pages/admin/Production.jsx` → `KanbanBoard` | Kanban drag & drop 4 colonnes |
| `/admin/emails` | `pages/admin/EmailLogs.jsx` | Historique emails + « Renvoyer » |
| `/admin/customers`, `/catalog`, `/reviews`, `/analytics` | placeholders | ❌ « Bientôt disponible » |

### 1.4 Parcours client de bout en bout

```
Landing ─► Studio ─(Ajouter au panier)─► Cart ─► Checkout
                                               │ étape 2 : createOrder()  → INSERT orders (status=pending) via clé anon
                                               │ étape 3 : create-payment-intent (montant envoyé par le navigateur)
                                               ▼
                                   Stripe confirmPayment ─► redirect /order-confirmation (polling orders)
                                               │
                         Webhook stripe-webhook ─► orders.status = paid
                                               ├─► send-order-email (confirmation, Resend)
                                               └─► generate-order-dxf (rectangle + 2 trous → bucket "production")
Admin : Orders / Kanban ─► changement de statut ─► send-order-email (production / shipped)
Cron  : send-review-requests (J+10 après "delivered")
```

### 1.5 Back-end (Supabase)

- **Tables** (`supabase/schema.sql`) : `orders`, `customers`, `reviews`, `motifs`, `creators`, `referrals`, `email_logs` + RPC `increment_motif_usage`.
  `customers`, `reviews`, `creators`, `referrals` ne sont **jamais alimentées** par le code.
- **Aucune politique RLS** dans le schéma.
- **Edge Functions** (toutes déployées en `--no-verify-jwt`, CORS `*`) :
  `create-payment-intent`, `stripe-webhook`, `send-order-email`, `generate-order-dxf`, `send-review-requests`.
- `supabase/functions/_shared/emails/*.tsx` (React Email) : **inutilisés** (remplacés par du HTML inline).

### 1.6 Services externes

Stripe (paiement) · Supabase (BDD, Storage, Functions) · Resend (emails) · Anthropic (conseiller IA, appel direct navigateur) · Iconify (recherche de motifs, via proxy Vite) · Google Fonts (polices du texte) · Vercel (hébergement annoncé dans les mentions légales).

### 1.7 State & librairies

- **Stores** : `configuratorStore` (studio), `cartStore` (persisté), `adminStore` (auth + commandes + **20 commandes mock**), `favoritesStore`, `savedDesignsStore`, `projectStore` (boîtes).
- **lib/** : prix (`computePrice`), livraison (`shippingCalc`, `deliveryDate`), commande (`createOrder`, `stripeClient`, `emailClient`), motifs (`svgrepoClient`, `svgCleaner`, `svgCache`, `logMotif`), IA (`anthropicClient`), partage (`designSerializer`), boîtes (`nesting`, `generateDXF`, `generateSVG`, `estimateCost`, `fingerJoints`).
- **Code mort** : `PanelEditor.jsx`, `CanvasToolbar.jsx`, `ObjectToolbar.jsx`, `lib/canvasHistory.js`, `lib/fabricHelpers.js`, `lib/useDrag.js` (éditeur Fabric jamais monté), templates React Email.
  Dépendances inutilisées : `fabric`, `dxf-writer`, `react-email`, `@react-email/components`.

---

## 2. Points à reprendre

Légende priorité : **P0** = bloquant avant mise en prod / risque sécurité ou argent · **P1** = bug fonctionnel visible · **P2** = UX, légal, marketing · **P3** = dette technique / conventions.

### 2.1 🔴 P0 — Sécurité

| # | Problème | Où | Correctif proposé |
|---|---|---|---|
| S1 | **Mot de passe admin en clair dans le bundle** (`lumicut2024`) et session = `localStorage.lumicut_admin_auth = 'true'` (n'importe qui peut le poser à la main) | `src/store/adminStore.js:5`, `:419` | Supabase Auth (magic link / email+mdp) + rôle admin vérifié côté BDD |
| S2 | **Aucune RLS** : la clé anon (publique) permet de lire/modifier/supprimer toutes les commandes (données personnelles), de passer une commande en `paid`, de supprimer des `email_logs`… L'admin et la page de confirmation fonctionnent *justement* parce que la base est ouverte | `supabase/schema.sql`, `adminStore.js:441-485`, `EmailLogs.jsx:21,36`, `OrderConfirmation.jsx:32` | Activer RLS partout ; `insert` anon limité ; lecture confirmation via Edge Function (ou token par commande) ; admin via rôle authentifié |
| S3 | **Clé API Anthropic exposée dans le navigateur** (`VITE_ANTHROPIC_API_KEY` + `anthropic-dangerous-direct-browser-access`) | `src/lib/anthropicClient.js:4-12` | Passer par une Edge Function (clé en secret Supabase) avec limitation de débit |
| S4 | **Edge Functions publiques sans authentification** : n'importe qui peut déclencher `send-order-email` (spam des clients, contournement dédup via `type` arbitraire), `generate-order-dxf`, `create-payment-intent` | `supabase/functions/*/index.ts` | Vérifier un secret partagé / JWT service-role pour les appels internes ; JWT admin pour les appels depuis l'admin |
| S5 | **Injection HTML dans les emails** : `customer_name`, `extraData.tracking.*` et `rewardCode` sont concaténés sans échappement (lien de phishing possible via `tracking.url`) | `send-order-email/index.ts:90,152-156,184` | Échapper toutes les valeurs, valider les URLs, ne pas accepter `extraData` d'un appel non authentifié |
| S6 | **XSS dans le bon de livraison** : `document.write` de données client non échappées (nom, adresse, gravure) | `src/components/admin/OrderDetailModal.jsx:24-72` | Échapper ou générer le document via React/DOM |
| S7 | SVG externes injectés via `dangerouslySetInnerHTML` ; `svgCleaner` ne retire ni `<script>` ni les attributs `on*`/`href` | `lib/svgCleaner.js`, `PanelPreview.jsx:181-191` | Ajouter `script`, `foreignObject`, `a` à la liste et supprimer les attributs `on*`/`href` (ou DOMPurify) |
| S8 | `.env` n'est pas dans `.gitignore` (seulement `*.local`) alors que `dev-server.js` lit `STRIPE_SECRET_KEY` depuis `.env` | `.gitignore` | Ajouter `.env`, `.env.*` |

### 2.2 🔴 P0 — Paiement & intégrité des commandes

| # | Problème | Où | Correctif proposé |
|---|---|---|---|
| P1 | **Le montant payé est fixé par le navigateur** : `create-payment-intent` accepte n'importe quel `amount`, et le webhook passe la commande en `paid` sans comparer au prix. Un client peut payer 0,50 € un panneau XL | `create-payment-intent/index.ts:23-37`, `stripe-webhook/index.ts:47-54`, `createOrder.js:37` | Recalculer le prix **côté serveur** à partir de la config (même grille que `computePrice`), créer la commande + PI dans la même Edge Function, vérifier `pi.amount` dans le webhook |
| P2 | **La configuration commandée est en grande partie perdue** : le panier ne garde que motif/matériau/dimensions/couleur. Perdus : texte & police, position/échelle/rotation/miroir du motif, **SVG du motif Iconify** (`aiMotifSvg`), variateur, emballage cadeau, fixation. Le client paie le variateur/l'emballage mais l'atelier ne le sait pas | `PriceDisplay.jsx:21-31` | Stocker la config complète (via `serializeDesign` + SVG custom) dans l'article |
| P3 | **Une commande multi-articles n'enregistre que le 1er article** ; colonnes `items`, `subtotal`, `shipping_cost`, `customer_phone`, `price_ht` jamais renseignées ; la LED est stockée en hexadécimal | `src/lib/createOrder.js:11-39` | Remplir `items` (tableau complet), `subtotal`, `shipping_cost`, `price_ht`, téléphone |
| P4 | **Commandes « pending » en double** : une nouvelle commande est créée à chaque clic « Procéder au paiement » (retour arrière inclus), et un nouveau PaymentIntent à chaque tentative de paiement | `Checkout.jsx:193-204`, `:327` | Réutiliser la commande/PI existants (idempotence), nettoyer les `pending` anciennes |
| P5 | **Page de confirmation trompeuse** : vide le panier et affiche « Commande reçue ! » même si le paiement a échoué (`redirect_status=failed` ignoré, statut `failed` non géré, absence d'`order_id` ⇒ « confirmée ») | `OrderConfirmation.jsx:18-60` | Lire `redirect_status` / `payment_intent`, gérer `failed`, ne vider le panier qu'en cas de succès |
| P6 | Le webhook n'ajoute pas d'entrée `status_history`, ne gère pas les remboursements (`charge.refunded`) ni l'idempotence (événement rejoué ⇒ emails/DXF relancés) ; les appels email/DXF en *fire-and-forget* peuvent être coupés à la fin de la fonction | `stripe-webhook/index.ts:47-77` | `await` (ou `EdgeRuntime.waitUntil`), table d'événements traités, gestion refund |
| P7 | Prix sur-mesure non borné : aucune limite min/max sur les champs (valeur 1 cm ⇒ quelques centimes ; 0 ⇒ 0 € ⇒ paiement refusé) | `DimensionSelector.jsx:69-86`, `computePrice.js:28-31` | Clamp 20–150 × 10–80 cm + prix plancher |

### 2.3 🔴 P0 — Production / fichiers de découpe

| # | Problème | Où |
|---|---|---|
| F1 | **Le DXF généré après paiement ne contient pas le motif** : seulement un rectangle, 2 trous et un cadre « zone motif » indicatif | `generate-order-dxf/index.ts:89-190` |
| F2 | **Erreur d'unité** : la taille est stockée « 60×30 cm » mais parsée comme des mm ⇒ DXF de 60 × 30 **mm** | `generate-order-dxf/index.ts:35-36` |
| F3 | Le bouton admin « ⬇ DXF production » télécharge en fait le **SVG brut de la bibliothèque** (pas DXF, pas à l'échelle, sans texte, sans transformations, et un placeholder texte pour tout motif Iconify). Idem pour le ZIP du Kanban. Le `dxf_url` généré côté serveur n'est jamais proposé | `OrderDetailModal.jsx:6-21`, `KanbanBoard.jsx:9-33` |
| F4 | **Faisabilité laser non gérée** : les « îlots » des lettres (O, A, e, 8…) et des motifs tombent à la découpe (pas de police pochoir ni de ponts). L'heuristique d'épaisseur ne marche pas (`material.includes('3')` est toujours faux) | `TextEditor.jsx:55-58` |
| F5 | Aucun kerf appliqué aux panneaux (la règle « kerf dans `computePieces()` » ne concerne que les boîtes) | — |
| F6 | Décision à trancher : `CLAUDE.md` dit « DXF généré côté client », le code le génère côté serveur | `CLAUDE.md`, `generate-order-dxf` |

### 2.4 🟠 P1 — Bugs fonctionnels

**Studio**
- `SizeComparator.jsx:22-23` : multiplie les cm par 10 alors que l'échelle est en px/cm ⇒ le panneau paraît **10× trop grand** à côté de la silhouette.
- Variateur et emballage cadeau **impossibles à retirer** une fois ajoutés (seulement des `toggle` dans la bannière d'upsell, qui disparaît ensuite) — `UpsellBanner.jsx`, `GiftWizard.jsx:39` (le wizard *inverse* l'emballage s'il était déjà coché).
- Pas d'UI pour la gravure (`engraving`) ni la fixation (`mounting`), pourtant tarifées/stockées.
- Partage / chargement de design incomplet : texte, sous-titre, preset LED, variateur, gravure non restaurés ; `setLedColor` force toujours le preset « custom » ; un motif Iconify n'est pas sérialisé ⇒ le lien partagé affiche l'Arbre de vie — `Studio.jsx:51-64`, `ShareDesignButton.jsx:24-35`, `designSerializer.js:1-3`.
- Aperçu « Voir sur mur » : ignore le motif Iconify, la photo capturée ne contient **que le rectangle** (pas le motif), le bouton WebXR n'est qu'une `alert` — `ARViewer.jsx:17,50-51,74`.
- Conseiller IA : la config proposée par l'IA est appliquée sans validation des IDs — `AIAdvisor.jsx:28-35` ; en production le proxy `/api/anthropic` n'existe pas (proxy Vite = dev uniquement) ⇒ **chat cassé en prod**.
- Recherche de motifs Iconify : même problème, `/api/iconify` n'existe qu'en dev ⇒ **recherche cassée en prod** (`vite.config.js`, `svgrepoClient.js:4`).
- `SVGRepoThumbnail.jsx:23-61` : `<button>` imbriqué dans un `<button>` (HTML invalide).
- `PriceDisplay.jsx:17-19` : `LED_SURCHARGE.rgb` n'existe dans aucun preset (code mort) ; dépendances du `useMemo` à revoir si la LED devient payante.

**Panier / livraison**
- `shippingCalc.js:12` : supplément grande taille déclenché à `>= 800`, mais les dimensions sont en **cm** (max 150) ⇒ jamais appliqué.
- `Cart.jsx:111` affiche « Livraison offerte » dès 89 € quel que soit le pays, alors que la gratuité n'existe que pour la France (`shippingCalc.js:6`).
- Promesse de délai incohérente : « 7 jours » (Hero/Footer), 7–8 jours ouvrés (studio), J+7 calendaires (emails, Kanban).

**Admin**
- `Dashboard.jsx:30,35` : « aujourd'hui » = `2026-04-16` et mois = `2026-04` en dur.
- `adminStore.js:436,455` : les 20 commandes **fictives** restent affichées tant que Supabase est vide (risque de confusion en prod).
- Formats incohérents entre commandes réelles et l'admin :
  - adresse enregistrée `line1/postal_code` mais lue `street/zip` ⇒ « undefined » dans le modal et le bon de livraison (`OrderDetailModal.jsx:48,191-192`) ;
  - taille enregistrée « 60×30 cm » mais l'admin attend `S/M/L/XL` ⇒ filtre taille et camembert vides (`Orders.jsx:38`, `Dashboard.jsx:86-93`) ;
  - `price_ht` jamais renseigné ⇒ TVA affichée = TTC.
- `Orders.jsx:7-10` : clé `production` alors que le statut vaut `in_production` ⇒ **l'email « en fabrication » n'est jamais envoyé** ; l'email « expédié » part sans numéro de suivi (aucun champ de saisie).
- Changements de statut depuis le Kanban ou le modal : **aucun email** déclenché ; aucune gestion d'erreur sur l'update Supabase.
- Statut `failed` (posé par le webhook) absent de `STATUS_CONFIG` ⇒ pas de badge, pas filtrable.
- `OrderDetailModal.jsx:220` : plante si `status_history` est `null`.
- `send-review-requests/index.ts:27` filtre sur `updated_at`, **colonne inexistante** ⇒ la fonction échoue ; et aucun process ne passe les commandes en `delivered`.

**Emails**
- « Suivre ma commande » → page d'accueil ; lien d'avis `/review?order=…` → route inexistante ; email parrainage sans aucune logique de parrainage derrière.

### 2.5 🟡 P2 — Légal, contenu, UX

**Légal / conformité**
- Mentions légales incomplètes : pas de nom du responsable, d'adresse, de SIRET/RCS, de n° TVA ; « Siège social : France » (`MentionsLegales.jsx`).
- CGV : « garantie 30 jours » ⇒ ne peut pas remplacer la **garantie légale de conformité (2 ans)** ni la garantie des vices cachés, à mentionner ; **médiateur de la consommation** absent (obligatoire) (`CGV.jsx:84-92`).
- Contradictions commerciales : « Retour 30 jours » (Footer) et « Satisfait ou remboursé » (Hero) vs CGV « pas de rétractation pour produit personnalisé ».
- « ⭐ 4.9/5 clients satisfaits » affiché sans aucun avis collecté ⇒ risque de pratique commerciale trompeuse (`Hero.jsx:119`).
- Politique de confidentialité : sous-traitants manquants (Resend, Anthropic — conversations envoyées aux USA —, Iconify, Google Fonts, Vercel) ; bandeau cookies qui parle de « cookies analytiques » alors qu'il n'y en a pas ; le refus n'est pas exploité.
- Licences des icônes Iconify : certains sets (ex. `game-icons`, CC BY 3.0) imposent une attribution — à vérifier set par set pour une revente commerciale.

**Landing / navigation / SEO**
- Landing réduite au Hero (sections galerie, « comment ça marche », tarifs, avis à construire — Sprint 3 en pause).
- Liens d'ancre du Header cassés hors de `/` et même sur `/`.
- `index.html` : `lang="en"`, titre « Laser Cut Box Configurator », pas de meta description / Open Graph / favicon ; pas de `robots.txt` / `sitemap`.
- Pas de page 404.
- Galerie et Studio sans Header commun (pas d'accès panier depuis le studio hors bouton « Ajouter »).
- Libellés « SVGRepo — Millions de motifs » alors que la source est Iconify (`MotifSelector.jsx:70`, `SVGRepoSearch.jsx:118-119`).
- Textes upsell approximatifs (« impact 3× plus grand » pour S→M = ×2,25 ; bouton « Voir L » depuis S).

**Responsive / accessibilité**
- Studio et Configurateur en colonnes fixes (`w-72` + `w-64`, `h-screen`) ⇒ **inutilisables sur mobile**.
- Admin en grilles fixes, sidebar fixe.
- Boutons emoji sans `aria-label`, pastilles de couleur sans libellé, focus peu visibles.

**Performance**
- Bundle unique de 2 Mo : charger en lazy (`React.lazy`) l'admin (Recharts), le configurateur de boîtes (Three.js), le Checkout (Stripe).
- `TextEditor.jsx:117` charge les Google Fonts **pendant le rendu** (effet de bord) — à déplacer dans un `useEffect` ou à auto-héberger (RGPD).

### 2.6 ⚪ P3 — Dette technique & conventions

- **CLAUDE.md obsolète** : indique « Sprint 2 en cours » alors que les sprints 4/5 sont faits ; « API Anthropic pour la génération de motifs » (abandonnée) ; « Configurateur 3D » (le studio est en SVG 2D).
- **Convention « pas de style inline » non respectée** : 15 fichiers utilisent `style={{…}}` (souvent légitime pour des couleurs dynamiques — à arbitrer : autoriser l'exception pour les valeurs calculées ?).
- Fichiers écrits « minifiés » illisibles : `PriceDisplay.jsx`, `ARViewer.jsx`, `UpsellBanner.jsx`, `GiftWizard.jsx`, `ShareDesignButton.jsx`, `DeliveryEstimate.jsx`, `savedDesignsStore.js`, `designSerializer.js`, `deliveryDate.js`.
- Commentaires en anglais (templates, `nesting.js`, `computePrice.js`, `generateDXF.js`…) alors que la convention impose le français.
- Grilles de prix dupliquées en 4 endroits (`computePrice.js`, `DimensionSelector.jsx`, `MaterialSelector.jsx`, prompt de `anthropicClient.js`) + libellés matériaux/motifs dupliqués (`adminStore.js`) ⇒ centraliser dans un module de catalogue (idéalement en base, cf. page Catalogue).
- Code mort à supprimer : éditeur Fabric (`PanelEditor`, `CanvasToolbar`, `ObjectToolbar`, `canvasHistory`, `fabricHelpers`), `useDrag`, templates React Email ; dépendances `fabric`, `dxf-writer`, `react-email`, `@react-email/components`.
- `generateDXF.js` et `generateSVG.js` dupliquent `nestPiecesSimple` alors que `nesting.js` existe.
- Configurateur de boîtes : 4 gabarits sur 6 exposent un curseur *Kerf* mais l'ignorent dans `computePieces()` (`hingedBox`, `photoFrame`, `deskOrganizer`, `tiltedStand`) ; `slidingLidBox` ne l'applique qu'au couvercle ; `fingerJoints.js` applique un kerf hors de `computePieces()`. **Décider si ce module reste dans LumiCut** (sinon le retirer du bundle).
- `package.json` : nom `laser-box-configurator`, pas de scripts `lint` / `test`.
- Aucun test : à minima `computePrice`, `shippingCalc`, `deliveryDate`, `svgCleaner`, `designSerializer`, et un test e2e du tunnel de commande (Stripe test mode).
- Statuts incohérents entre `schema.sql` (`refunded`, `failed`), `STATUS_CONFIG` (`cancelled`, `in_production`) et le webhook.
- `PROGRESS.md` : Sprint 4 étape 6 (commandes payées dans l'admin + téléchargement DXF depuis Storage) toujours ouverte.
- Vérifier la config d'hébergement (Vercel) : réécritures SPA vers `index.html` et remplacement des proxys Vite (`/api/anthropic`, `/api/iconify`) — aucun `vercel.json` dans le dépôt.

---

## 3. Ordre de reprise suggéré

1. **Sécuriser** (S1–S8) : Supabase Auth admin + RLS + Edge Functions authentifiées + clé Anthropic côté serveur + `.gitignore`.
2. **Fiabiliser l'argent** (P1–P7) : prix recalculé serveur, commande + PI créés ensemble, webhook vérifiant le montant, confirmation honnête.
3. **Rendre la commande fabricable** (P2, P3, F1–F5) : stocker la config complète, générer un DXF réel (motif + texte, à l'échelle, kerf), contrôles de faisabilité laser, exposer le DXF dans l'admin.
4. **Remettre l'admin d'aplomb** : formats alignés, emails sur changement de statut, saisie du suivi colis, suppression des mocks/dates en dur.
5. **Débloquer la prod** : remplacer les proxys Vite (Iconify, Anthropic), config Vercel.
6. **Légal & contenu** : mentions/CGV/confidentialité, retirer les allégations non prouvées, landing complète, SEO de base.
7. **Mobile & perf** : studio responsive, code-splitting.
8. **Dette** : code mort, conventions, catalogue centralisé, tests, mise à jour de `CLAUDE.md`.
