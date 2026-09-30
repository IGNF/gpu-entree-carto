# Changelog

[![en](https://img.shields.io/badge/lang-en-red.svg)](CHANGELOG.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](CHANGELOG.fr.md)

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **MapModeSelector** — parcel / territory radio switch (top-right), `mode=1|2` permalink sync via `provideMapMode()`.
- **Map permalink** — gpu-client-style URL hash (`lon`, `lat`, `z`, `tile`, `mlon`, `mlat`, layer keys) via `MapPermalinkSync` + `TabPanelsControl` bridge.
- **ClickInfoControl** — always-on map click (disabled during sketch tools) fills fiche tab via `ficheInfoService` (API or APICarto); composite info cursor CSS.
- **Fiche from search** — `SearchEngineControl` loads parcel/document fiche after geopf search using the current map mode.
- Open source governance files (README, CONTRIBUTING, CODING, CODE_OF_CONDUCT, CHANGELOG, ROADMAP).
- `useMinimified` support across demo routes (home, map, geometry-editor, sketch) loading `dist/` bundles.
- Bilingual documentation: English `*.md` and French `*.fr.md` at repository root and under `doc/`.

### Changed

- **Fiche info (empty state)** — static bulleted Parcelle / Territoire help when no marker; with a marker, switching map mode swaps the sheet from cache or one fetch per mode at the same point.
- **Mode emprise** — APICarto parcel/commune (and geo.api parent commune) cached per marker point and mode; no repeat fetch when toggling modes at the same location.
- **Territory fiche** — urban-planning data only via `apiFicheInfoUrl` from gpu-client-config; removed APICarto `gpu/document` fallback and default `/api/fiche-info`; shows “Indisponibilité du service” when the API is not configured.
- **GPU config** — relative `*Url` values resolve against the `gpu-client-config.js` script host (then Vite dev proxy when applicable).
- **Fiche info** — `/api/fiche-info` JSON (gpu-site): mode-specific header, tabs for DU / PSMV / SUP / SCoT and in-progress procedures.
- **Fiche gpu-site embed** — Twig-injected config (`LAYER_CONFIG`) marks GPU config ready; permalink cherry fiche loads after TabPanels mount; low-scale document summary; sync gpu.config before cherry fiche scheduling; infer `gpu-client-config` script URL from the DOM for relative `*Url` resolution.
- **Map permalink** — `lon`, `lat`, `mlon`, and `mlat` are written with at most 8 decimal places in the URL hash.
- **Map permalink** — catalog, data-layer, and base-map changes update the hash; `mode` is stored in `#…` (not `?mode=`).
- **Map permalink** — percent-encode layer keys/values; normalize legacy gpu-client hashes on load (Vue Router decode warning).
- **Map permalink layers** — gpu-client `v:w:x:y:z` (catalog, opacity, stack, grayscale, panel visibility); legacy 4-part values still read.
- **SearchEngineControl** — advanced search forms (places, INSEE, coordinates, parcels) use the same blue pin, animated view, and fiche flow as the main autocomplete.
- **Mode emprise** — red dashed commune (Territoire) or parcel (Parcelle) from APICarto on map click and after place search; geopf place extent kept for search zoom only.
- **Mode emprise** — no zoom gate; Territoire in Paris/Lyon/Marseille: orange arrondissement (APICarto) + red city commune (geo.api.gouv.fr).
- **Layer catalogue** — no default demo layers; loading spinner while `gpu-client-config` / `LAYER_CONFIG` is fetched.
- **Sketch style popup** — two action rows: local Undo/Redo (tertiary) for in-popup style history, then Delete / Close; live edits also recorded in sketch undo/redo.
- README restructured (English reference + `README.fr.md` overview).

## [0.3.0] - 2026-09-25

### Added

- Standalone bundles: `entree-carto-search-engine`, `entree-carto-location-search`, `entree-carto-geometry-editor`, `entree-carto-sketch`.
- GPU home banner demo, SearchEngine / location search widgets, demo-config driven SPA.
- Tab panel, sketch tools, geometry editor, WMS layer registry integration paths.
- Vitest, ESLint, Prettier, Husky pre-commit, GitHub Actions CI and Pages demo.

### Changed

- Vue 3 + OpenLayers 10 + VueDSFR stack replacing gpu-client embedding model for new integrations.

[Unreleased]: https://github.com/IGNF/gpu-entree-carto/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/IGNF/gpu-entree-carto/releases/tag/v0.3.0
