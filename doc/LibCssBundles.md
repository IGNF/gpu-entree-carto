[![en](https://img.shields.io/badge/lang-en-red.svg)](LibCssBundles.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](LibCssBundles.fr.md)

# Library bundle CSS (`dist/css/`)

**Lib** builds (gpu-site integration) produce one CSS file per JS bundle, same pattern as scripts.

## Files

| CSS | Associated JS | gpu-site usage |
| --- | --- | --- |
| `entree-carto.css` / `.min.css` | `entree-carto.js` | Mapping `/map/`, embed `createStandardViewer` |
| `entree-carto-location-search.css` / `.min.css` | `entree-carto-location-search.js` | **Light** home — `gpu.mountLocationSearch` ([LocationSearchWidget](./LocationSearchWidget.md)) |
| `entree-carto-search-engine.css` / `.min.css` | `entree-carto-search-engine.js` | Home **geopf SearchEngine** — `gpu.mountSearchEngine` ([mountSearchEngine](./mountSearchEngine.md)) |
| `entree-carto-geometry-editor.css` / `.min.css` | `entree-carto-geometry-editor.js` | Geometry forms |
| `entree-carto-sketch.css` / `.min.css` | `entree-carto-sketch.js` | Standalone sketch |

Build: `make build-lib`, `make build-location-search`, `make build-search-engine`, etc. (see [INTEGRATION.md](./INTEGRATION.md)).

## Home — minimal CSS

**Autocomplete only** (no geopf SearchEngine):

```html
<link rel="stylesheet" href="{{ asset('build/vendor/entree-carto/css/entree-carto-location-search.min.css') }}" />
<script src="{{ asset('build/vendor/entree-carto/entree-carto-location-search.min.js') }}"></script>
```

Site must already load **DSFR** (`dsfr.min.css`): widget reuses `fr-search-bar`, `fr-input`, `fr-label`.

**Full SearchEngine** (home banner = same UX as map):

```html
<link rel="stylesheet" href="{{ asset('build/vendor/entree-carto/css/entree-carto-search-engine.min.css') }}" />
<script src="{{ asset('build/vendor/entree-carto/entree-carto-search-engine.min.js') }}"></script>
```

Or keep `entree-carto.min.js` (global API) + **only** `entree-carto-search-engine.min.css` (styles removed from `mountSearchEngine` path in main bundle).

## Map

```html
<link rel="stylesheet" href="{{ asset('build/vendor/entree-carto/css/entree-carto.min.css') }}" />
<script src="{{ asset('build/vendor/entree-carto/entree-carto.min.js') }}"></script>
```

**Remix Icon** fonts: referenced as `url(../assets/remixicon-*.woff2)` from `css/` — copy full `dist/` (`css/` and `assets/` folders) to `vendor/entree-carto/`.

## SVGO errors (gpu-site webpack)

Symptom on gpu-site `npm run build`:

```text
postcss-svgo: … Parsed entity count exceeds max entity count
… unicode='&#xEC03;' … remixicon …
```

**Cause:** older entree-carto builds embedded Remix **SVG font** as data-URI in CSS (thousands of glyphs). webpack **CssMinimizerPlugin** re-ran SVGO on CSS **already minified** by Vite.

**entree-carto side (fixed):** plugin `vite/remixiconExternal.ts` — no inline SVG font, external woff2 under `dist/assets/`.

**gpu-site side (recommended):**

1. Use delivered **`*.min.css`** in `vendor/entree-carto/css/` **without** passing them through `CssMinimizerPlugin`, e.g.:

```js
new CssMinimizerPlugin({
  exclude: /vendor\/entree-carto\/css\//,
})
```

2. Or disable SVGO for those files:

```js
new CssMinimizerPlugin({
  minimizerOptions: {
    preset: ['default', { svgo: false }],
  },
  include: /vendor\/entree-carto\/css\//,
})
```

3. Update entree-carto vendor after `make build` in repo (CSS ≈ 3 MB map, ≈ 1.6 MB geometry-editor/sketch, ≈ 1 KB location-search).

## Dependencies

- [INTEGRATION.md](./INTEGRATION.md) — webpack copy, script order
- [LocationSearchWidget.md](./LocationSearchWidget.md)
- [mountSearchEngine.md](./mountSearchEngine.md)
