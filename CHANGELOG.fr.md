# Journal des modifications

[![en](https://img.shields.io/badge/lang-en-red.svg)](CHANGELOG.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](CHANGELOG.fr.md)

Toutes les évolutions notables du projet sont consignées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et le projet respecte [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Non publié]

### Ajouté

- **MapModeSelector** — commutateur radio Parcelle / Territoire (haut-droite), sync permalink `mode=1|2` via `provideMapMode()`.
- **Permalink carte** — fragment URL type gpu-client (`lon`, `lat`, `z`, `tile`, `mlon`, `mlat`, clés couche) via `MapPermalinkSync` + pont `TabPanelsControl`.
- **ClickInfoControl** — clic carte permanent (inactif pendant les outils croquis) remplit l’onglet fiche via `ficheInfoService` (API ou APICarto) ; curseur composite « info ».
- **Fiche depuis la recherche** — `SearchEngineControl` charge la fiche parcelle/document après une recherche geopf selon le mode carte.
- Fichiers de gouvernance open source : README, CONTRIBUTING, CODING, CODE_OF_CONDUCT, CHANGELOG, ROADMAP.
- Prise en charge de `useMinimified` sur toutes les routes démo (accueil, carte, geometry-editor, sketch) avec chargement des bundles `dist/`.
- Documentation bilingue : anglais `*.md` et français `*.fr.md` à la racine et dans `doc/`.

### Modifié

- **Fiche info (sans sélection)** — consignes à puces statiques ; avec cerise, changement de mode met à jour la fiche (cache par point/mode, sans refetch si déjà chargé).
- **Emprise mode (Parcelle / Territoire)** — cache APICarto (parcelle, commune, geo.api) par point et par mode ; pas de nouvelle requête si la cerise n’a pas bougé.
- **Permalink carte** — `lon`, `lat`, `mlon` et `mlat` sont écrits avec au plus 8 décimales dans le fragment d’URL.
- **Permalink carte** — sync des couches catalogue / données / fond de plan dans le hash ; `mode` dans `#…` (plus en query `?mode=`).
- **Permalink carte** — encodage percent des clés/valeurs couche ; normalisation des hash gpu-client legacy (avertissement Vue Router).
- **Couches permalink** — format gpu-client `v:w:x:y:z` (catalogue, opacité, pile, gris, visibilité panneau) ; lecture legacy 4 segments conservée.
- **SearchEngineControl** — les formulaires de recherche avancée (lieux, INSEE, coordonnées, parcelles) appliquent la même cerise bleue, le vol animé et l’ouverture fiche que l’autocomplete principal.
- **Emprise mode** — commune (Territoire) ou parcelle (Parcelle) APICarto en rouge pointillé au clic et après recherche lieu ; emprise geopf du lieu conservée pour le zoom recherche uniquement.
- **Emprise mode** — plus de seuil de zoom ; Territoire à Paris/Lyon/Marseille : arrondissement orange (APICarto) + commune ville rouge (geo.api.gouv.fr).
- **Catalogue couches** — plus de couches démo par défaut ; roue « En attente de la récupération des couches… » pendant le chargement `gpu-client-config` / `LAYER_CONFIG`.
- **Popup style croquis** — deux lignes d’actions : Annuler / Rétablir (tertiaire, mini-historique du style) puis Supprimer / Fermer ; les changements en direct restent aussi dans l’historique croquis.
- README restructuré (anglais de référence + aperçu `README.fr.md`).

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
