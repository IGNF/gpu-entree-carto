[![en](https://img.shields.io/badge/lang-en-red.svg)](DemoConfig.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](DemoConfig.fr.md)

# Demo configuration (`demo-config.js`)

JS file **outside the bundle**, modelled on gpu-client [`exemple-config.js`](https://github.com/IGNF/gpu-client/blob/master/public/js/exemple-config.js).

**File:** `public/js/demo-config.js`  
**Load:** `index.html` (before Vue app) → `window.DEMO_CONFIG`  
**Consumption:** `src/lib/demo/demoConfig.ts` — pages `/`, `/map`

## Purpose

Change environment or test data **without rebuilding** or editing Vue code: `gpu-client-config` URL, document, bbox, `gpu.config` overrides, catalogue layers, initial search, etc.

## `window.DEMO_CONFIG` structure

| Key                      | Description                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `useMinimified`          | `false` (default): demos via Vite sources (ES imports). `true`: loads `dist/` bundles (`.min` suffix if minified) — home (`search-engine` / `location-search`), map (`entree-carto` + `createStandardViewer`), `/geometry-editor`, `/sketch`. Prerequisite: `npm run build` (or relevant `build:*` targets). In dev / preview, Vite serves `/dist/` via middleware. |
| `configScriptUrl`        | Optional URL for `/map/gpu-client-config.js` (prod, dev, local). Loads globals `LAYER_CONFIG`, `LEGEND_CONFIG`, …        |
| _(GitHub Pages)_         | Build `npm run build:demo:pages`: `dist/js/demo-config.js` automatically points to `https://www.geoportail-urbanisme.gouv.fr/map/gpu-client-config.js` (source `public/js/demo-config.js` stays on local `127.0.0.1:8000` for dev). |
| `document`               | GPU document `{ id, type, status, name, bbox? }` — WMS preview + fiche on **`/map`** load (after `gpu-client-config`)   |
| `bbox`                   | `[minLon, minLat, maxLon, maxLat]` (EPSG:4326) if no search handoff from `/`; skipped when URL hash already has `lon`/`lat` (permalink) |
| `gpuConfigOverrides`     | Object merged into `gpu.config` / entree-carto `config`                                                                   |
| `map.baseLayerId`        | `carte` \| `carte-nb` \| `photo` \| `mixte` \| `cadastre` \| `blank` (gpu presets)                                         |
| `map.zoom`               | Initial zoom (default 6)                                                                                                 |
| `map.layerNodes`         | Side panel catalogue tab (id, title, visible, legend?)                                                                   |
| `map.search`             | Initial search (ignored if home → map handoff)                                                                           |
| `home.searchPlaceholder` | Search placeholder on `/`                                                                                                |
| `home.searchWidget`      | `'search-engine'` (default, gpu-site look with Advanced) \| `'location'` (light autocomplete, no geopf)                  |

## Examples

See commented blocks at the bottom of `public/js/demo-config.js` (gpu-site environments, DU / SUP / SCOT datasets).

## Document preview (`document` + `bbox`)

1. Open **`http://localhost:5173/map`** (not `/` alone).
2. **`configScriptUrl`** must load (e.g. local gpu-site on `127.0.0.1:8000`): without `LAYER_CONFIG` and WMS URLs, no `_previsu` layers or full API fiche.
3. On startup: fit `bbox` (or `document.bbox`), WMS layers filtered on `document.name` (partition), territory fiche at extent center when `apiFicheInfoUrl` is in GPU config.
4. **`document.type`** (and `name` for MEC) drives catalogue checkboxes like gpu-client: PLU/POS/CC/PLUi/PSMV → DU overview + detail; SUP → SUP branch; SCoT → SCOT; MEC → `_DU_` / `_scot_` in name. Takes priority over `dev-*` keys written later into the hash by the map; **skipped** only when the hash **at page open** already had layer parameters.
4. Clear hash `#lon=…` or use a fresh tab if the map does not move (map permalink overrides `bbox`).

## `/map` load priorities

1. Search handoff from home (SPA)
2. Otherwise `map.search` or JS file `bbox` / `document`
3. **_Data_ catalogue**: if `configScriptUrl` defined `window.LAYER_CONFIG`, tree via `layerConfigToTreeNodes`; otherwise JS file `map.layerNodes`
4. After gpu script load, merge `window.gpu.config` into entree-carto `config` module (WMS URLs, etc.); relative `*Url` fields (e.g. `/api/fiche-info`) resolve against the `gpu-client-config.js` script URL, not the SPA origin.

## Limits

- Simplified WMS (`GpuWmsLayerRegistry`): GetMap names **identical** to `LAYER_CONFIG.name` (e.g. `dev-document`, `config.prefix` kept); CQL filters `filterAttribute` / `filterValue` / `filterValueLike`; no gpu-client zoom hub.
- Before `gpu-client-config.js` loads, stub `window.gpu.config` is created for `legendImageDetailDirectory` and WMS URLs.
- **Vite dev**: URLs `http://127.0.0.1:8000/…` (or `localhost:8000`) rewritten to same-origin proxy `/__gpu_dev_proxy__/…` (`vite.config.ts`) to avoid _OpaqueResponseBlocking_ on legends and config `fetch`.
- `LEGEND_CONFIG`: not yet mapped automatically to Legends tab.
