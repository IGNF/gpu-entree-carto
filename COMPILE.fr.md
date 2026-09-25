# Compilation du projet

[![en](https://img.shields.io/badge/lang-en-red.svg)](COMPILE.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](COMPILE.fr.md)

[![Vite](https://img.shields.io/badge/build%20with-Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vue.js](https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org/)

Voir aussi : [README.fr.md](README.fr.md), [CODING.fr.md](CODING.fr.md), [doc/Demo.md](doc/Demo.md), [doc/INTEGRATION.md](doc/INTEGRATION.md).

<!-- toc -->

- [Prérequis](#prérequis)
  * [Node.js](#nodejs)
  * [Git](#git)
  * [Proxy d'entreprise (optionnel)](#proxy-dentreprise-optionnel)
- [Installation](#installation)
- [Développement](#développement)
- [Compilation](#compilation)
  * [Build complet](#build-complet)
  * [Cibles npm](#cibles-npm)
  * [Artefacts `dist/`](#artefacts-dist)
- [Tests et qualité](#tests-et-qualité)
- [Prévisualisation](#prévisualisation)
- [GitHub Pages](#github-pages)

<!-- tocstop -->

## Prérequis

### Node.js

- **Node.js 24 LTS** (≥ 24.15) ou **Node ≥ 26** (`package.json` → `engines`).
- Fichier `.nvmrc` : `nvm use` / `fnm use` avant `npm install`.

Téléchargement : https://nodejs.org/

### Git

https://git-scm.com/downloads

Sous Windows, pour éviter les conversions CRLF :

```bash
git config core.autocrlf false
```

### Proxy d'entreprise (optionnel)

```bash
npm config set proxy http://proxy.example.com:8080
npm config set https-proxy http://proxy.example.com:8080
```

Ou variables `HTTP_PROXY` / `HTTPS_PROXY`.

## Installation

```bash
make install
# équivalent : npm install
```

## Développement

Serveur Vite (démo SPA, rechargement à chaud) :

```bash
make dev
# équivalent : npm run dev
```

URL par défaut : http://localhost:5173/

Configuration démo sans rebuild : `public/js/demo-config.js` → `window.DEMO_CONFIG` ([doc/DemoConfig.md](doc/DemoConfig.md)).

## Compilation

### Build complet

```bash
make build
# équivalent : npm run build
```

Enchaîne : build démo SPA, bibliothèque principale, widgets standalone (location-search, search-engine, geometry-editor, sketch), chaque cible en version **normale** et **minifiée** (`LIB_MINIFY=1`).

**Ne pas** ouvrir `dist/index.html` en `file://` (modules ES bloqués). Utiliser `make preview` après le build.

### Cibles npm

| Commande | Description |
| -------- | ----------- |
| `npm run build:demo` | Application de démonstration |
| `npm run build:demo:pages` | Démo GitHub Pages |
| `npm run build:lib` | `dist/entree-carto.js` + `.min.js` + CSS |
| `npm run build:location-search` | Widget autocomplete accueil |
| `npm run build:search-engine` | SearchEngine geopf standalone |
| `npm run build:geometry-editor` | Éditeur de géométries |
| `npm run build:sketch` | Outils croquis |

Équivalents Makefile : `make build-lib`, `make build-search-engine`, etc.

Chaque build lib exécute `vue-tsc --noEmit` avant Vite.

### Artefacts `dist/`

| Fichier | Usage |
| ------- | ----- |
| `entree-carto[.min].js` + CSS | API `window.gpu` (gpu-site) |
| `entree-carto-search-engine[.min].js` | Recherche geopf accueil |
| `entree-carto-location-search[.min].js` | Autocomplete léger |
| `entree-carto-geometry-editor[.min].js` | `EntreeCartoGeometryEditor` |
| `entree-carto-sketch[.min].js` | `EntreeCartoSketch` |
| `index.html`, `assets/*` | Démo SPA |

Les builds minifiés retirent `console.*` et `debugger` (esbuild, `vite/libBuildOptions.ts`).

## Tests et qualité

```bash
make test
make typecheck
make verify
make fix
npm run test:watch
```

CodeQL local (optionnel) : `npm run codeql:install` puis `npm run verify:codeql` — [`.github/codeql/README.md`](.github/codeql/README.md).

## Prévisualisation

Build local (`base: './'`) :

```bash
make preview
# http://localhost:4173/
```

Simulation GitHub Pages :

```bash
make preview-pages
# ou npm run serve:pages
```

Avec `useMinimified: true` dans `demo-config.js`, les bundles `/dist/` sont servis en dev et preview (`vite.demoPlugins.ts`).

## GitHub Pages

CI : `.github/workflows/pages.yml` — `npm run build:demo:pages`.

Démo publiée : https://ignf.github.io/gpu-entree-carto/
