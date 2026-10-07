[![en](https://img.shields.io/badge/lang-en-red.svg)](TabPanelsControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](TabPanelsControl.fr.md)

# TabPanelsControl

**4-tab** side panel on the right of the map. Only the **tab strip** is an OpenLayers control; panel content sits outside `.ol-control`.

**Source:** `src/components/map/TabPanelsControl.vue`  
**Styles:** `src/styles/tab-panels.css`  
**Layout constants:** `src/lib/map/tabPanelsLayout.ts`  
**API:** `src/composables/tabPanels.ts`  
**Layer state:** `src/composables/managedLayers.ts`  
**Reference:** gpu-client `TabsPanelsControl` + cartes.gouv.fr (side panel TODO)

## DOM architecture

| Node | Role |
| ---- | ---- |
| `ec-tab-panels-shell` | Overlay on the map shell; hosts the content surface (`is-open` when the sheet is visible). `data-ec-tab-panels-layout`: `side` (desktop) or `bottom` (mobile, future). |
| `ec-tab-panels__tabs-control` | **Only** element passed to `ol/control/Control` — OpenLayers adds `.ol-control`; tab buttons override `ol.css` (`1.375em`). |
| `ec-tab-panels__surface` | DSFR panel (catalogue, fiche, layers, legends) — **not** under `.ol-control`. |

## Behaviour

- **Closed by default**: vertical stack of 4 tab buttons **flush** (48×48, group shadow, like zoom +/- without gutter).
- No border / white inset on active state (solid blue background).
- **Open**: panel (~490 px, `--ec-tab-panels-width`: `30.6rem`) on the right; buttons **flush** to the panel left edge (no gap).
- Tab click: activates tab and opens panel; click on already active tab: closes.
- One active tab at a time.
- On open, `.ec-map-shell--tab-panels-open` shifts zoom, full screen and scale by `--ec-tab-panels-inset` (= panel width) + same `--ec-widget-gap` as map edge when panel closed.
- Tab control: `pointer-events: none !important` on `.ol-control`, auto on the tab column — bottom-right zoom / full screen stay clickable.
- Panel surface: `pointer-events: auto` on `ec-tab-panels__surface` only when open.

## Mobile (≤ 48rem)

- **`data-ec-tab-panels-layout="bottom"`** on `ec-tab-panels-shell` (`matchMedia`, `ec-map-shell--tab-panels-layout-bottom` on the map shell).
- **Horizontal** tab bar at the bottom (`ec-tab-panels__tabs-control` in `#gpu-map`), above `safe-area-inset-bottom`.
- **`ec-tab-panels__surface`** sheet height via **`--ec-tab-panels-sheet-fraction`** (snaps **0 / 35 / 70 / 98 %**), drag handle **`ec-tab-panels__sheet-grab`**.
- Cap **`--ec-tab-panels-max-sheet-height`** = map area (`100cqb`) − safe top − **`--ec-tab-panels-site-header-offset`** when the site header overlaps the map.
- Tab open (tap): snap **70 %**; auto open (click info, location search, `showSelection`): **preview 35 %** (`TAB_PANELS_AUTO_OPEN_SNAP`); same active tab again: close (0 %). Scale line / attributions lifted with **`--ec-bottom-widgets-lift`** when the sheet is open.
- **Bottom bar** (horizontal): on the **left**, **sketch** (first), **overview map**, **territories**; on the **right**, the **four tabs**; **zoom** / **full screen** (`ec-tab-panels__viewport-stack`). `useMobileBottomBarGeopf` moves the sketch root + geopf widgets. Sketch toggle stays in the bar; tool column `absolute` above it, scroll on `.ec-geometry-editor__toolbar`. Minimap: `--ec-mobile-minimap-top` (below place search).
- **Raised** above the bar (`--ec-mobile-footer-stack-base`, bar height only — **fixed** while the sheet moves): expanded overview, **attributions**, **scale line**.
- **Location search:** full width on top; compact **Parcel / Territory** icons directly below.
- **Modal slider** (`ec-tab-panels__modal-slider`): centered handle at the top of the sheet for snap changes.
- Logic: `useTabPanelsLayout`, `useTabPanelsMobileSheet`; constants in `tabPanelsLayout.ts`.
- **Desktop → mobile** with the panel already open: sheet opens at **35 % preview** snap (same active tab); `--ec-tab-panels-inset` stays **0** (attributions / scale use the zoom column inset, not desktop panel width). Tab bar: right padding is gap only (zoom / full screen float above).
- geopf-style tooltips on hover (`aria-label` → `::after`, left of buttons); hidden when tab is active.

## Tabs

| #   | Icon                          | Content                                                                                                                                                      |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0   | DSFR `fr-icon-map-pin-2-line` | **Info / location** — `FicheInfoPanel` (Parcel / Territory layouts, cadastre modal, lazy tab load); GPU config wait then `/api/fiche-info` when a cherry marker is present |
| 1   | Remix `ri-map-2-line`         | **Catalogue** — DSFR sub-tabs _Data_ ([CatalogLayerTree](./CatalogLayerTree.md)) and _Base maps_ ([BaseLayerRadioList](./BaseLayerRadioList.md))           |
| 2   | Remix `ri-stack-line`         | **Data layers** — stack of layers checked in catalogue: visibility, opacity, order, remove                                                                    |
| 3   | Remix `ri-list-indefinite`    | **Legends** — legends for visible layers in the stack                                                                                                        |

Remix icons: `remixicon` package (global CSS in `main.ts`).

## Props

| Prop             | Type                   | Description                                       |
| ---------------- | ---------------------- | ------------------------------------------------- |
| `basePresets`    | `GpuBaseLayerPreset[]` | Bases for catalogue → Base maps                   |
| `baseModelValue` | `GpuBaseLayerId`       | Active base (`v-model:base-model-value`)          |
| `layerNodes`     | `TreeLayerNode[]`      | _Data_ catalogue / stack / legends                |
| `catalogLayersLoading` | `boolean`        | `true` while `LAYER_CONFIG` is not ready (spinner in catalogue) |
| `layerMapHooks`  | `LayerMapHooks?`       | Visibility / opacity callbacks → map (demo WMS)   |

## Events

| Event                   | Description                        |
| ----------------------- | ---------------------------------- |
| `toggle-layer`          | Map visibility (`id`, `visible`)   |
| `update:baseModelValue` | Base map change                    |

## API (`TabPanelsApi`)

Exposed via `provide`, `defineExpose`, and `tabPanelsApiRef` (sibling access, e.g. SearchEngine):

- `openTab(index)` / `closePanels()`
- `openLegendForLayer(layerId)` — Legends tab, expands layer and scrolls (see [LayerLegendsPanel](./LayerLegendsPanel.md))
- `showSelection({ title, bodyHtml?, raw? })` — fills info tab, opens tab 0
- `clearSelection()`
- refs: `isOpen`, `activeTab`, `selection`

## Panel components

| Component                | File                                                     |
| ------------------------ | -------------------------------------------------------- |
| `LayerCataloguePanel`    | `src/components/panels/LayerCataloguePanel.vue`          |
| `DataLayersManagerPanel` | [DataLayersManagerPanel.md](./DataLayersManagerPanel.md) |
| `LayerLegendsPanel`      | [LayerLegendsPanel.md](./LayerLegendsPanel.md)           |

## Location integration

`SearchEngineControl` calls `showSelection` **before** placing the marker (`initialSearch` / home → map), then recentres outside the panel-covered area to keep geopf popup visible. GetFeatureInfo will later use the same API.

## Current limits

- Structured sheet by selection: rich content to wire later.
- Opacity / order: tab 3 stack wired to hooks; no gpu-client zoom greying yet.
- `scaleDependant` legends: URL fixed at initial zoom (no OL zoom listener yet).
- Layer permalink: see [MapPermalink.md](./MapPermalink.md) (catalog + data layers stack).

## Dependencies

- Child of `MapShell` (`olMap` injection)
- DSFR + Remix Icon icons
- Components: `FicheInfoPanel`, `LayerCataloguePanel` (+ `CatalogLayerTree`, `BaseLayerRadioList`), `DataLayersManagerPanel`, `LayerLegendsPanel`, `TreeLayerSwitcher` (stack / legends)
- Catalogue styles: `src/styles/layer-catalogue.css` (full-width DSFR tabs)
