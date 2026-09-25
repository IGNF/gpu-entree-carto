# Guide de développement — entree-carto

[![en](https://img.shields.io/badge/lang-en-red.svg)](CODING.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](CODING.fr.md)

Documentation développeur : conventions, tests, documentation, releases.  
Pour installer et compiler : **[COMPILE.fr.md](COMPILE.fr.md)**.

## Stack

- **Vue 3** (Composition API, `<script setup>`)
- **TypeScript** (vérification stricte via `vue-tsc`)
- **Vite 6** (démo + configs lib `vite.*.config.ts`)
- **OpenLayers 10** + **geopf-extensions-openlayers**
- **Vitest** + **jsdom**
- **ESLint 10** (flat config) + **Prettier**

## Arborescence

```
src/
  components/     # UI Vue (map/, layers/, search/, …)
  composables/
  embed/          # EmbedMapViewer (createStandardViewer)
  geometry-editor/
  lib/            # API publique, montage, config démo
  ol/             # Fonds GPU, presets
  sketch/
  views/          # Routes démo
doc/              # Doc contrôles / intégration (paires EN/FR : *.md + *.fr.md)
dist/             # Sortie build (npm `files`)
```

Builds IIFE : `vite.lib.config.ts`, `vite.search-engine.config.ts`, `vite.location-search.config.ts`, `vite.geometry-editor.config.ts`, `vite.sketch.config.ts`.

## Style de code

- **ESLint :** `npm run lint` — périmètre `src/`.
- **Prettier :** `npm run format:check` / `npm run format`.
- **Correction auto :** `make fix`.

**Husky** exécute `npm run verify` au pre-commit. `SKIP_CODEQL=1` si CodeQL n’est pas installé localement.

### Vue / TypeScript

- Props typées, imports explicites ; éviter `any` sans justification.
- Contrôles carte OL : réutiliser `useOlControl` lorsque le projet le fait déjà.
- Entrées bundle sous `src/lib/entries/` : fichiers minces (API + globals IIFE).

### Commits et branches

Voir **[CONTRIBUTING.fr.md](CONTRIBUTING.fr.md)**.

## Tests

```bash
make test
npm run test:watch
```

- Tests `*.spec.ts` sous `src/`.
- Lancer les tests en cas de changement dans `src/lib/`, composables ou composants non triviaux.

## Documentation

### Contrôles carte

Tout **contrôle carte** (ou composant cartographique associé) **nouveau ou modifié** doit avoir :

1. **Paire EN/FR** dans **`doc/`** (ex. `ScaleLineControl.md` + `ScaleLineControl.fr.md`), nom aligné sur le composant ; le corps anglais de référence est dans `.md`.
2. Entrées dans **`doc/README.md`** et **`doc/README.fr.md`** (même structure ; liens vers `.md` / `.fr.md`).

Contenu minimum : description, options/props/API, placement, dépendances, comportement, exemples. Badges de langue en tête ; liens internes doc : `./Autre.md` (EN) ou `./Autre.fr.md` (FR).

### Autre documentation

- Intégration : `doc/INTEGRATION.md`, `doc/LibCssBundles.md` (+ paires `.fr.md`)
- Démo : `doc/Demo.md`, `doc/DemoConfig.md` (+ paires `.fr.md`)
- Gouvernance à la racine **et** **`doc/`** : **paires EN/FR** (`*.md` / `*.fr.md`) — **maintenir les deux langues synchronisées**.

## Qualité

| Commande | Rôle |
| -------- | ---- |
| `npm run verify` | Lint + Prettier + `vue-tsc` (pre-commit) |
| `make verify` | Ci-dessus + CodeQL local optionnel |
| `make build` | Build production complet |

CI : `.github/workflows/ci.yml`.

## Releases et versionnement

- Version dans **`package.json`** (actuellement `0.x`).
- Changements visibles : **[CHANGELOG.md](CHANGELOG.md)** et **[CHANGELOG.fr.md](CHANGELOG.fr.md)** (Keep a Changelog).
- Processus mainteneurs :
  1. Déplacer `Unreleased` / `Non publié` vers une section version datée.
  2. Incrémenter `package.json`.
  3. Tag `vX.Y.Z` sur `main`.
  4. Publier `dist/` selon politique gpu-site / npm.

## Sécurité

- CodeQL local : `.github/codeql/README.md`, `npm run verify:codeql`.
- Ne pas committer de secrets. Dependabot : `.github/dependabot.yml`.

## Dépendances

Voir **[DEPENDENCIES.fr.md](DEPENDENCIES.fr.md)**. Après montée de version majeure :

```bash
npm ls --depth=0
```
