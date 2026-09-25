# Journal des modifications

[![en](https://img.shields.io/badge/lang-en-red.svg)](CHANGELOG.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](CHANGELOG.fr.md)

Toutes les évolutions notables du projet sont consignées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et le projet respecte [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Non publié]

### Ajouté

- Fichiers de gouvernance open source (MARS) : README, CONTRIBUTING, CODING, CODE_OF_CONDUCT, CHANGELOG, ROADMAP.
- Prise en charge de `useMinimified` sur toutes les routes démo (accueil, carte, geometry-editor, sketch) avec chargement des bundles `dist/`.

### Modifié

- README restructuré selon le [guide MARS README](https://mars.gitlab-pages.ign.fr/cadre-technique/gouvernance/opensource/structure-readme/) ; présentation française dans `README.fr.md`.
- Paires françaises (`*.fr.md`) pour tous les fichiers de gouvernance à la racine ; règle Cursor `mars-bilingual-docs`.
- Documentation `doc/` bilingue : anglais `*.md`, français `*.fr.md` (27 pages + index).

## [0.3.0] - 2026-09-25

### Ajouté

- Bundles standalone : `entree-carto-search-engine`, `entree-carto-location-search`, `entree-carto-geometry-editor`, `entree-carto-sketch`.
- Démo bandeau d’accueil GPU, widgets SearchEngine / recherche localisation, SPA pilotée par `demo-config`.
- Panneau latéral, outils croquis, éditeur de géométries, intégration registre WMS.
- Vitest, ESLint, Prettier, pre-commit Husky, CI GitHub Actions et démo Pages.

### Modifié

- Stack Vue 3 + OpenLayers 10 + VueDSFR en remplacement du modèle d’intégration gpu-client pour les nouveaux déploiements.

[Non publié]: https://github.com/IGNF/gpu-entree-carto/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/IGNF/gpu-entree-carto/releases/tag/v0.3.0
