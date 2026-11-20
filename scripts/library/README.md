# Bibliothèque de motifs réels

Le catalogue du studio est une bibliothèque de **dessins réels**, pas de motifs imaginés :
silhouettes d'animaux tracées d'après de vrais spécimens, pictogrammes dessinés par des illustrateurs,
monuments, symboles, et constellations calculées à partir des positions réelles des étoiles.
Chaque dessin est **préparé pour la découpe laser**, puis **vérifié** avant d'entrer dans la bibliothèque.

- `selection.json` : la liste choisie (nom, thème, mots-clés, source, auteur, licence).
- `build.mjs` : télécharge les sources, prépare et contrôle chaque motif, écrit `public/library/`.
- `constellations.mjs` : dessine une constellation à partir des données Hipparcos.
- `to-sql.mjs` : exporte la bibliothèque vers la table `motifs` de Supabase.

Le résultat est servi tel quel par le site : `public/library/index.json` (catalogue, crédits, résultats
du contrôle) et un SVG par motif dans `public/library/svg/`.

## Sources et licences

Règle : seulement des licences qui autorisent la fabrication et la vente, sans obligation de partager à
l'identique. Pas de NC (non commercial), pas de ND (pas de modification : on ajoute des ponts), pas de SA.

| Source | Contenu | Licences retenues |
|---|---|---|
| [PhyloPic](https://www.phylopic.org) | Silhouettes d'animaux et de plantes | CC0, marque du domaine public, CC BY 3.0 et 4.0 |
| [game-icons.net](https://game-icons.net) (paquet `@iconify-json/game-icons`) | Pictogrammes : arbres, fleurs, monuments, symboles, zodiaque | CC BY 3.0 |
| [Wikimedia Commons](https://commons.wikimedia.org) | Tour Eiffel, croix occitane, lys de Florence | Domaine public, CC0 |
| Catalogue Hipparcos via [d3-celestial](https://github.com/ofrohn/d3-celestial) | Étoiles et tracés des constellations | BSD 3 clauses |
| [Natural Earth](https://www.naturalearthdata.com) via `world-atlas` | Continents des cartes du monde (générateur `worldmap`) | Domaine public, ISC |

Les licences CC BY et BSD demandent de citer l'auteur. La page `/credits` du site le fait pour chaque
motif, et le studio affiche le crédit du motif sélectionné. Garder ces deux affichages.

## Préparation pour la découpe

`src/lib/library/prepareMotif.js` (paper.js, dans le navigateur) :

1. fusionne les formes noires du dessin (une forme blanche posée dessus efface la découpe dessous) ;
2. met le dessin au repère 200 du studio, avec une marge ;
3. supprime les poussières (découpes de moins de 1,2 mm²) ;
4. traite les îlots, c'est-à-dire la matière entièrement entourée de découpe, qui tomberait : un îlot
   minuscule est découpé, les autres sont tenus par un ou deux **ponts de matière** de 3,75 mm, posés
   au plus court ;
5. seconde passe au pixel (0,25 mm) : toute partie tenue par un passage de moins de 3 mm reçoit un pont,
   les pointes de matière trop fines pour le laser sont émoussées.

Puis `analyzeCut` (le même contrôle que dans le studio) vérifie le motif à 27 cm (format M à 90 %,
ponts de 3 mm) et à 18 cm (format S, 2,5 mm). **Un motif dont un morceau tomberait au format M est refusé.**
Les résultats du contrôle sont gardés dans l'index (`check`).

## Ajouter des motifs

1. Ajouter une entrée dans `selection.json` (copier une entrée de la même source) :
   - PhyloPic : l'identifiant de l'image (`uuid`, visible dans l'adresse de la page de l'image), l'auteur et
     la licence indiqués sur cette page ;
   - game-icons : le nom de l'icône (`icon`) et son auteur (`https://game-icons.net/1x1/<auteur>/<icône>.html`) ;
   - constellation : le code IAU (`Ori`, `UMa`…).
2. Lancer le studio (`npm run dev`), puis dans un autre terminal :

   ```bash
   node scripts/library/build.mjs mon-nouveau-motif
   ```

   Sans argument, toute la bibliothèque est reconstruite (une dizaine de minutes). Prérequis : Playwright
   (`npm i -D playwright` puis `npx playwright install chromium`). Derrière un proxy, lancer Node avec
   `NODE_USE_ENV_PROXY=1`.
3. Regarder le motif dans le studio (Catalogue), puis committer `selection.json` et `public/library/`.

Pour vos propres dessins (achetés ou réalisés pour LumiCut) : même chemin, avec une source de type
`wikimedia` pointant vers le fichier (champ `url`), ou en appelant `prepareMotif()` sur le SVG.
