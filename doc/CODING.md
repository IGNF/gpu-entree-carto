# Guide de développement

## Stack

- **Vue 3** (Composition API, `<script setup>`) + **TypeScript** strict (`vue-tsc`)
- **Vite 6** : démo via `vite.config.ts` (racine), bundles et plugins dans `vite/`
- **OpenLayers 10** + **geopf-extensions-openlayers**, **VueDSFR**
- **Vitest** + **jsdom**, **ESLint 10** (flat config) + **Prettier**

## Arborescence

```
src/
  components/     # UI Vue (map/, layers/, search/, panels/…)
  composables/
  embed/          # EmbedMapViewer (createStandardViewer)
  geometry-editor/
  lib/            # API publique, montage, fiche info, config
  ol/             # Fonds GPU, presets
  sketch/
  views/          # Routes démo
doc/              # Documentation (français)
vite/             # Configs de build des bundles + plugins Vite
scripts/          # Scripts npm (sync assets démo, icônes, CodeQL, contrôle dist)
dist/             # Sortie de build, versionnée (consommée par gpu-site)
```

## Installation et développement

Node **≥ 24.15** (24 LTS, voir `.nvmrc`).

```bash
make install
make dev          # http://localhost:5173/
```

Configuration démo sans rebuild : `public/js/demo-config.js` ([DemoConfig](./DemoConfig.md)).

Erreur `ENOSPC` (limite inotify) : augmenter `fs.inotify.max_user_watches`, ou `VITE_USE_POLLING=1 npm run dev`.

## Build

```bash
make build        # démo + tous les bundles (normal + minifié)
make preview      # http://localhost:4173/ — ne pas ouvrir dist/index.html en file://
```

`make build` = `vue-tsc` + build de la démo (`vite build`) + tous les bundles (`node scripts/build-bundles.mjs`). Un seul bundle : `node scripts/build-bundles.mjs sketch`.

| Bundle | Config | Sortie |
| ------ | ------ | ------ |
| démo | `vite.config.ts` | `index.html`, `assets/*` |
| `lib` | `vite/lib.config.ts` | `entree-carto[.min].js` + CSS (`window.gpu`) + worker d’export |
| `location-search` | `vite/location-search.config.ts` | `entree-carto-location-search[.min].js` |
| `search-engine` | `vite/search-engine.config.ts` | `entree-carto-search-engine[.min].js` |
| `geometry-editor` | `vite/geometry-editor.config.ts` | `entree-carto-geometry-editor[.min].js` |
| `sketch` | `vite/sketch.config.ts` | `entree-carto-sketch[.min].js` |

Chaque bundle est produit en version normale puis minifiée (`LIB_MINIFY=1`, sans `console.*` ni `debugger`) ; les chunks orphelins de `dist/assets/` sont purgés à la fin. Démo GitHub Pages en local : `npm run serve:pages` (CI : `.github/workflows/pages.yml`).

## Qualité

| Commande | Rôle |
| -------- | ---- |
| `make test` | Vitest (`*.spec.ts`) ; `npx vitest` en mode watch |
| `npm run verify` | ESLint + Prettier + `vue-tsc` sur tout le dépôt (CI) |
| `make verify` | Ci-dessus + CodeQL local (`.github/codeql/README.md`, `SKIP_CODEQL=1` pour l’ignorer) |
| `make fix` | Correction auto lint + format |
| `npm run verify:dist` | Contrôle des bundles construits (pas d’`eval`, pas de sources `.ts`) |

Pre-commit (Husky + lint-staged) : ESLint et Prettier sur les seuls fichiers indexés ; types et tests sont vérifiés par la CI (`.github/workflows/ci.yml`).

Le Markdown n’est pas formaté par Prettier (`.prettierignore`).

## Conventions

- Props typées, imports explicites, pas de `any` sans justification.
- Contrôles carte OL : réutiliser `useOlControl`.
- Entrées de bundle (`src/lib/entries/`) : fichiers minces (API + globals IIFE).
- Branches `feature/…`, `fix/…`, `doc/…` ; commits [Conventional Commits](https://www.conventionalcommits.org/fr/v1.0.0/) encouragés.

## Documentation

- Tout contrôle carte nouveau ou modifié a sa page dans `doc/` (nom du composant) et une entrée dans [doc/README.md](./README.md).
- Changement visible : une ligne courte dans [CHANGELOG.md](./CHANGELOG.md).
- Documentation en français uniquement.

## Release

1. Renommer `Non publié` en section de version datée dans le CHANGELOG.
2. Incrémenter `package.json`.
3. Taguer `vX.Y.Z` sur `main`.
