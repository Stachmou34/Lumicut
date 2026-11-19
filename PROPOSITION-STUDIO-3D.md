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
| Pièce | Mur + sol + meuble de référence (canapé / lit / bureau) générés en code | Échelle réelle immédiate (le comparateur de taille actuel est faux d'un facteur 10) |
| Caméra | `CameraControls` bridé (± 43°) et 4 cadrages : **Face, 3/4, Détail, Pièce** | Comme Portaliers, plus un cadrage « Détail » pour montrer la finesse de découpe |
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
  Studio3D.jsx      Canvas, éclairage jour/nuit, caméra, bloom, surcouche (cadrages, capture, intensité)
  LitPanel.jsx      panneau découpé, diffuseur, chants, entretoises, halo
  RoomScene.jsx     mur, sol, meuble de référence selon l'ambiance
src/lib/
  cutMask.js        masque de découpe (motif + texte) dans le repère 200 de l'aperçu 2D
  panelMaterials.js matières PBR, couleur LED sûre, détection WebGL
```

**Étape structurante suivante** : une source unique de géométrie `computePieces(config)` pour les panneaux (contour, découpes, texte vectorisé via opentype.js, trous d'entretoises, kerf), utilisée **à la fois** par la 3D (kerf 0) et par le DXF de production. Ce que le client voit sera exactement ce qui est découpé, et la règle de `CLAUDE.md` « kerf appliqué dans `computePieces()` » sera respectée.

---

## 3. Prototype livré dans cette branche

- Bascule **2D / 3D** dans le studio (3D par défaut si WebGL est disponible ; l'aperçu 2D reste intact).
- Tout le §2.1 : découpe, diffuseur, halo, bloom, matières, ombres, 3 pièces, 4 cadrages, curseur d'intensité, capture PNG, cote en cm.
- Nouvelles dépendances : `@react-three/postprocessing@2.16.3` et `postprocessing@6.36.6`, forcée via `overrides` pour rester compatible avec `three@0.167`.
- Vérifié sur des captures : acrylique noir et contreplaqué, blanc chaud et bleu, salon et chambre, jour et nuit, les 4 cadrages.

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
