# LumiCut — Check-up du 20 novembre 2026

Check-up complet du site après les chantiers studio 3D, bibliothèque de motifs, styles de découpe et caméra.
Il reprend l'audit du départ (`docs/AUDIT.md`) : pour chaque point, on indique s'il est corrigé, toujours ouvert ou nouveau.

**Méthode** : tout a été vérifié dans un navigateur piloté, en vrai :
- 15 pages sur ordinateur et sur mobile (iPhone 13) ;
- le studio section par section, en 2D et en 3D : motif, texte, format (y compris le sur-mesure aux limites),
  matériau, LED, ajuster, fixation, cadeau, « Voir sur mur », conseiller, sauvegarde, partage ;
- un panier de deux articles différents, jusqu'au formulaire de paiement ;
- les 8 pages de l'admin ;
- un build de production et une mesure du temps de calcul des styles de découpe ;
- une relecture du code pour chaque point de l'audit.

Légende : 🔁 déjà dans `docs/AUDIT.md`, toujours ouvert · 🆕 trouvé pendant ce check-up · « vu » = constaté à l'écran.

---

## 1. Ce qui marche (vérifié)

- **Studio** : les 7 sections répondent en 2D comme en 3D, sans erreur dans la console.
  - Édition à la souris, annuler / rétablir, contrôle de fabrication en direct.
  - Bibliothèque de 271 motifs réels, avec crédits et licences ; aucun morceau ne tombe au format M sur les silhouettes.
  - Styles de découpe : contour, échos, lignes, points.
  - Caméra : 7 pièces × 3 poses testées, elle ne sort jamais de la pièce et ne passe pas sous le décor.
- **Sauvegarde et partage** : « Mes designs » et le lien de partage restaurent tout (texte, style, position…).
- **Assistant Cadeau** : s'ouvre et fonctionne.
- **Panier** : deux articles, quantités, sous-total, seuil de livraison offerte.
- **Paiement** : formulaire en 3 étapes avec champs obligatoires.
  - Le paiement Stripe lui-même n'a pas pu être testé ici : la machine de test n'a pas accès à Stripe.
- **Pages publiques** : galerie, crédits, pages légales et panier vide s'affichent bien, sur ordinateur comme sur mobile.
- **Build** : le site compile sans erreur.

**Corrigé depuis l'audit** :
- configuration complète gardée dans le panier et dans la commande (audit P2), sauf le motif « En ligne » (voir n° 7) ;
- faisabilité laser (audit F4) : contrôle des îlots et des zones fragiles, polices pochoir, ponts dans la bibliothèque ;
- le lien de partage restaure tout ;
- la fixation se choisit dans le studio ;
- « Voir sur mur » utilise le vrai motif ;
- libellés « SVGRepo » remplacés par « Iconify » ;
- crédits des motifs de la bibliothèque.

---

## 2. P0 — À régler avant d'ouvrir la vente

### Argent et commandes

**1. ✅ Le prix payé est décidé par le navigateur** (audit P1) (corrigé le 23/11, lot 1 — à installer : `MISE-EN-ROUTE.md`)
- Corrigé : la fonction serveur `create-order` recalcule chaque panneau et la livraison avec le même code que le site
  (`src/lib/orderPricing.js`, copié pour le serveur par `npm run build:server`), puis crée la commande et le paiement.
  Le webhook ne passe une commande « payée » que si le montant encaissé est exactement le montant calculé.
- Constat :
  - `create-payment-intent` encaisse le montant envoyé par le navigateur ;
  - le webhook passe ensuite la commande en « payée » sans comparer ce montant au prix ;
  - un client qui modifie la page peut payer 0,50 € un panneau XL.
- Où : `supabase/functions/create-payment-intent`, `supabase/functions/stripe-webhook`, `src/lib/createOrder.js`.
- À faire : une seule fonction serveur qui recalcule le prix à partir de la configuration et crée la commande et le paiement ensemble. Le webhook vérifie le montant reçu.

**2. ✅ Format sur mesure sans limite** (audit P7) (corrigé le 23/11, lot 1)
- Corrigé : bornes 20–150 × 10–80 cm dans le store et sur le serveur, saisie ramenée dans les limites en quittant le champ,
  prix plancher du sur-mesure = prix du format S (59 €, `CUSTOM_MIN_PRICE`).
- Constat (vu) : 1 × 1 cm est accepté, affiché à 0,00 €, et « Ajouter au panier » reste actif. Un 5 × 5 cm est vendu 1,20 €.
- Où : `DimensionSelector.jsx` (les `min` / `max` du champ ne bloquent pas la saisie), `computePrice.js`.
- À faire : bornes 20–150 × 10–80 cm appliquées dans le store, et un prix plancher.

**3. ✅ Seul le premier article du panier est enregistré** (audit P3) (corrigé le 23/11, lot 1 — à installer : `MISE-EN-ROUTE.md`)
- Corrigé : colonne `items` (dimensions, matière, éclairage à préparer, options, design vérifié, prix), sous-total,
  livraison, téléphone ; l'admin affiche tous les panneaux de la commande.
- Constat : un panier M acrylique + L bouleau à 223 € donne une commande qui ne décrit que le panneau M. Le second est payé, mais l'atelier ne le voit jamais.
- Où : `createOrder.js` (ne lit que `items[0]`).
- À faire : enregistrer tous les articles (colonne `items`), le sous-total, la livraison et le téléphone.

**4. ✅ Page de confirmation trompeuse** (audit P5) (corrigé le 23/11, lot 1)
- Corrigé : l'état réel du paiement est lu chez Stripe (réussi, en cours, refusé) ; le panier n'est vidé qu'après un paiement abouti.
- Constat :
  - `/order-confirmation` sans numéro affiche « Commande confirmée ! » ;
  - un paiement refusé finit sur « Commande reçue ! » ;
  - le panier est vidé dans tous les cas.
- À faire : lire `redirect_status`, gérer l'échec, ne vider le panier qu'après un paiement réussi.

**5. ✅ Commandes en double et webhook fragile** (audit P4, P6) (corrigé le 23/11, lot 1 — à installer : `MISE-EN-ROUTE.md`)
- Corrigé : un passage en caisse = une commande et un paiement, même après des allers-retours ; événements Stripe
  traités une seule fois (`stripe_events`), échecs, remboursements et historique gérés par la base (`order_event`).
  Purge des commandes jamais payées après 30 jours : `purge_abandoned_orders` (tâche planifiée facultative).
- Une nouvelle commande « en attente » est créée à chaque aller-retour entre le récapitulatif et le paiement.
- Le webhook ne gère ni les événements rejoués, ni les remboursements, ni l'historique des statuts.

### Fabrication

**6. 🔁 Aucun fichier de découpe complet** (audit F1–F3)
- Constat :
  - le bouton de production de l'admin télécharge **le motif seul**, en SVG : pas de contour du panneau, pas de texte, pas de trous de fixation, pas de dimensions réelles ;
  - le DXF généré par le serveur après paiement est faux : les tailles en cm sont lues comme des mm (panneau de 60 × 30 mm), le motif est absent et les 2 trous sont en dur.
- À faire :
  - générer dans le navigateur (décision de `CLAUDE.md`) un fichier complet en mm : contour, motif vectoriel dans le style choisi et à l'échelle, texte vectorisé, trous de la fixation choisie, kerf ;
  - supprimer ou corriger `generate-order-dxf`.

**7. 🆕 Le motif « En ligne » est perdu à la commande**
- Constat : seul l'identifiant `ai-generated` est enregistré, pas le dessin (`aiMotifSvg` n'est pas dans `DESIGN_KEYS`).
  - L'atelier reçoit un fichier sans motif.
  - Un lien de partage avec ce motif s'ouvre vide.
- À faire : enregistrer le SVG, ou la référence Iconify (collection + icône), dans le design.

**8. 🆕 Le fichier n'est pas figé au moment de la commande**
- Constat : les motifs de la bibliothèque sont relus dans `public/library` quand l'atelier télécharge le fichier. Si la bibliothèque est reconstruite entre-temps, le panneau fabriqué peut différer de celui qui a été vu et payé.
- À faire : stocker au paiement le SVG final de découpe avec la commande (Supabase Storage), ou à défaut une version de la bibliothèque.

**9. 🆕 Le texte par défaut fait tomber des morceaux**
- Constat (vu) : avec la police par défaut, « Léa & Hugo » donne 11 morceaux qui tombent (intérieur des a, o, e, &). Le contrôle l'affiche et propose une police pochoir, mais rien n'empêche de commander.
- À faire, au choix :
  - une police pochoir par défaut ;
  - des ponts automatiques sur le texte ;
  - au minimum, une confirmation explicite avant l'ajout au panier quand des morceaux tombent.

**10. 🆕 Le texte se pose sur le motif**
- Constat (vu) : en activant le texte sur un M, il passe sur le cercle de l'Arbre de Vie et les découpes se mélangent.
- À faire : mise en page automatique à l'ajout du texte (motif réduit et remonté), ou alerte de chevauchement dans le contrôle de fabrication.

### Sécurité et données

**11. ✅ Admin ouvert à tous** (audit S1) (corrigé le 23/11, lot 1 — à installer : `MISE-EN-ROUTE.md`)
- Corrigé : connexion par compte Supabase (email + mot de passe) inscrit dans la table `admins` ; plus de mot de passe
  dans le code ni de passe-droit dans le navigateur. Mode démo seulement en développement sans Supabase.
- Le mot de passe est écrit dans le code public (`lumicut2024`).
- Surtout, il suffit d'écrire `lumicut_admin_auth = true` dans le navigateur pour entrer : c'est ce qu'a fait ce check-up.
- À faire : Supabase Auth et un rôle admin vérifié par la base.

**12. ✅ Base de données ouverte** (audit S2) (corrigé le 23/11, lot 1 — à installer : `MISE-EN-ROUTE.md`)
- Corrigé : règles d'accès (RLS) sur toutes les tables, vérifiées sur un Postgres 16 : un visiteur ou un client ne voit
  aucune commande, seul un administrateur lit et modifie ; les fonctions de statut ne sont appelables que par le serveur.
- Constat : le schéma du dépôt n'active aucune règle d'accès (RLS).
  - Si rien n'a été ajouté à la main dans Supabase, la clé publique du site permet de lire toutes les commandes (noms, emails, adresses), de les passer en « payée » ou de les supprimer.
  - La page de confirmation et l'admin ne fonctionnent d'ailleurs que parce que la base est ouverte.

**13. ✅ Clé de l'API d'IA exposée, et IA cassée en production** (audit S3) (corrigé le 23/11, lot 1 — à installer : `MISE-EN-ROUTE.md`)
- Corrigé : fonction serveur `ai-advisor` (clé secrète côté serveur, consigne fixée par le serveur, 30 messages par heure
  et par visiteur, 1 500 par jour) ; la recherche « En ligne » appelle directement l'API Iconify une fois en ligne.
  Configuration d'hébergement ajoutée le 23/11 (`netlify.toml`, `vercel.json`).
- Constat :
  - la clé Anthropic est une variable `VITE_`, donc incluse dans le code envoyé à chaque visiteur ;
  - le conseiller et la recherche « En ligne » passent par des proxys qui n'existent qu'en développement (`vite.config.js`) : une fois le site en ligne, les deux ne marchent pas ;
  - le dépôt n'a aucune configuration d'hébergement pour les remplacer.
- À faire : deux fonctions serveur Supabase qui gardent la clé secrète, avec une limite d'appels.

**14. ✅ Autres failles** (audit S4–S8) (corrigé le 23/11, lot 1)
- Corrigé : emails, fichier de découpe et relances réservés au serveur et aux administrateurs ; textes des clients
  échappés dans les emails et le bon de livraison ; SVG externes réduits à leurs formes (rien d'exécutable) ;
  `.env` ignoré par Git (modèle : `.env.example`).
- Fonctions serveur appelables par n'importe qui (emails, DXF, paiement).
- HTML non échappé dans les emails et le bon de livraison.
- SVG externes non nettoyés de leurs scripts.
- `.env` absent du `.gitignore`.

---

## 3. P1 — Bugs visibles

### Studio

**15. ✅ Identifiants techniques affichés au client** (corrigé le 23/11 avec l'éclairage Philips Hue)
- Constat (vu) : « acrylic black », « birch plywood », « warm » dans le récapitulatif du studio et dans le panier.
- Où : `Studio.jsx` (`Summary`), `Cart.jsx`.
- À faire : afficher les libellés (Acrylique noir, Contreplaqué bouleau, Blanc chaud).

**16. 🆕 Styles de découpe lents sur les grands formats**
- Constat (mesuré) : contour et échos prennent 3 à 4,7 s au format XL, contre 0,2 à 0,7 s en M, sur la machine de test.
  - Le calcul tourne sur le fil principal : l'interface reste figée pendant ce temps, à chaque changement de taille ou de réglage.
  - Un PC récent ira plus vite, un téléphone non.
- À faire : calcul dans un Web Worker, aperçu basse résolution pendant le geste, puis calcul fin.

**17. 🆕 Conseiller IA à revoir** (en partie corrigé le 23/11 : fenêtre, passage côté serveur et modèle actuel)
- ~~Sa fenêtre recouvre le bouton « Ajouter au panier ».~~ Corrigé le 23/11 : elle s'ouvre depuis le lien « Besoin d'aide pour choisir ? » de chaque étape, au-dessus du bouton d'étape.
- Il ne connaît que 3 motifs (Arbre de Vie, Mandala, Cerf) au lieu des 271 de la bibliothèque.
- Ses propositions sont appliquées sans vérifier les identifiants.
- ~~Le modèle d'IA utilisé date d'une génération précédente.~~ Corrigé avec le passage côté serveur (n° 13).

**18. ✅ Comparateur de taille faux** (corrigé le 23/11 avec le parcours par étapes) : il multipliait les cm par 10, si bien que le panneau paraissait 10 fois trop grand à côté de la silhouette (`SizeComparator.jsx`).

**19. 🔁 Options payantes mal gérées** (en partie corrigé le 23/11)
- ~~Variateur et emballage cadeau ne peuvent plus être retirés une fois ajoutés.~~ Corrigé : cases à cocher dans l'étape Résumé.
- ~~L'assistant Cadeau inverse l'emballage s'il était déjà coché.~~ Corrigé : il l'ajoute sans l'inverser.
- La gravure est facturée 5 €, mais aucun champ ne permet de la saisir.

**20. 🔁 « Voir sur mur »** : le bouton de réalité augmentée n'est qu'une alerte.

### Panier et livraison

**21. ✅ Livraison** (corrigé le 23/11, lot 1)
- ~~« Livraison offerte » affichée quel que soit le pays.~~ Corrigé : « offerte en France ».
- ~~Le supplément grand format n'est jamais appliqué (seuil 800 au lieu de 80 cm).~~ Corrigé : +5 € dès 80 cm, hors livraison offerte.

**22. 🔁 Délais contradictoires** : « Livraison 7 jours » (pied de page), « 8 jours ouvrés » (studio), J+7 calendaires (emails).

### Admin

**23. 🔁 Données fictives et date figée**
- Constat (vu) : la vue d'ensemble affiche « jeudi 16 avril 2026 » comme date du jour.
- ~~Les 20 commandes fictives restent affichées tant que la base est vide.~~ Corrigé le 23/11 : seulement en mode démo (développement sans Supabase).

**24. 🔁 Formats incompatibles entre la boutique et l'admin**
- ~~L'adresse est lue avec de mauvais noms de champs.~~ Corrigé le 23/11 : les deux formats sont lus.
- La taille est enregistrée « 60×30 cm », mais les filtres et les graphiques attendent S / M / L / XL.
- ~~Le statut « failed » est inconnu de l'admin, et la fiche plante si l'historique est vide.~~ Corrigé le 23/11.

**25. 🆕 Motifs de la bibliothèque mal nommés** : l'admin ne connaît que 3 noms de motifs ; les autres apparaissent sous leur identifiant brut (`lib:coq`…).

**26. 🔁 Emails**
- L'email « en fabrication » n'est jamais envoyé : la clé `production` ne correspond pas au statut `in_production`.
- Changer un statut depuis le Kanban n'envoie rien, et aucun champ ne permet de saisir le numéro de suivi.
- La relance d'avis filtre sur une colonne qui n'existe pas (`updated_at`) et échoue.

**27. 🆕 La page Emails plante** quand Supabase n'est pas configuré (pas de garde, contrairement aux autres pages).

**28. 🔁 Quatre pages vides** : Clients, Catalogue, Avis et Statistiques affichent « Bientôt disponible ».

---

## 4. P2 — Mobile, confiance, légal, référencement

**29. 🔁 Studio inutilisable sur mobile** (studio corrigé le 23/11 : aperçu en haut, étape en dessous, prix et bouton « Suivant » en bas ; restent le configurateur de boîtes et l'en-tête de l'accueil)
- Constat (vu) : colonnes fixes, aperçu masqué, colonne de droite coupée.
- Même chose pour le configurateur de boîtes, et l'en-tête de l'accueil se chevauche.
- C'est le cœur du site : à traiter en premier dans ce lot.

**30. ✅ Allégations à retirer** (corrigé le 23/11 avec la nouvelle page d'accueil)
- ~~« 4.9/5 clients satisfaits » sans aucun avis collecté.~~ Retiré.
- ~~« Satisfait ou remboursé » et « Retour 30 jours ».~~ Retirés de l'accueil et du pied de page.

**31. 🔁 Mentions légales, CGV et confidentialité incomplètes**
- Mentions légales : responsable, adresse, SIRET, TVA.
- CGV : garantie légale de conformité de 2 ans, médiateur de la consommation.
- Confidentialité : sous-traitants manquants (Anthropic, Resend, Iconify, Google Fonts, hébergeur), et polices chargées depuis les serveurs de Google.

**32. 🆕 Licences de la recherche « En ligne »**
- Constat : toutes les collections Iconify sont proposées, y compris celles dont la licence interdit l'usage commercial ou la modification.
- À faire : ne garder que les licences compatibles avec la vente, comme pour la bibliothèque, et enregistrer licence et auteur avec la commande.

**33. ✅ Accueil vide** (corrigé le 23/11 : accueil en scrollytelling)
- ~~L'accueil se limite au bandeau principal.~~ Récit en 9 chapitres (motif, découpe, format, matière, lumière, jour/nuit, pose, fabrication), tarifs réels, galerie, questions fréquentes. Pas d'avis : il n'y en a pas encore.
- ~~Les liens « Tarifs » et « Galerie » pointent vers des sections qui n'existent pas.~~ Les sections existent, et les liens marchent depuis toutes les pages.
- ~~Le studio n'a pas d'accès au panier.~~ Corrigé le 23/11 : lien Panier dans l'en-tête du studio.

**34. 🔁 Référencement**
- ~~`index.html` : langue « en » et titre « Laser Cut Box Configurator ».~~ Corrigé le 23/11 : français, titre et description.
- Ni description, ni favicon, ni `robots.txt`, ni sitemap.
- Pas de page 404 : une adresse inconnue donne une page blanche.

**35. 🔁 Poids du site**
- Stripe.js est chargé sur toutes les pages, accueil et admin compris (performance et RGPD).
- Le code principal pèse 2,2 Mo (636 Ko compressé) : three.js (configurateur de boîtes), recharts (admin) et Stripe sont chargés pour tout le monde.
  - Mise à jour du 24/11 : configurateur de boîtes supprimé, three.js n'est plus chargé qu'avec la vue 3D ; code principal à 1,26 Mo (≈ 390 Ko compressé). Restent recharts et Stripe.
- À faire : découper le code par page et ne charger Stripe que sur `/checkout`.

**36. ✅ Pied de page** : ~~« © 2025 »~~ année du jour (corrigé le 23/11).

---

## 5. P3 — Dette technique

**37.** `CLAUDE.md` est obsolète :
- il annonce « Sprint 2 — générateur IA de motifs » en cours et « API Anthropic pour la génération de motifs » ;
- il ne mentionne ni la vue 3D, ni la bibliothèque, ni les styles de découpe, ni la caméra.

**38. ✅** Code mort (supprimé le 24/11) :
- ~~éditeur Fabric : `PanelEditor`, `CanvasToolbar`, `ObjectToolbar`, `canvasHistory`, `fabricHelpers`~~, ainsi que `useDrag` et les modèles d'emails React Email jamais utilisés (`supabase/functions/_shared/emails`) ;
- ~~dépendances `fabric`, `dxf-writer`, `react-email`, `@react-email/components`~~ (196 paquets en moins à l'installation).

**39. ✅** Configurateur de boîtes (héritage) : supprimé le 24/11 (pages `/box/*`, gabarits, calculs, dépendance `@tarikjabiri/dxf`).
La règle de `CLAUDE.md` « kerf appliqué dans `computePieces()` » vaudra pour la future géométrie des panneaux (lot 2, voir `docs/PROPOSITION-STUDIO-3D.md`).

**40.** Grilles de prix et libellés dupliqués :
- dans `computePrice`, `DimensionSelector`, `MaterialSelector`, le prompt du conseiller et l'admin ;
- à regrouper dans un seul module catalogue ;
- le supplément LED « rgb », du code mort, a été retiré le 23/11 (l'éclairage est tarifé par `lib/lighting`).

**41.** Fichiers écrits sur une seule ligne, illisibles (`PriceDisplay`, `ARViewer`, `UpsellBanner`, `GiftWizard`, `ShareDesignButton`…), et commentaires en anglais.

**42.** Aucun test ni lint dans `package.json`. Commencer par :
- le prix ;
- la livraison ;
- le sérialiseur de design ;
- un parcours de commande complet en mode test Stripe.

---

## 6. Ordre de travail proposé

1. ✅ **Encaisser sans risque** (n° 1–5, 11–14) — fait le 23/11, à installer avec `MISE-EN-ROUTE.md` :
   - comptes admin et règles d'accès ;
   - fonction serveur qui recalcule le prix et enregistre tous les articles ;
   - webhook qui vérifie le montant ;
   - confirmation honnête ;
   - bornes du sur-mesure.
2. **Fabriquer exactement ce qui est vendu** (n° 6–10) :
   - fichier de découpe complet en mm, figé à la commande ;
   - motif « En ligne » sauvegardé ;
   - texte sans morceaux qui tombent ;
   - mise en page du texte et du motif.
3. **Mettre en ligne** (n° 13, 35) :
   - conseiller et recherche via des fonctions serveur ;
   - ~~configuration d'hébergement (réécritures vers `index.html`)~~ fait le 23/11 (`netlify.toml`, `vercel.json`) ;
   - Stripe chargé seulement au paiement, code découpé par page.
4. **Corriger les bugs visibles** (n° 15–22) : libellés, styles calculés en tâche de fond, comparateur, options, livraison.
5. **Fiabiliser l'admin** (n° 23–28) : formats alignés, emails à chaque changement de statut, suivi colis, plus de données fictives ni de date figée.
6. **Mobile et confiance** (n° 29–34, 36) : studio utilisable au téléphone, accueil complet, textes légaux, allégations, référencement, page 404.
7. **Dette** (n° 37–42).
