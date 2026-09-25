# entree-carto

[![en](https://img.shields.io/badge/lang-en-red.svg)](README.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](README.fr.md)

[![CI](https://github.com/IGNF/gpu-entree-carto/actions/workflows/ci.yml/badge.svg)](https://github.com/IGNF/gpu-entree-carto/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-GitHub%20Pages-blue)](https://ignf.github.io/gpu-entree-carto/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![OpenLayers](https://img.shields.io/badge/OpenLayers-10-1F6B75)](https://openlayers.org/)
[![DSFR](https://img.shields.io/badge/DSFR-VueDSFR-000091)](https://vue-ds.fr/)

**entree-carto** is the GPU (Géoportail de l’urbanisme) cartographic entry point: a Vue 3 + OpenLayers library and demo SPA, aligned with the [French State design system (DSFR)](https://www.systeme-de-design.gouv.fr/) and the new GPU UX/UI mockups. It replaces the legacy **gpu-client** stack for embedding an urban planning map (documents, layers, legend, search, sketch tools) in **gpu-site** and related portals.

**Live demo:** https://ignf.github.io/gpu-entree-carto/

- [Installation](#installation)
  - [Requirements](#requirements)
  - [Installation steps](#installation-steps)
- [Configuration](#configuration)
- [Usage](#usage)
- [Features](#features)
- [Documentation and support](#documentation-and-support)
- [Contributing](#contributing)
- [License](#license)

## Installation

### Requirements

- **Node.js** 24 LTS (≥ 24.15) or ≥ 26 — see `.nvmrc` and `package.json` → `engines`
- **npm** (bundled with Node)
- **Git**

Optional: [gpu-site](http://127.0.0.1:8000/) locally for `gpu-client-config.js`, legends, and proxy-backed dev (see [doc/DemoConfig.md](doc/DemoConfig.md)).

### Installation steps

```bash
git clone https://github.com/IGNF/gpu-entree-carto.git
cd gpu-entree-carto
make install   # npm install
make dev       # Vite dev server → http://localhost:5173/
```

Production-like preview after a full build:

```bash
make build
make preview   # http://localhost:4173/ — do not open dist/index.html via file://
```

Build and toolchain details: [COMPILE.md](COMPILE.md).

## Configuration

**Demo SPA (no rebuild):** edit `public/js/demo-config.js` → `window.DEMO_CONFIG` (GPU config script URL, document, bbox, map layers, home search widget, `useMinimified`, …). See [doc/DemoConfig.md](doc/DemoConfig.md).

**Embedded library:** runtime options via `gpu.createStandardViewer(params)` and `window.gpu.config` (same model as gpu-client). See [doc/INTEGRATION.md](doc/INTEGRATION.md).

## Usage

### Demo application

| Route | Purpose |
| ----- | ------- |
| `/` | Home banner + location / SearchEngine widget |
| `/map` | Full map + side panel + controls |
| `/geometry-editor` | Standalone geometry editor bundle demo |
| `/sketch` | Standalone sketch bundle demo |

See [doc/Demo.md](doc/Demo.md).

### Library bundles (`dist/`)

After `make build`, publish or copy artifacts described in [doc/INTEGRATION.md](doc/INTEGRATION.md):

- `entree-carto[.min].js` — `window.gpu` (`createStandardViewer`, `mountSearchEngine`, …)
- `entree-carto-search-engine[.min].js`, `entree-carto-location-search[.min].js`
- `entree-carto-geometry-editor[.min].js`, `entree-carto-sketch[.min].js`
- Matching CSS under `dist/css/`

## Features

- DSFR / VueDSFR UI, GPU UX alignment
- OpenLayers map with geopf extensions (SearchEngine, territories, overview, sketch, …)
- Side panel (catalog, legend, info, base layers)
- IIFE bundles for gpu-site integration (`window.gpu`)
- Standalone geometry editor and sketch entry points
- Vitest unit tests, ESLint, Prettier, optional CodeQL locally

Planned work: [ROADMAP.md](ROADMAP.md). Release history: [CHANGELOG.md](CHANGELOG.md).

## Documentation and support

| Topic | Location |
| ----- | -------- |
| Integration in gpu-site | [doc/INTEGRATION.md](doc/INTEGRATION.md) |
| Map controls & components | [doc/README.md](doc/README.md) · [doc/README.fr.md](doc/README.fr.md) |
| Demo & GitHub Pages | [doc/Demo.md](doc/Demo.md) |
| Build & dependencies | [COMPILE.md](COMPILE.md), [DEPENDENCIES.md](DEPENDENCIES.md) |
| Developer conventions | [CODING.md](CODING.md) |
| Changelog & roadmap | [CHANGELOG.md](CHANGELOG.md), [ROADMAP.md](ROADMAP.md) |

French translations of root governance files: `*.fr.md` (e.g. [README.fr.md](README.fr.md), [CONTRIBUTING.fr.md](CONTRIBUTING.fr.md)). Keep EN/FR pairs in sync ([MARS](https://mars.gitlab-pages.ign.fr/cadre-technique/gouvernance/opensource/structure-readme/)).

- **Issues:** https://github.com/IGNF/gpu-entree-carto/issues
- **IGN open source framework:** [MARS governance](https://mars.gitlab-pages.ign.fr/cadre-technique/gouvernance/opensource/)

## Contributing

Contributions (code, documentation, bug reports) are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md), [CODING.md](CODING.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

**entree-carto** is released under the [CeCILL-B licence](LICENCE.md).

Third-party licences: [LICENCE.md](LICENCE.md), [DEPENDENCIES.md](DEPENDENCIES.md).

Contributors: [CONTRIBUTORS.md](CONTRIBUTORS.md).
