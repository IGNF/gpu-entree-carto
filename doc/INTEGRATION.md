[![en](https://img.shields.io/badge/lang-en-red.svg)](INTEGRATION.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](INTEGRATION.fr.md)

# Third-party site integration (gpu-site)

Guide to replace **gpu-client** with **entree-carto** in gpu-site (`dsfr` branch).

---

## Goal

gpu-site currently loads gpu-client as a JS library (`window.gpu`) via npm + webpack.  
entree-carto provides the same global entry **`window.gpu`** and a **`dist/`** folder ready to copy into `public/build/vendor/`.

---

## `dist/` contents (library)

After `make build-lib`, `make build-location-search`, `make build-search-engine`, `make build-geometry-editor`, and `make build-sketch`:

```
dist/
  entree-carto.js / .min.js
  entree-carto-location-search.js / .min.js   # light home (mountLocationSearch)
  entree-carto-search-engine.js / .min.js     # home geopf SearchEngine (mountSearchEngine)
  entree-carto-geometry-editor.js / .min.js   # form mini-map (replaces ol-geometry-editor)
  entree-carto-sketch.js / .min.js            # standalone sketch (mountSketch / SketchControl)
  assets/                                     # Remix fonts (woff2), …
  css/
    entree-carto.css / .min.css
    entree-carto-location-search.css / .min.css
    entree-carto-search-engine.css / .min.css
    entree-carto-geometry-editor.css / .min.css
    entree-carto-sketch.css / .min.css
```

Per-page CSS detail: [LibCssBundles.md](./LibCssBundles.md) (chunks, webpack SVGO, minimal home).

Vue 3, OpenLayers ≥ 9 and map styles are **bundled** (no site-side OpenLayers v4 for the map).  
geometry-editor and sketch also embed OpenLayers (standalone bundles).

---

## Exposed API (`window.gpu`)

| Member                              | Status     | gpu-site usage                                              |
| ----------------------------------- | ---------- | ----------------------------------------------------------- |
| `gpu.config`                        | Compatible | Enriched by `gpu_client_config.js.twig`                     |
| `gpu.createStandardViewer(params)`  | Partial    | `/map/` — map + centre if `params.search`                   |
| `gpu.mountSearchEngine(el, opts)`   | Yes        | Home — same SearchEngine as map → redirect `/map/`          |
| `gpu.mountLocationSearch(el, opts)` | Fallback   | Home — autocomplete only                                    |
| `gpu.ParcelViewer`                  | Stub       | `/map/parcel-info/` — map only, no parcel sheet             |
| `gpu.services.Geocode`              | Partial    | Home — autocomplete (Gp or Géoplateforme fetch)             |
| `gpu.control.LocateControl`         | Compatible | Home autocomplete filters                                   |

### Current limits (plan on gpu-site side)

The following pages are **not fully functional** until features are ported from gpu-client:

| gpu-site page    | Route                    | Main gaps                                               |
| ---------------- | ------------------------ | ------------------------------------------------------- |
| Mapping          | `/map/`                  | Business layers, legend, info sheet, tools, document, search |
| Parcel sheet     | `/map/parcel-info/{id}/` | Parcel info sheet, parcel legend, dedicated scale       |
| Home (geoloc)    | `/`                      | OK if `Gp` loaded; no map                               |

---

## Integration steps in gpu-site

### 1. npm dependency

In gpu-site `package.json`, replace gpu-client. Locally (sibling clones):

```json
"entree-carto": "file:../entree-carto"
```

In CI / after publishing `main` with up-to-date `dist/`:

```json
"entree-carto": "git+https://github.com/IGNF/gpu-entree-carto.git#main"
```

Then `npm install` (and `make build-lib` in entree-carto if `file:` dependency).

### 2. Webpack — asset copy

In `webpack.config.js`, replace gpu-client copy:

```js
{ from: "node_modules/gpu-client/dist", to: "vendor/gpu-client" },
```

with:

```js
{ from: "node_modules/entree-carto/dist", to: "vendor/entree-carto" },
```

### 3. Twig templates — mapping (`templates/map/index.html.twig`)

**Remove** (OpenLayers v4 — bundled in entree-carto):

```twig
<link rel="stylesheet" href="{{ asset('build/gpu/css/ol.css') }}" />
<script src="{{ asset('build/gpu/js/openlayers/ol.js') }}"></script>
```

**Replace** gpu-client with entree-carto:

```twig
<link rel="stylesheet" href="{{ asset('build/vendor/entree-carto/css/entree-carto.css') }}" />
<script src="{{ asset('build/vendor/entree-carto/entree-carto.js') }}"></script>
```

Keep:

- `GpServices.js` (home geocoding / Géoplateforme services)
- `gpu_map_client_config_js` (dynamic config)
- `cartographie.js` (calls `gpu.createStandardViewer`)

### 4. Parcel sheet template (`templates/map/parcel.html.twig`)

Same CSS/JS replacement as above.  
`parcel.js` unchanged; `ParcelViewer` shows minimal map and logs a warning.

### 5. Home page (`templates/default/index.html.twig` + banner)

**geopf SearchEngine** (recommended, same UX as `/map/`):

```twig
<link rel="stylesheet" href="{{ asset('build/vendor/entree-carto/css/entree-carto-search-engine.min.css') }}" />
<script src="{{ asset('build/vendor/entree-carto/entree-carto-search-engine.min.js') }}"></script>
```

**Autocomplete-only fallback** ([LocationSearchWidget](./LocationSearchWidget.md)) — CSS ≈ 1 KB:

```twig
<link rel="stylesheet" href="{{ asset('build/vendor/entree-carto/css/entree-carto-location-search.min.css') }}" />
<script src="{{ asset('build/vendor/entree-carto/entree-carto-location-search.min.js') }}"></script>
```

(Site DSFR already loaded; no need for `entree-carto.min.css` on home alone.)

**Replace** gazetteer form (`#searchForm` / `callGazetteerService.js`) with the **same** SearchEngine as on the map:

```twig
{# banner_part.html.twig #}
<div
  id="gpu-location-search"
  data-map-url="{{ path('gpu_map') }}"
  data-placeholder="{{ 'home.search_place'|trans({}) }}"
></div>
```

```js
// assets/js/mountLocationSearchHome.js
gpu.mountSearchEngine(document.getElementById('gpu-location-search'), {
  mode: 'redirect',
  mapUrl: el.getAttribute('data-map-url') || '/map/',
  method: 'POST',
  placeholder: el.getAttribute('data-placeholder') || '…',
})
```

See [mountSearchEngine.md](./mountSearchEngine.md).  
Light fallback: `gpu.mountLocationSearch` ([LocationSearchWidget.md](./LocationSearchWidget.md)).

### 6. JavaScript config

File `templates/map/gpu_client_config.js.twig` can stay as-is: it does `Object.assign(gpu.config, { … })`.  
Optional later rename to `map_config.js.twig`.

### 7. Site CSS

`assets/css/gpu-map.css` targets `#gpu-map`: entree-carto sets `id="gpu-map"` on the map container to keep height (726 px).

Gradually adapt selectors tied to legacy gpu-client controls (`.ol-control`, panels, etc.).

**Icons:** gpu-site already loads DSFR (`dsfr.min.css` + `utility/utility.min.css`). entree-carto bundle also includes geopf DSFR + `icons.min.css`. geopf buttons with `fr-icon-*` (close, delete…) painted icons twice (`::before` DSFR + geopf `::after` at 100% button). Fixed in `map-controls.css` (neutralise `::after` when `fr-icon-*` present).

### Webpack — do not re-minify vendor CSS

entree-carto `*.min.css` files are already minified by Vite. Excluding `vendor/entree-carto/css/` from `CssMinimizerPlugin` avoids **postcss-svgo** warnings (`Parsed entity count exceeds max entity count` on legacy Remix SVG fonts). See [LibCssBundles.md](./LibCssBundles.md).

---

## Script load order (mapping)

```html
<script src="…/geoportal-access-lib/GpServices.js"></script>
<script src="…/entree-carto/entree-carto.js"></script>
<script src="/map/gpu-client-config.js"></script>
{# gpu.config + LAYER_CONFIG… #}
<script src="…/gpu/js/map/cartographie.js"></script>
```

**Do not load** v4 `ol.js` on these pages.

---

## Build entree-carto before release

```sh
cd entree-carto
make install
make build-lib   # or make build (demo + lib)
```

Verify `dist/entree-carto.js` and `dist/entree-carto.min.js` exist before tag / merge to `main`.

---

## Coupled local development

```sh
# Terminal 1 — entree-carto
cd ../entree-carto && make dev

# Terminal 2 — gpu-site (dsfr branch, after npm link or path integration)
cd ../gpu-site && npm install && npm run watch
```

To test without publishing: in gpu-site `package.json`:

```json
"entree-carto": "file:../entree-carto"
```

Then `npm install` and `make build-lib` in entree-carto.

---

## Functional roadmap

- [ ] `createStandardViewer`: WMS/WFS layers, legend, info sheet, tools
- [x] Home place search → `/map/` (`mountSearchEngine` + `params.search` → `SearchEngineControl.initialSearch`)
- [ ] Full `ParcelViewer`
- [x] 4-tab side panel shell (`TabPanelsControl`) + switcher stubs
- [ ] Wire `layerConfig` / legends from gpu-client-config
- [ ] GetFeatureInfo → sheet + raw
- [ ] Avoid double DSFR / `icons` load (site `utility.min.css` + bundle) if needed
- [x] Duplicate geopf `::after` + DSFR `fr-icon-*` icons (fixed in `map-controls.css`)
- [ ] gpu-site integration tests (map, parcel, home journeys)

---

## See also

- [Project README](../README.md)
- [Map controls](./README.md)
- Historical reference: gpu-client
