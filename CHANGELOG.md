# Changelog

[![en](https://img.shields.io/badge/lang-en-red.svg)](CHANGELOG.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](CHANGELOG.fr.md)

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Map print** — `MapPrintControl` + DSFR modal (PDF/PNG/JPEG, cartes.gouv print pipeline); button between sketch and overview map; optional extra PDF pages (territory fiche, parcel fiche, legends) with preview pagination; map preview attributions and bottom-right scale line.
- **Demo external assets** — `public/external/` (DSFR + Remix synced via `npm run sync:demo-external`), [DemoExternal.md](./doc/DemoExternal.md); standalone demo loads them from `index.html`; gpu-site embed uses `stubDsfrIconsCss` (no embedded `icons.min.css` in `dist/css/`).

- **Fiche info v2 (client)** — `fiche-info-v2` territory / parcel / combined routes (`ficheInfoApiUrls`, `ficheInfoFetch`), DSFR document and procedure tiles, legal status badges, parcel/territory GeoJSON highlight, dual-mode cherry cache, [FicheInfoApi](./doc/FicheInfoApi.md) contract doc; removed browser APICarto parcel fallback.

### Changed

- **Map print** — annex pagination: fiche height from DOM markers (not inflated HTML scroll); legends re-measured after layout stabilizes and from visible preview; slice cache cleared when the print modal opens; slice bounds follow legend rows (no clipped symbols at page bottom).
- **Map print** — parcel / territory fiche options enabled when data is cached or in the fiche JSON (without requiring the matching map mode).
- **Map print** — document tiles on fiche pages: no DSFR frame; compact typography (bold title, tighter procedure date).
- **Map print** — parcel / territory fiche pagination: per-tile / per-rule slice markers (no whole-body hide); fixes blank or clipped document previews.
- **Map print** — parcel / territory fiche: no separator lines; cadastre references typography aligned with Infos (titles, labels, descriptions).
- **Map print** — pagination bar above the preview (“Page 1 / 1 — Map” even with no annex); preview zoom with **Ctrl + wheel** (wheel alone scrolls).
- **Map print** — predefined templates (A4 preview / print, A4 landscape, A3) and background pre-warming of annex pagination; page breaks avoid sliver blocks at the top/bottom of slices; per-template and content cache.
- **Map print** — supplement pages scale typography and imagery to the printable area; pagination matches real content (no blank trailing slices); faster annex export via off-screen measure; attributions rasterized at export resolution.
- **Fiche info v2 API (gpu-site)** — v2 JSON trimmed to entree-carto fiche fields only (`FicheInfoV2PayloadOptimizer`: drop unused top-level keys, whitelist document/procedure/grid/parcel fields, scope-specific `parcelFiche`); see [FicheInfoApi](./doc/FicheInfoApi.md).
- **Mode emprise (map)** — red/orange parcel and territory outlines come from fiche-info v2 JSON only (`searchResultGraphics`, `modeEmpriseFromFiche`); no browser APICarto or geo.api; v2 fetch prefers the combined endpoint when configured.
- **Document / procedure links (demo)** — fiche tile `viewUrl` and related paths resolve against the gpu-client-config script host (`ficheGpuSiteUrls`); document/procedure fallbacks use **`documentViewUrl` / `procedureViewUrl`** templates from gpu-site config (Symfony routes), not hard-coded paths in entree-carto.
- **Fiche info P0–P2** — deferred **`gpu_api_parcel_fiche`** load (Infos / Documents tabs), **`/api/fiche-info`** query params (`includeParcel`, preview, `client`/`seq`), absorbed municipalities (`deletedGrids`), demo document preview (extent, WMS layers, fiche reload), urbanism rule CSS, parcel print; modules `parcelId`, `ficheInfoQuery`, `parcelFicheFromGpuApi`; Vitest coverage.
- **Sketch demo** — `mountSketch` option `showSettings` (cog top-right live options form); `setOptions` / `resetOptions` on handle; demo route `/sketch` enables it.

- **TabPanelsControl (mobile)** — bottom sheet (snaps 0 / 35 / 70 / 98 %), horizontal tab bar with zoom / full-screen tools, drag handle, safe areas and site header offset; composables `useTabPanelsLayout` / `useTabPanelsMobileSheet`, `useMapViewportControls`.
- **Icon reference** — `doc/icone-references.md` / `.fr.md` (DSFR / Remix classes, catalog URLs, SVG previews under `doc/img/icon-previews/`); `npm run doc:icon-previews`; Cursor rule to keep the doc in sync when pictograms change.
- **MapModeSelector** — parcel / territory radio switch (top-right), `mode=1|2` permalink sync via `provideMapMode()`.
- **Map permalink** — gpu-client-style URL hash (`lon`, `lat`, `z`, `tile`, `mlon`, `mlat`, layer keys) via `MapPermalinkSync` + `TabPanelsControl` bridge.
- **ClickInfoControl** — always-on map click (disabled during sketch tools) fills fiche tab via `ficheInfoService` (API or APICarto); composite info cursor CSS.
- **Fiche from search** — `SearchEngineControl` loads parcel/document fiche after geopf search using the current map mode.
- Open source governance files (README, CONTRIBUTING, CODING, CODE_OF_CONDUCT, CHANGELOG, ROADMAP).
- `useMinimified` support across demo routes (home, map, geometry-editor, sketch) loading `dist/` bundles.
- Bilingual documentation: English `*.md` and French `*.fr.md` at repository root and under `doc/`.

### Fixed

- **Map print control** — DSFR/geopf button styling; mobile bottom bar slot; sketch column max-height; print modal realigned on cartes.gouv `PrintModal` (`DsfrModal`, `defineExpose` open/close, always mounted); OL clone preview kept for embed.
- **Demo document startup** — `/map` with `DEMO_CONFIG.document` only fits extent and WMS preview (aligned with gpu-site embed); no automatic fiche tab or location cherry at bbox center.
- **Document preview (gpu-site embed)** — `createStandardViewer` now copies `params.document` into shared `config.document` so WMS validation layers (`_previsu`, partition CQL) stay active after `TabPanelsControl` reloads the GPU WMS registry (previously production tiles were shown on the host site while the Vite demo worked).
- **Demo DSFR assets** — `sync:demo-external` copies Marianne/Spectral (`dsfr/fonts/`) and icon SVG masks (`dsfr/icons/`) so `dsfr.min.css` and `icons.min.css` URLs resolve (avoids Vite HTML fallback, missing `fr-icon-*`, and “rejected by sanitizer”).
- **Embed Remix on gpu-site** — `ensureEmbedSharedStylesheets()` loads `../remixicon/remixicon.css` relative to the entree-carto script URL before falling back to `public/external/` (fixes 404 on `/external/remixicon/` when the host does not preload Remix).
- **Embed map startup bbox** — `createStandardViewer` / `EmbedMapViewer` fits the view to `params.bbox` (gpu-site `BBOX` + `documentId`), matching demo `/map` behavior; skipped when permalink hash or initial `search.fullText` is set.
- **Fiche preview document badges** — `document.preview` tiles show a single blue **PRÉVISUALISATION** badge (no EN VIGUEUR / HISTORIQUE) on territory and parcel Documents tabs.
- **Fiche info MEC notice** — territory document tiles show the MEC compatibility notice only when a MEC record exists in gpu-site (32-char document id), not from WFS-only partition keys.
- **Fiche info vs catalogue** — toggling _Data_ layer checkboxes refreshes the open fiche (territory tabs, parcel Infos/Documents) from cached API payload; no extra fetch.
- **MEC document tile link** — parcel and territory MEC tiles open the gpu-site document page (`/document/{id}`), not the ZIP `archiveUrl`.
- **Parcel fiche Documents tab** — unified document list: dedupe WFS duplicates; one gpu-site production tile per DU partition plus **NOT IN BDD** for orphan WFS versions; **SUP** section from gpu-site when an assiette intersects; parcel **MEC** replaces the parent DU/SCoT tile using the same **procedure** tile as territory (**IN PROGRESS** badge, notice as detail, document link).
- **Map permalink** — validate hash parameter names before assignment (`js/remote-property-injection` / CodeQL).

### Changed

- **ESLint** — replace `@vue/eslint-config-typescript` with an explicit flat config (`typescript-eslint` + `vue-eslint-parser`); removes the dev-only `fast-glob` / `braces` audit chain.
- **ESLint** — enable `recommendedTypeChecked` with `projectService`, Vue SFC split via `eslint/groupVueFiles.mjs` (no `fast-glob`).
- **Fiche Territoire tag** — recentre on red mode emprise even without `territoryTitle` (e.g. gpu-client-config unavailable); `focusModeEmpriseOnMap` falls back to visible emprise extent.
- **Main map sketch** — default `toolsToggle: bottom-left`; geopf slot uses `column-reverse` so the menu button stays fixed when the toolbar opens (desktop).
- **Mobile map chrome** — search autocomplete / advanced panel above parcel–territory controls (stacking + `attachStandalonePopoverSync`); territories panel between mode selector and zoom stack (`tiles: 4`); minimap preview `position: fixed`; sketch toolbar scroll and height clamp; **panel four tabs right-aligned** in the bottom bar (geopf tools on the left).
- **Map controls** — shared `--ec-map-control-*` tokens (blue icon on white when idle, white on blue when active) for geopf widgets, TabPanels tabs, sketch tools, and mobile zoom / full-screen stack.
- **Full screen** — target `.ec-map-shell` (geopf + mobile bar) so the lateral panel stays visible; mobile toggles `ri-fullscreen-line` / `ri-fullscreen-exit-line`; iOS pseudo full screen.
- **TabPanels mobile** — sketch column between mode and toggle (`--ec-mobile-sketch-toolbar-*-inset`, fix bottom inset without extra btn height).
- **TabPanels mobile** — remeasure `--ec-mobile-map-viewport-top` when exiting fullscreen (`fullscreenchange` + shell class).
- **TabPanels mobile (iOS)** — `--ec-mobile-map-fixed-origin-top` (shell-relative fixed off fullscreen); territories below search; minimap top aligned with mode row.
- **TabPanels mobile** — measured `top` for sketch / minimap / territories from DOM (`measureMobileFixedChromeTops`); fixed origin from a shell probe (`detectMobileFixedUsesShellContainingBlock`) so Firefox responsive mode and desktop narrow windows match real viewport fixed, while iOS Safari keeps shell-relative fixed.
- **Map refocus** — `view.fit` padding measures panel surface width (not full-width shell) so the cherry marker is no longer shoved to the left.
- **Parcel mode** — APICarto emprise refocus: do not reuse empty cache entries, stable target key on mode switch, animate view before fiche refresh.
- **TabPanels mobile** — tabs flush right without zoom-column padding in the bar; attributions / scale `--ec-tab-panels-inset` forced to 0 on mobile; desktop→mobile resize with panel open opens sheet at 35 % preview snap; mobile sketch icons use `--ec-map-control-*` again.
- **Demo header** — DSFR mobile navigation (menu button + header modal), aligned with gpu-site; DSFR JS bootstrapped in Vue mode for the Vite demo.
- **TabPanelsControl** — split OpenLayers control (tab buttons only, `.ec-tab-panels__tabs-control`) from panel content (`ec-tab-panels-shell` / `ec-tab-panels__surface`) so `ol.css` no longer affects DSFR inside the sheet; CSS tokens for future mobile bottom sheet (snaps 0 / 35 / 70 / 98 %, safe areas, site header offset). See `src/lib/map/tabPanelsLayout.ts`.
- **MapModeSelector** — parcel / territory pictograms use `ec-icon-parcelle` (`parcelle.svg`) and DSFR `fr-icon-france-fill` instead of inline SVG; classic layout: segmented icon + label buttons (no “Mode” heading or visible radios), using `--ec-map-control-*` tokens.
- **Fiche info panel** — styles in `fiche-info.css` (no OpenLayers overrides on panel buttons).
- **Fiche info panel** — Parcel mode: DSFR tags, cadastre references modal, territory CTA, Infos/Documents tabs with load buttons, document cards; Territory mode: back-to-parcel control, document tab labels aligned with gpu-client, non-executory callout.
- **Place search submit** — magnifying-glass replay uses the stored **place** fly-to extent (geopf), not the red mode emprise; place view extent excludes mode polygons when computing zoom.
- **Map mode selector** — with a cherry marker, animated fit to the red APICarto emprise (permalink restore once the search layer is ready, or after a Parcel / Territory switch); max zoom **19** in Parcel mode, **15** in Territory; no move if the emprise is missing.
- **Mode emprise after place search** — keep geopf location outline (blue dashed) alongside APICarto mode emprise; stable emprise target key (no `moveend` re-sync race).
- **Mobile geopf tools** — overview / territories toggle buttons in the bottom bar show blue active state (not white-on-white).
- **TerritoriesControl (mobile)** — slot buttons use `--ec-map-control-*`; `dialog` / `#gpf-territories-views-container-id` fixed below place search with `--ec-widget-gap` insets; in-panel buttons (close, “Modify territories”) neutralise `ol.css` for geopf/DSFR desktop look; desktop side panel overrides (`left: 100%`) unchanged.
- **MapModeSelector** — tighter search gap (`--ec-map-mode-search-gap`); teleported into the OL controls overlay (tabs above mode, mobile sheet above); hidden while geopf Territories is active.
- **Mode emprise after place search** — keep geopf place `trueGeometry` (blue dashed) with APICarto mode emprise; stable target key; mode read at setup (geopf search in `requestAnimationFrame`).
- **Cadastre low base layer** — switches between PCI Express, BD Parcellaire (`CADASTRALPARCELS.PARCELS`), and INSPIRE PCI Vecteur WMS from `/api/fiche-info` `typeref` and commune INSEE (gpu-client `CadastreLow`); INSPIRE attributions show Marianne + ministry logos (DGFIP copyright in `title`); IGN and ministry logos include `title` tooltips.
- **Géoplateforme base maps** — WMTS sources use 512 px tiles and PM matrices 5–19 (`ol/source/WMTS`, same as gpu-client `createWMTSSource`), replacing pseudo-XYZ `{z}/{x}/{y}` URLs; OL layer stack order matches gpu-client (`cadastreLow` above base tiles, below regional/department limits).
- **Fiche info (empty state)** — static bulleted Parcelle / Territoire help when no marker; with a marker, switching map mode swaps the sheet from cache or one fetch per mode at the same point.
- **Mode emprise** — APICarto parcel/commune (and geo.api parent commune) cached per marker point and mode; no repeat fetch when toggling modes at the same location.
- **Territory fiche** — urban-planning data only via `apiFicheInfoUrl` from gpu-client-config; removed APICarto `gpu/document` fallback and default `/api/fiche-info`; shows “Indisponibilité du service” when the API is not configured.
- **GPU config** — relative `*Url` values resolve against the `gpu-client-config.js` script host (then Vite dev proxy when applicable).
- **Fiche info** — `/api/fiche-info` JSON (gpu-site): mode-specific header, tabs for DU / PSMV / SUP / SCoT and in-progress procedures.
- **Fiche gpu-site embed** — Twig-injected config (`LAYER_CONFIG`) marks GPU config ready; permalink cherry fiche loads after TabPanels mount; low-scale document summary; sync gpu.config before cherry fiche scheduling; infer `gpu-client-config` script URL from the DOM for relative `*Url` resolution; `whenGpuClientConfigReady` settles from `LAYER_CONFIG` / `apiFicheInfoUrl` (fixes blocked fiche when status stayed `idle`); permalink bootstrap recognizes `mlon`/`mlat` in the hash.
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
