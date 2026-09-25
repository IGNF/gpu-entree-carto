# Building the project

[![en](https://img.shields.io/badge/lang-en-red.svg)](COMPILE.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](COMPILE.fr.md)

[![Vite](https://img.shields.io/badge/build%20with-Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vue.js](https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org/)

See also: [README.md](README.md), [CODING.md](CODING.md), [doc/Demo.md](doc/Demo.md), [doc/INTEGRATION.md](doc/INTEGRATION.md).

<!-- toc -->

- [Prerequisites](#prerequisites)
  * [Node.js](#nodejs)
  * [Git](#git)
  * [Corporate proxy (optional)](#corporate-proxy-optional)
- [Installation](#installation)
- [Development](#development)
- [Build](#build)
  * [Full build](#full-build)
  * [npm targets](#npm-targets)
  * [`dist/` artifacts](#dist-artifacts)
- [Tests and quality](#tests-and-quality)
- [Preview](#preview)
- [GitHub Pages](#github-pages)

<!-- tocstop -->

## Prerequisites

### Node.js

- **Node.js 24 LTS** (≥ 24.15) or **Node ≥ 26**, as specified in `package.json` → `engines`.
- Use `.nvmrc`: run `nvm use` / `fnm use` before `npm install`.

Download: https://nodejs.org/

### Git

https://git-scm.com/downloads

On Windows, to avoid unwanted CRLF conversion:

```bash
git config core.autocrlf false
```

### Corporate proxy (optional)

```bash
npm config set proxy http://proxy.example.com:8080
npm config set https-proxy http://proxy.example.com:8080
```

Or set `HTTP_PROXY` / `HTTPS_PROXY` environment variables.

## Installation

```bash
make install
# equivalent: npm install
```

## Development

Vite dev server (SPA demo, hot reload):

```bash
make dev
# equivalent: npm run dev
```

Default URL: http://localhost:5173/

Demo configuration without rebuild: `public/js/demo-config.js` → `window.DEMO_CONFIG` (see [doc/DemoConfig.md](doc/DemoConfig.md)).

## Build

### Full build

```bash
make build
# equivalent: npm run build
```

Runs: SPA demo build, main library, standalone widgets (location-search, search-engine, geometry-editor, sketch), each in **normal** and **minified** form (`LIB_MINIFY=1`).

Do **not** open `dist/index.html` via `file://` (ES modules are blocked). Use `make preview` after building.

### npm targets

| Command | Description |
| -------- | ----------- |
| `npm run build:demo` | Demo application (`dist/index.html`, Vite chunks) |
| `npm run build:demo:pages` | GitHub Pages demo (`base` + production `configScriptUrl`) |
| `npm run build:lib` | `dist/entree-carto.js` + `.min.js` + CSS |
| `npm run build:location-search` | Home autocomplete widget |
| `npm run build:search-engine` | Standalone geopf SearchEngine |
| `npm run build:geometry-editor` | Geometry editor |
| `npm run build:sketch` | Map sketch tools |

Makefile equivalents: `make build-lib`, `make build-search-engine`, etc.

Each library build runs `vue-tsc --noEmit` before Vite.

### `dist/` artifacts

| File | Purpose |
| ------ | -------- |
| `entree-carto[.min].js` + `css/entree-carto[.min].css` | `window.gpu` API (gpu-site) |
| `entree-carto-search-engine[.min].js` | Home / geopf search |
| `entree-carto-location-search[.min].js` | Lightweight autocomplete |
| `entree-carto-geometry-editor[.min].js` | `EntreeCartoGeometryEditor` |
| `entree-carto-sketch[.min].js` | `EntreeCartoSketch` |
| `index.html`, `assets/*` | SPA demo |

Minified builds drop `console.*` and `debugger` via esbuild (see `vite/libBuildOptions.ts`).

## Tests and quality

```bash
make test          # vitest run
make typecheck     # vue-tsc --noEmit
make verify        # lint + format + typecheck (+ local CodeQL if installed)
make fix           # eslint --fix + prettier --write
npm run test:watch # watch mode
```

Optional local CodeQL: `npm run codeql:install` then `npm run verify:codeql` — see [`.github/codeql/README.md`](.github/codeql/README.md).

## Preview

Local build (`base: './'`):

```bash
make preview
# http://localhost:4173/
```

GitHub Pages simulation (same `base` for build and preview):

```bash
make preview-pages
# or npm run serve:pages
```

With `useMinimified: true` in `demo-config.js`, bundles under `/dist/` are served in dev and preview (Vite middleware; see `vite.demoPlugins.ts`).

## GitHub Pages

CI: workflow `.github/workflows/pages.yml` — `npm run build:demo:pages`.

Published demo: https://ignf.github.io/gpu-entree-carto/
