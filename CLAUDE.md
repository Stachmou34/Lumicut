# LumiCut — Contexte projet

## C'est quoi
Site e-commerce de panneaux décoratifs rétroéclairés découpés au laser.
Configurateur 3D temps réel → commande directe → on fabrique et on livre.

## Stack
React + Vite + Tailwind + Three.js + Zustand + Supabase + Stripe

## Où on en est
Sprint 1 terminé : dashboard admin fonctionnel
En cours : Sprint 2 — générateur IA de motifs

## Conventions de code
- Composants en PascalCase
- Fonctions utilitaires en camelCase
- Tout commentaire en français
- CSS uniquement via Tailwind, pas de style inline

## Structure des dossiers
src/components/studio/ — configurateur
src/components/admin/ — dashboard
src/lib/ — fonctions pures
src/store/ — Zustand stores

## Décisions techniques importantes
- DXF généré côté client (pas de backend)
- Supabase pour toutes les données
- API Anthropic pour la génération de motifs
- Kerf appliqué dans computePieces(), jamais ailleurs