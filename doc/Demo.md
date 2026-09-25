[![en](https://img.shields.io/badge/lang-en-red.svg)](Demo.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](Demo.fr.md)

# Demo (Vite)

Local demo pages (`npm run dev`) to validate controls and the home → map journey.

## Configuration (`demo-config.js`)

Like gpu-client `exemple-config.js`: edit **`public/js/demo-config.js`** (`window.DEMO_CONFIG`) for `gpu-client-config` URL, document, bbox, API overrides, catalogue layers, etc. — no rebuild. See [DemoConfig.md](./DemoConfig.md).

## Routes

| Route              | View                     | Role                                                                                                                                                                                                                |
| ------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                | `HomeView.vue`           | gpu-site-style home (`GpuHomeBanner`: title, CONSULTER badge, DSFR decor); location widget or `mountSearchEngine` per `home.searchWidget` → `/map` (SPA handoff). If `useMinimified: true`: `dist/` bundles instead of Vite imports. |
| `/map`             | `DemoView.vue`           | Full-frame map + [TabPanelsControl](./TabPanelsControl.md) + [SketchControl](./SketchControl.md); centre via in-memory handoff; temporary **Notif test** button ([Notivue](./Notifications.md)). If `useMinimified: true`: `entree-carto[.min].js` + `#gpu-map-container` / `gpu.createStandardViewer`. |
| `/geometry-editor` | `GeometryEditorView.vue` | Standalone [GeometryEditor](./GeometryEditor.md) demo (`EntreeCartoGeometryEditor` if `useMinimified`)                                                                                                                                                               |
| `/sketch`          | `SketchDemoView.vue`     | [SketchControl](./SketchControl.md) / `EntreeCartoSketch.mountSketch` demo if `useMinimified` (options panel + map)                                                                                                                    |

## Navigation

`DemoHeader.vue` (DSFR): **Home**, **Map**, **Geometries**, **Sketch** links.

## Location flow

1. Validated search on `/` (`LocationSearchWidget` or `mountSearchEngine` per `demo-config`)
2. `prepareLocationHandoff` (`StandardViewerSearch` object in memory) + `router.push({ name: 'map' })` — **no** query, POST, or `sessionStorage`
3. `DemoView` reads `takeLocationHandoff()` → `SearchEngineControl.initialSearch`

On **gpu-site** (separate pages): `mode: 'redirect'` + POST form (`municipality`, `position_x`, …) then server injection of `params.search`.

## GitHub Pages

Demo published by workflow `pages.yml` (default branch):

1. `npm run build:demo:pages` (`base` from `GITHUB_REPOSITORY`, `configScriptUrl` → prod GPU)
2. Artifact `public/` (+ `404.html` = `index.html` for SPA routing)

After green workflow: **Settings → Pages** (source _GitHub Actions_), URL typically
`https://ignf.github.io/entree-carto/`. Admin boundary GeoJSON served under
`{BASE_URL}json-data/` (not at domain root `ignf.github.io/json-data/…`).

Locally, simulate GitHub Pages (same `base` at **build** and **preview**):

```bash
npm run serve:pages
```

Then open the URL shown by Vite (e.g. `http://localhost:4173/gpu-entree-carto/`), not root `http://localhost:4173/`.

Manual equivalent (adapt `GITHUB_REPOSITORY` to repo):

```bash
GITHUB_REPOSITORY=ignf/gpu-entree-carto npm run build:demo
GITHUB_REPOSITORY=ignf/gpu-entree-carto npm run preview
```

If Pages build used `GITHUB_REPOSITORY` but `npm run preview` runs without it, assets return HTML → MIME errors in console.

### Local build (`make build`)

`vite` uses `base: './'` (relative paths) to serve demo via **`npm run preview`**.

**Do not** open `dist/index.html` as `file://`: Firefox and Chrome **block ES modules** (`type="module"`) on local files — CORS / “disallowed URI” errors even with correct `./assets/` paths. A help page shows if you try anyway.

After `make build`: **`npm run preview`** then `http://localhost:4173/`.
