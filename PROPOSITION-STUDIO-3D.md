# Studio 3D LumiCut : rétro-ingénierie du configurateur Portaliers et proposition

> Analyse réalisée le 19/11/2026 sur https://www.lesportaliers.com/fr/configurateur-3d,
> via un navigateur headless (requêtes réseau + captures).
> Un prototype fonctionnel de la proposition est inclus dans cette branche (§ 3).

---

## 1. Le configurateur des Portaliers : ce qu'il y a sous le capot

### 1.1 Technique

| Constat | Détail |
|---|---|
| Intégration | La page du site n'est qu'une **iframe** vers `configurateur.lesportaliers.com` |
| Moteur | Application **Unity WebGL** (« Portaliers 3D » v3.5, studio PixelDeLune, titre d'onglet « Horizal 3D ») |
| Fichiers | `WebGL.loader.js` 26 Ko · `WebGL.framework.js` 495 Ko · `WebGL.wasm` 57 Mo (14 Mo gzip) · `WebGL.data` **314 Mo servis sans compression** |
| Poids au premier chargement | **≈ 330 Mo** (ensuite en cache navigateur) |
| Mobile | Détection par user-agent : message bloquant en portrait, paysage obligatoire (contournable avec `?force=1`) |
| Tutoriel | Vidéo MP4 en surimpression au lancement, bouton « Passer le tutorial » |
| Import photo | Plugin Unity de sélection de fichier (popup HTML + `<input type="file" accept=".png, .jpg">`) |
| Interface | Entièrement dessinée dans le canvas : pas de SEO, pas d'accessibilité, pas d'URL par configuration |
| Motifs découpés | Rendus comme des **textures avec transparence** posées sur les panneaux (pas de géométrie recalculée), d'où un changement instantané |

### 1.2 Parcours utilisateur

1. **Accueil** : 6 « collections » en cartes (photo d'ambiance + accroche) : LAZER (motifs découpés au laser), ANODIK, CONTEMPORAIN, RÉVÉLATION, ÉLYSIUM (LED intégrées), TRADITION.
2. **Configurateur** :
   - en haut, un **fil d'Ariane vivant** (« Modèle IZIS / Motif BOURBON / Coloris RAL 7022 »), une recherche de modèle, une bascule **nuit** (lune) et un bouton qui masque toute l'interface ;
   - au centre, la **scène 3D** : portail entre deux piliers, sol gravillonné, ciel uni ; caméra orbitale **bridée** (rotation et zoom limités) ;
   - à droite, un **menu contextuel selon la collection** : COLORIS (grille RAL + bi-coloration), MOTIFS (vignettes), LAMES, REMPLISSAGE, PILIERS, ÉCLAIRAGE LED (Jour/Nuit + Éteint / Blanc chaud / Blanc froid / Bleu), SAUVEGARDER MES MODÈLES et **DEMANDER UN DEVIS** (bouton jaune) ;
   - à gauche, « **Ouverture portail** » (animation des vantaux) et « **Intégration photo** » (mise en situation sur la photo de sa maison) ;
   - en bas, un **carrousel des modèles** de la collection.
3. **Devis** : fenêtre avec une **vue de face du portail configuré**, le récapitulatif (collection, modèle, motif, couleur, lames) et un formulaire (nom, email, téléphone, code postal → « ville la plus proche » du réseau d'installateurs, battant/coulissant, commentaire, consentement). **Aucun prix affiché.**

*Non testé : l'import photo ne se déclenche pas dans un navigateur headless. Sa description vient de leur page de présentation.*

### 1.3 À reprendre

- Changement de motif ou de couleur **instantané** (texture, pas de géométrie).
- **Fil d'Ariane** qui résume la configuration en permanence.
- Menus **courts, visuels (vignettes) et contextuels**.
- **Mode nuit** en un clic.
- **Mise en situation** sur une photo du client.
- La vue « produit fini » **réutilisée** dans l'étape suivante (devis).

### 1.4 À éviter

- **330 Mo** à télécharger, mobile quasiment exclu.
- Rendu de nuit plat : aucun halo ni diffusion de lumière visible (constaté en rendu logiciel, à confirmer sur un vrai GPU).
- Pas de prix ni de panier : le client sort du tunnel vers un formulaire.
- Pas de lien de partage, pas de réalité augmentée, pas de SEO ni d'accessibilité.
- Tutoriel vidéo imposé au lancement.

---

## 2. Proposition pour LumiCut : un « Studio 3D » en React Three Fiber

**Pourquoi pas Unity** : poids, mobile, SEO, et toute ta boutique (prix, panier, partage) est déjà en React. `three`, `@react-three/fiber` et `@react-three/drei` sont **déjà dans `package.json`**.

### 2.1 Rendu d'un panneau rétroéclairé

| Élément | Technique | Pourquoi |
|---|---|---|
| Panneau découpé | Masque de découpe dessiné dans un canvas 2D à partir du **même SVG et du même texte** que l'aperçu 2D → `alphaMap` + `alphaTest` sur 7 tranches empilées (l'épaisseur se voit de biais) | Instantané comme chez Portaliers, compatible avec tout SVG (bibliothèque, Iconify, texte) |
| Lumière dans les découpes | Plaque « diffuseur opale » derrière le panneau, couleur = **couleur LED exacte** × intensité | Le client choisit une couleur : elle ne doit pas virer (un bleu poussé trop fort devient cyan) |
| Halo sur le mur | `RectAreaLight` entre le panneau et le mur, tournée vers le mur | Halo crédible qui suit la taille du panneau |
| Effet lumineux | Bloom (post-processing) : seuil bas la nuit, quasi nul le jour | Le jour la LED se voit peu, la nuit c'est spectaculaire : c'est la réalité du produit |
| Matières | Rendu PBR (acrylique brillant / MDF mat), veinage bois procédural | 5 matières différenciées sans aucun fichier image |
| Ombres | Ombre portée du panneau sur le mur en journée (entretoises de 3 cm) | Montre le relief et le montage |
| Pièce | 7 pièces fermées (mur, murs latéraux, sol, plafond, fenêtre ou porte) et leur mobilier, générés en code | Échelle réelle immédiate (le comparateur de taille actuel est faux d'un facteur 10) |
| Pose | Mur (entretoises), plafond (face vers le sol, halo sur le plafond), suspendu (câbles + rosaces, lumière renvoyée vers le plafond) | Le client voit le panneau là où il l'installera |
| Caméra | `CameraControls` bridé et 4 cadrages : **Face, 3/4, Détail, Pièce** | Comme Portaliers, plus un cadrage « Détail » pour montrer la finesse de découpe |
| Caméra guidée | Chaque section du studio amène la caméra sur la zone travaillée (texte, chant de la matière, halo, fixation), comme dans le garage d'un jeu de voiture ; désactivable | Le client voit immédiatement l'effet de ce qu'il modifie |
| Fixations | Quincaillerie modélisée pièce par pièce (cheville, vis, entretoise, tige filetée, capuchon, platine, serre-câble, rosace), trous percés dans le panneau, vue éclatée animée, câble d'alimentation | Le client comprend la pose et sait ce qu'il reçoit |
| Environnement | Reflets générés par des `Lightformer`, aucun fichier HDR | Zéro téléchargement d'asset |

### 2.2 Budget performance

- Vue 3D chargée **à la demande** : **426 Ko (153 Ko gzip)** mesurés sur le prototype, contre ≈ 330 Mo chez Portaliers. Note : three.js est déjà dans le bundle principal à cause du configurateur de boîtes ; une fois ce point réglé (voir `AUDIT.md`), la 3D chargera aussi three.js à la demande.
- `frameloop="demand"` : aucun rendu quand rien ne bouge (batterie), DPR 1 à 2, texture de découpe à 1024 px sur mobile.
- **Repli automatique** sur l'aperçu 2D actuel si WebGL est indisponible.

### 2.3 Parcours proposé (vente directe)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← LumiCut   Arbre de vie · 60×30 · Acrylique noir · Blanc chaud   129 €  │ ← fil d'Ariane + prix vivant
├─────────────┬──────────────────────────────────────────┬─────────────────┤
│ Motif       │ [Face][3/4][Détail][Pièce]           📸  │ Récapitulatif   │
│ Texte       │                                          │ Prix · Livraison│
│ Format      │        SCÈNE 3D (pièce + panneau)        │ [Ajouter au     │
│ Matière     │                                          │   panier]       │
│ Lumière     │ ☀/🌙  💡  Intensité ───●──   60 × 30 cm   │ Sauver/Partager │
│ Options     │ ◀  carrousel des motifs de la collection ▶│                 │
└─────────────┴──────────────────────────────────────────┴─────────────────┘
```

Sur mobile : scène en haut (≈ 55 % de l'écran), onglets dans un panneau coulissant en bas, bouton panier toujours visible. **Aucun blocage en portrait.**

1. Écran d'entrée « collections » optionnel (Nature, Géométrique, Animaux, Prénoms & dates, Créer le mien), en HTML pour le SEO.
2. Fil d'Ariane et prix toujours visibles.
3. Carrousel de motifs sous la scène (changement en un clic).
4. Jour / Nuit, Allumé / Éteint et **Intensité**, qui met en valeur l'option variateur.
5. 4 cadrages et rotation bridée.
6. **« Voir chez moi »** :
   - a) photo du mur en fond, panneau placé à l'échelle grâce à un calibrage (2 points + une cote connue), simulation de nuit ;
   - b) **réalité augmentée native** : export GLB/USDZ du panneau configuré (`GLTFExporter` / `USDZExporter` de three) vers Quick Look (iOS) et Scene Viewer (Android) via `<model-viewer>`. Portaliers n'a rien de tel.
7. **Capture** réutilisée comme vignette du panier et de la commande (le panier stocke aujourd'hui `previewSVG: null`).
8. Sauvegarder et partager par lien (existe déjà, à compléter).
9. « Demander un devis » réservé au sur-mesure hors gabarit et aux professionnels (leur modèle) ; tout le reste en achat direct.

### 2.4 Architecture

```
src/components/studio/scene/
  Studio3D.jsx      Canvas, éclairage jour/nuit, pose (mur/plafond/suspendu), caméra, bloom, surcouche
  LitPanel.jsx      panneau découpé, diffuseur, chants, entretoises, halo
  RoomScene.jsx     pièce fermée : murs, sol, plafond, plinthes, fenêtre, porte
  RoomFurniture.jsx mobilier de chaque pièce (repère d'échelle)
  Fixings.jsx       quincaillerie, vue éclatée, câbles de suspension, câble d'alimentation
src/components/studio/
  FixingSelector.jsx section « Fixation » : pose, type, déport, perçage, kit, alerte, alimentation
src/lib/
  fixings.js        types de fixation, déports, position des trous, contenu du kit (fonctions pures)
  panelDesign.js    état du configurateur → description de découpe (motif, texte, trous)
  useDamped.js      animation amortie compatible avec le rendu à la demande
  cutMask.js        masque de découpe (motif + texte) dans le repère 200 de l'aperçu 2D
  panelMaterials.js matières PBR, couleur LED sûre, détection WebGL
  rooms.js          liste des pièces et des poses (données pures, sans three.js)
```

**Étape structurante suivante** : une source unique de géométrie `computePieces(config)` pour les panneaux (contour, découpes, texte vectorisé via opentype.js, trous d'entretoises, kerf), utilisée **à la fois** par la 3D (kerf 0) et par le DXF de production. Ce que le client voit sera exactement ce qui est découpé, et la règle de `CLAUDE.md` « kerf appliqué dans `computePieces()` » sera respectée.

---

## 3. Prototype livré dans cette branche

- Bascule **2D / 3D** dans le studio (3D par défaut si WebGL est disponible ; l'aperçu 2D reste intact).
- Tout le §2.1 : découpe, diffuseur, halo, bloom, matières, ombres, 4 cadrages, curseur d'intensité, capture PNG, cote en cm.
- **7 pièces** (Salon, Chambre, Chambre d'enfant, Bureau, Entrée, Salle à manger, Restaurant / bar), au choix dans la barre d'outils.
- **3 poses** : Mur, Plafond, Suspendu. Au plafond, le cadrage « Face » devient « Dessous ». La pose et la pièce sont incluses dans les liens de partage et les designs sauvegardés, et la pose s'affiche dans le récapitulatif.
- **Caméra guidée** : Motif et Ajuster → face ; Texte → gros plan sur le texte ; Format → vue pièce ; Matériau → coin du panneau (chant et épaisseur) ; LED → 3/4 sur le halo ; Fixation → gros plan sur une fixation. Bouton « 🎥 Auto » pour la désactiver ; recliquer sur une section recadre.
- **Section Fixation** :
  - entretoises inox, noires ou laiton, ou fixation invisible (platines collées, aucun trou en façade) ; câbles acier en suspension ;
  - déport 20, 30 ou 40 mm (le halo s'étale en conséquence) ;
  - perçage affiché (nombre, Ø, distance aux bords) et contenu du kit livré ;
  - **les trous sont réellement découpés** dans le panneau 3D, à la position calculée par `lib/fixings.js` (4 coins, 6 points au-delà de 100 cm de large) ;
  - **alerte** quand un capuchon touche une découpe du motif ou du texte, avec la marche à suivre ;
  - câble d'alimentation apparent jusqu'à une prise, ou encastré ; au plafond, raccordement DCL ;
  - **vue éclatée animée** : cheville → vis → entretoise → panneau → capuchon ;
  - de nuit, un « éclairage atelier » s'allume sur le plan fixation pour que le métal reste visible.
- Les fixations sont incluses dans le prix (« incl. ») : à ajuster si certaines finitions doivent être payantes.
- ⚠️ La pose et la fixation ne sont **pas encore transmises au panier ni à la commande** (même problème que le reste de la configuration, voir P2 dans `AUDIT.md`). Or l'atelier doit savoir qu'un panneau va au plafond (fixations différentes).
- Nouvelles dépendances : `@react-three/postprocessing@2.16.3` et `postprocessing@6.36.6`, forcée via `overrides` pour rester compatible avec `three@0.167`.
- Vérifié sur des captures : acrylique noir et contreplaqué, blanc chaud et bleu, les 7 pièces, les 3 poses, jour et nuit, les 4 cadrages.
- Dans l'aperçu 2D, les nouvelles pièces reprennent les couleurs du salon.

**Limites connues**

- Les découpes sont une transparence, pas une vraie géométrie : les **îlots** (intérieur des O, A, e ; disque central de l'Arbre de vie entouré de son anneau) restent affichés alors qu'ils tomberaient à la découpe sans diffuseur collé. C'est l'objet de la phase 2.
- De très près et à angle rasant, une légère stratification des chants reste visible.
- Rendu vérifié uniquement en **rendu logiciel** (SwiftShader) : à tester sur de vrais GPU et sur mobiles.
- Pas encore fait : mise en page mobile (le studio entier n'est pas responsive), carrousel, collections, photo et AR, envoi de la capture au panier.

**Bug repéré au passage (aperçu 2D, lecture du code)** : `PanelPreview` retire la balise `<svg>` des motifs Iconify, donc leur `viewBox`. Une icône en 24×24 s'affiche minuscule, une icône en 512×512 déborde. La vue 3D, elle, respecte la `viewBox`.

---

## 4. Plan proposé

| Phase | Contenu | Ordre de grandeur (1 personne) |
|---|---|---|
| 1. Studio 3D v1 | Du prototype à la production : mise en page mobile, fil d'Ariane + prix, carrousel de motifs, capture → panier/commande, réglage de qualité automatique (`PerformanceMonitor`), tests multi-appareils | 1,5 à 2 semaines |
| 2. Jumeau numérique | `computePieces` pour les panneaux (SVG → contours, texte vectorisé, kerf), DXF de production issu de la même géométrie, alertes de faisabilité (îlots, traits trop fins), géométrie extrudée pour la vue Détail | 2 à 3 semaines |
| 3. Voir chez moi | Photo + calibrage + simulation de nuit, AR iOS/Android (USDZ/GLB) | 1,5 à 2 semaines |
| 4. Habillage | Écran collections, pièces modélisées (GLB < 1 Mo), éclairage HDR auto-hébergé, statistiques d'usage du configurateur | 1 à 2 semaines |

---

## 5. Questions à trancher (fabrication)

1. Y a-t-il un **diffuseur opale** derrière la découpe, ou la lumière traverse-t-elle les découpes jusqu'au mur ? Le prototype suppose un diffuseur.
2. **Îlots** : ponts automatiques (style pochoir) ou collage sur le diffuseur ?
3. Épaisseurs réelles par matière, distance au mur, position des LED (périmètre arrière ? tournées vers le mur ?).
4. La « couleur personnalisée » des LED est-elle réellement fabricable (ruban RGB) ? Sinon, limiter le sélecteur aux teintes proposées.
5. Le module boîtes (`/box`) reste-t-il dans LumiCut ? Il pèse sur le bundle principal.
6. **Fixations** : les valeurs du prototype sont des hypothèses courantes (trous Ø 10 mm à 3 cm des bords, entretoises Ø 19 mm, déports 20/30/40 mm, câbles Ø 1,5 mm, 6 points au-delà de 100 cm) : à remplacer par la quincaillerie réellement achetée, dans `src/lib/fixings.js`. Les finitions noire/laiton et la fixation invisible doivent-elles être payantes ?
7. Les trous de fixation devront être ajoutés au DXF de production (calque « perçage ») en réutilisant `computeFixingHoles()`.

---

## 6. Motifs : contrôle de fabrication, générateurs et catalogue (20/11/2026)

### 6.1 Constat (mesuré)

Analyse de découpe des motifs existants, format M (60 × 30 cm) :

| Motif | Problème |
|---|---|
| Arbre de vie | Cercle fermé : **tout le disque intérieur (≈ 400 cm²) tombait**, plus 9 petits morceaux entre les branches |
| Mandala | Anneaux fermés : **14 morceaux tombaient** |
| Cerf | L'œil (disque de matière au milieu de la tête découpée) tombait |
| Texte (police classique) | L'intérieur des O, A, e, B tombe (ex. « Bonne nuit » : 5 morceaux) |

### 6.2 Contrôle de fabrication (`src/lib/cutAnalysis.js`)

À partir du masque de découpe (motif + texte + trous de fixation, ≈ 0,5 mm par pixel) :
- **îlots** : matière non reliée au bord du panneau → tombe (en rouge) ;
- **parties fragiles** : matière reliée seulement par un passage plus fin que le minimum du matériau (en orange) ;
- **zones trop fines** : bandes de matière plus étroites que ce minimum (en jaune).

Recalculé automatiquement à chaque modification (`useCutCheckSync`), affiché dans une carte en haut des sections Motif et Texte, en badge dans la vue 3D, et en surbrillance sur le panneau (2D et 3D). Conseils associés (police pochoir, agrandir, épaissir les ponts).

Les largeurs minimales par matériau (`minBridgeMm` dans `src/lib/panelMaterials.js` : 2,5 mm acrylique, 3 mm bois/MDF) sont des **hypothèses à valider en atelier**.

### 6.3 Générateurs de motifs (`src/lib/generators/`)

8 styles originaux, **sûrs par construction** (aucun morceau ne peut tomber) :

| Style | Principe |
|---|---|
| Montagnes | Chaînes en plusieurs plans, séparées par un pont de matière qui suit la crête ; renforts verticaux ; lune et étoiles |
| Forêt | Sapins à étages espacés d'au moins un pont, sol vallonné, lune et étoiles |
| Ciel étoilé | Étoiles, lune, étoile filante, constellations reliées en arbre (sans boucle) |
| Arbre de vie | Branches en arbre (sans boucle), feuilles séparées, racines, cercle coupé par 4 ponts |
| Organique | Cellules de Voronoï séparées par des ponts de largeur constante |
| Géométrique | Hexagones, losanges, triangles ou briques |
| Mandala | Couronnes de pétales, gouttes, points et losanges séparés |
| Soleil | Disque et rayons pointus, alternés ou en flammes |

- Un motif généré est décrit par `{ type, seed, params }` : la même description redonne **exactement** le même motif (partage, panier, et demain fichier de découpe).
- Les motifs pleine surface sont calculés **en centimètres réels** : ils s'adaptent au format (un grand panneau a plus de cellules, pas des cellules plus grosses), gardent un cadre de 2 cm et **évitent les fixations**.
- Le pont de matière ne descend jamais sous le minimum du matériau.

### 6.4 Catalogue et interface

- Section Motif en 3 onglets : **Catalogue** (22 motifs), **✨ Créer** (8 styles, « 🎲 Autre variante », réglages), **En ligne** (Iconify, avec avertissement).
- L'Arbre de vie et le Mandala sont désormais générés, **sous le même identifiant** (liens, conseiller et administration inchangés) ; le Cerf a perdu son œil.
- Polices **pochoir** auto-hébergées (Saira Stencil One, Stardos Stencil) : plus de lettres qui tombent ; bouton « Utiliser une police pochoir » quand le texte pose problème.
- La galerie publique (`/gallery`) affiche tout le catalogue.
- Les liens de partage et « Mes designs » restaurent **tous** les réglages (motif généré, texte, pose, fixation…) et acceptent accents et emoji.

### 6.5 Limites

- Le motif n'arrive pas encore dans le **fichier de découpe** : la géométrie existe déjà en SVG (en cm pour les motifs pleine surface), la conversion DXF reste à faire (phase 2).
- Le contrôle travaille sur une image (≈ 0,5 mm par pixel) : très fiable pour les morceaux qui tombent, plus approximatif pour les épaisseurs limites.
- Un texte posé sur un motif pleine surface peut chevaucher des formes : le contrôle le signale.
- Les icônes Iconify ne sont pas dessinées pour la découpe et leurs licences varient.

---

## 7. Édition directe à la souris (20/11/2026)

Le motif et le texte se manipulent directement sur le panneau, **en 2D comme en 3D**, avec une barre d'outils flottante au-dessus de l'élément sélectionné. Le panneau latéral reste disponible et suit les mêmes limites.

### 7.1 Gestes

| Geste | Effet |
|---|---|
| Clic sur le motif ou le texte | Sélection : cadre, poignées et barre d'outils |
| Glisser l'élément | Déplacement. Le centre s'aimante sur les axes du panneau (repère bleu) et l'élément s'arrête au bord |
| Alt + glisser | Placement libre : sans aimant ni butée (le centre reste sur le panneau) |
| Poignée d'angle | Agrandir / réduire depuis le centre |
| Poignée ronde | Rotation, aimantée tous les 15° |
| Double-clic sur le texte | Saisie directe dans la barre d'outils |
| Clic dans le vide | Désélection (en 3D, glisser dans le vide fait toujours tourner la caméra) |

Un élément qui grandit ou tourne près d'un bord est repoussé vers l'intérieur. Un élément placé volontairement en débord (Alt) n'est pas déplacé.

### 7.2 Barre d'outils

- **Motif** : − / taille / +, rotation ±15°, miroirs, recentrer.
- **Texte** : A− / A+, rotation, alignement (gauche, centre, droite), ✎ modifier, 🗑 retirer.
- **Motif pleine surface** : 🎲 autre variante, miroirs. Il couvre tout le panneau, donc il ne se déplace pas.
- Partout : annuler, rétablir, fermer.

### 7.3 Clavier (quand un élément est sélectionné)

| Touche | Effet |
|---|---|
| Flèches (Maj : ×10) | Déplacer |
| + / − | Agrandir / réduire |
| R / Maj + R | Tourner de ±15° |
| Suppr | Retirer le texte (Ctrl + Z le remet) |
| Échap | Désélectionner |
| Ctrl + Z, Ctrl + Y (ou Ctrl + Maj + Z) | Annuler, rétablir (50 étapes) |

Un glisser compte pour une seule étape d'historique, un simple clic pour aucune, et une rafale de touches pour une seule.

### 7.4 En 3D

- Sélectionner un élément ramène la caméra **de face**, ou sur le texte, si la caméra guidée (« 🎥 Auto ») est active.
- La caméra est bloquée pendant un geste, puis rendue au relâcher.
- Les poignées gardent la même taille à l'écran, quel que soit le zoom.
- L'édition est coupée pendant la vue éclatée des fixations.

### 7.5 Architecture

| Fichier | Rôle |
|---|---|
| `lib/panelLayout.js` | Repère 200 commun à la 2D, à la 3D et au masque de découpe ; ancrage et encombrement du texte |
| `lib/panelEditing.js` | Fonctions pures : boîtes, poignées, élément sous le pointeur, calcul des gestes, aimants, butées |
| `lib/useElementEditing.js` | Gestes communs aux deux vues (chaque vue convertit le pointeur en point du repère 200) |
| `components/studio/EditorOverlay2D.jsx` | Calque SVG posé sur l'aperçu 2D |
| `components/studio/scene/PanelEditor3D.jsx` | Plan invisible devant la face avant, poignées 3D, barre d'outils via `Html` |
| `components/studio/ElementToolbar.jsx` | Barre d'outils flottante, commune aux deux vues |
| `lib/useEditorShortcuts.js` | Raccourcis clavier |

Le store gagne `textX`, `textY` et `textRotation` (position libre du texte : un bouton Haut / Centre / Bas ou Gauche / Droite la remet à `null`), ainsi que `selectedElement`, `inlineTextEdit` et l'historique. Ces trois réglages de texte sont enregistrés dans les liens de partage et les designs sauvegardés. Le masque de découpe, donc le contrôle de fabrication, suit la nouvelle position, la rotation et la taille du texte.

### 7.6 Limites

- Pensé pour la souris. Au doigt, le glisser utilise les mêmes événements, mais il n'a pas été testé sur téléphone. Pincer pour zoomer ou tourner n'est pas géré.
- Le sous-titre suit le texte principal : il ne se déplace pas séparément.
- Les butées utilisent le carré du motif, pas son dessin réel : un motif rond tourné de 45° est repoussé un peu plus que nécessaire.
- Les curseurs du panneau latéral (Ajuster, Texte) ne sont pas dans l'historique Ctrl + Z.

---

## 8. Bibliothèque de motifs réels (20/11/2026)

Le catalogue du studio n'est plus fait de motifs imaginés par un générateur : c'est une **bibliothèque de
269 dessins réels**, d'origine connue, sous des licences qui autorisent la fabrication et la vente.
Chacun a été **préparé et vérifié pour la découpe laser**.

### 8.1 Contenu

| Thème | Nombre | Exemples |
|---|---|---|
| Forêt & montagne | 20 | Cerf élaphe, loup, renard, ours, lynx, bouquetin, chamois |
| Oiseaux | 25 | Grand-duc, chouette effraie, aigle royal, cigogne, colibri, flamant |
| Savane & monde | 20 | Lion, tigre, éléphant, girafe, zèbre, panda, ours polaire |
| Océan | 17 | Baleine à bosse, orque, dauphin, tortue, raie manta, hippocampe |
| Ferme & compagnie | 13 | Cheval, chat, chien, lapin, poule, âne, taureau |
| Insectes | 12 | Machaon, monarque, libellule, abeille, lucane |
| Dinosaures & légendes | 11 | Tyrannosaure, tricératops, diplodocus, ptéranodon, licorne |
| Végétal | 42 | Chêne, saule, bonsaï, ginkgo, monstera, lotus, rose, bambou |
| Ciel & étoiles | 32 | Soleil, lune, flocons, 18 constellations réelles (Orion, Grande Ourse…) |
| Zodiaque | 24 | Les 12 signes et les 12 constellations du zodiaque |
| Paysages | 8 | Montagnes, vagues, cascade, volcan, île |
| Monuments | 21 | Tour Eiffel, pyramide du Louvre, Tower Bridge, pont du Rialto, moaï |
| Symboles | 24 | Croix occitane, croix de Camargue, lys de Florence, triskèle, attrape-rêves |

Les **cartes du monde** (points, quinconce, lignes) sont un générateur `worldmap` fondé sur les vrais
contours des continents (Natural Earth, 1:50 m) : la carte est recalculée à la taille du panneau, évite
les fixations, et chaque point est un trou isolé (aucun îlot, aucun pont fragile, du S au XL).

### 8.2 Sources

| Source | Motifs | Licence |
|---|---|---|
| PhyloPic : silhouettes dessinées d'après de vrais spécimens | 88 | CC0 / domaine public (81), CC BY (7) |
| game-icons.net : pictogrammes de Lorc, Delapouite et autres auteurs | 148 | CC BY 3.0 |
| Wikimedia Commons | 3 | CC0, domaine public |
| Catalogue Hipparcos (ESA), via d3-celestial | 30 | BSD |
| Natural Earth, via world-atlas (cartes) | générateur | Domaine public, ISC |

Exclus : licences NC (pas de vente), ND (pas de modification, or on ajoute des ponts) et SA. Les licences
CC BY et BSD demandent de citer l'auteur : la page **`/credits`** liste les 269 motifs avec auteur,
licence et lien, et le studio affiche le crédit du motif sélectionné. **Ces deux affichages doivent rester
en ligne** tant que ces motifs sont vendus.

### 8.3 Préparation pour la découpe

Le traitement (`src/lib/library/prepareMotif.js`, paper.js) :

- fusionne les formes, met le dessin au repère 200 du studio et supprime les poussières ;
- tient chaque îlot (œil, intérieur d'une lettre…) par un ou deux **ponts de 3,75 mm**, au plus court ;
- seconde passe au pixel (0,25 mm) : les parties tenues par un passage de moins de 3 mm reçoivent un pont,
  les pointes trop fines pour le laser sont émoussées.

Chaque motif est ensuite contrôlé avec le même outil que le studio (`analyzeCut`) : à 27 cm (format M,
ponts de 3 mm) et à 18 cm (format S, 2,5 mm). Bilan : **0 îlot et 0 pont fragile au format M pour les
269 motifs**. 93 motifs détaillés sont limites au format S : le contrôle du studio le signale alors au
client, qui peut agrandir le motif ou le panneau.

### 8.4 Dans le site

- **Studio, onglet Catalogue** : recherche sans accents (« cerf », « lune », « paris »), 13 thèmes et
  « Cartes », vignettes teintées de la couleur des LED, chargement par pages. Les motifs générés
  (forêts, montagnes, mandalas…) restent dans l'onglet **✨ Créer**, avec leurs « Idées de départ ».
- **Galerie publique** (`/gallery`) : la même bibliothèque, avec recherche ; un clic ouvre le studio.
- **Liens partagés, designs sauvegardés, panier** : le motif est noté `lib:<id>` et rechargé à l'ouverture.
- **Administration** : le fichier de production (bouton de la commande et ZIP « À produire ») contient
  maintenant le vrai SVG des motifs de la bibliothèque.
- Le « Cerf » historique (dessin à main levée) est remplacé par la silhouette réelle du cerf élaphe.
- Supabase : colonnes `author`, `license`, `license_url`, `source_url`, `tags` dans `motifs`
  (`supabase/schema.sql`) ; `node scripts/library/to-sql.mjs` produit le SQL d'import de la bibliothèque.

### 8.5 Ajouter des motifs

Tout est reproductible : `scripts/library/selection.json` (la liste choisie) et
`node scripts/library/build.mjs` (téléchargement, préparation, contrôle, écriture de `public/library/`).
Le mode d'emploi est dans `scripts/library/README.md`. La même chaîne peut préparer **vos propres
dessins** (achetés ou réalisés pour LumiCut).

### 8.6 Limites

- Les dessins game-icons sont des pictogrammes stylisés. Les silhouettes PhyloPic sont plus réalistes, mais
  plutôt scientifiques (animaux de profil). Pour un catalogue haut de gamme, la suite logique est d'ajouter
  des dessins achetés avec une licence commerciale, ou commandés à un illustrateur, avec la même chaîne.
- Les ponts sont posés automatiquement au plus court : le résultat est propre, mais un œil d'illustrateur
  peut parfois mieux les placer. À relire pour les motifs phares.
- Le motif n'arrive toujours pas dans le fichier DXF de découpe (phase 2). Le SVG préparé est déjà la
  géométrie à découper.
- PhyloPic et Wikimedia ont été ajoutés aux hôtes autorisés de l'environnement « Lumicut », pour
  reconstruire la bibliothèque depuis une session cloud.

---

## 9. Styles de découpe : la lumière dessine le motif (20/11/2026)

Retour client : une silhouette évidée fait un grand trou, peu joli le jour. Le motif doit être **suggéré par
de fines découpes** qui laissent passer la lumière, et rester décoratif lumière éteinte.

Chaque motif de la bibliothèque (sauf les constellations, déjà faites de points et de traits) se découpe
maintenant dans l'un de ces styles, au choix dans l'onglet Motif :

| Style | La nuit | Le jour | Réglages |
|---|---|---|---|
| **Contour** (par défaut) | Un trait de lumière dessine le motif et ses détails | Une fine gravure | épaisseur du trait (1,6 mm), écart entre les ponts (45 mm) |
| **Contours multiples** | Plusieurs traits parallèles, effet néon | Des courbes de niveau | épaisseur, nombre de traits, écart entre les ponts |
| **Lignes** | Le motif apparaît en fentes lumineuses | Une trame de lignes | épaisseur, écart, orientation (—, \|, /, \\) |
| **Points** | Un dégradé de perçages, plus denses au cœur | Une tôle perforée | écart, taille des points |
| **Silhouette** | Toute la forme éclairée | Un grand trou | — |

### Fonctionnement (`src/lib/library/cutStyles.js`)

- Le style part de la **forme d'origine** du dessin (`public/library/forme/`), sans les ponts de la silhouette.
- Il est calculé **à la taille réelle du motif** (format, échelle) : un trait de 1,6 mm reste de 1,6 mm du S
  au XL, et les ponts ne descendent jamais sous le minimum du matériau, plus une marge.
- Le trait suit le bord à profondeur constante (carte des distances au bord). Dans une partie trop fine
  pour deux traits (bois du cerf, pattes), il devient un trait central unique. Les traits sont coupés par
  des **ponts réguliers**, décalés d'un trait à l'autre.
- Une passe de sécurité reprend la règle de la bibliothèque : toute matière tenue par moins de 3 mm reçoit
  un pont. Le tracé final est revérifié comme le fera le contrôle du studio.
- Calcul en 0,1 à 0,5 s, puis mis en cache. Pendant un geste à la souris, le dernier tracé est gardé, et le
  calcul se refait au relâcher.
- Le style et ses réglages sont enregistrés dans les liens partagés, les designs sauvegardés et le panier.
  La commande garde maintenant le **design complet**, et le fichier de production de l'administration
  recalcule le motif dans son style, à la taille commandée.

### Vérification

Contrôle de découpe des 241 motifs qui acceptent les styles, avec la même règle que le studio :

| Style | Format | Îlots | Parties fragiles | Zones fines (avertissement) |
|---|---|---|---|---|
| Contour | M (27 cm, bois 3 mm) | 0 | 1 (tête de cerf) | 32 |
| Contour | S (18 cm, acrylique 2,5 mm) | 1 (yin-yang) | 0 | 26 |
| Contours multiples | M | 0 | 1 (tête de cerf) | 31 |
| Lignes | M | 0 | 0 | 0 |
| Points | M | 0 | 0 | 0 |

Les « zones fines » sont des bandes de matière un peu sous 3 mm mais tenues aux deux bouts, en général entre
deux détails très proches du dessin d'origine. Le studio les signale en orange ; le client peut agrandir le
motif ou passer en « Lignes ».

Au passage, le contrôle du studio dessine maintenant les motifs « simples » (bibliothèque, styles,
générateurs) au **tracé exact**, au lieu de passer par une image redimensionnée qui floutait les passages fins.
Il est plus juste et plus rapide pour tous les motifs.

### Limites

- Le prix ne tient pas encore compte de la longueur de découpe : les styles « Lignes » et « Points »
  demandent nettement plus de temps laser qu'une silhouette.
- Un dessin très détaillé en style contour peut devenir chargé à petite taille : agrandir le motif ou
  choisir « Lignes ».

---

## 10. Caméra : jamais sous le décor ni à travers (20/11/2026)

Avant : l'orbite et le zoom n'étaient bridés que par des angles autour du panneau et un recul de 6 m.
La caméra pouvait passer sous le sol, derrière un mur, à travers un meuble, ou sortir par le côté ouvert
de la pièce.

Maintenant (`CameraRig` dans `Studio3D.jsx`) :

- **Obstacles** : le sol, les murs, le plafond et chaque meuble sont marqués `userData.collider`. La caméra
  s'arrête devant le premier obstacle entre elle et le point qu'elle regarde, et repart dès qu'il ne gêne
  plus (fonction `colliderMeshes` de camera-controls).
- **Volume de la pièce** : la caméra et le point visé restent dans l'intérieur de la pièce, à 10 cm des murs
  et du côté ouvert, à 30 cm au-dessus du sol et 3 cm sous le plafond (`setBoundary` +
  `boundaryEnclosesCamera`). Le zoom vers le curseur ne peut plus emmener le point visé hors de la pièce.
- **Panneau au plafond** : la caméra reste toujours sous le panneau (au-dessus, elle était dans le plafond
  et se collait au panneau). **Suspendu** : elle peut monter un peu au-dessus du panneau pour voir les câbles,
  jusqu'au plafond.
- Les cadrages guidés et leurs transitions profitent des mêmes protections.

Vérifié automatiquement dans les 7 pièces et les 3 poses : glisser vers le bas, vers le haut, sur les côtés,
recul maximal à la molette. La caméra n'est jamais sortie du volume de la pièce.
