[![en](https://img.shields.io/badge/lang-en-red.svg)](TabPanelsControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](TabPanelsControl.fr.md)

# TabPanelsControl

**4-tab** side panel (OpenLayers control), on the right of the map.

**Source:** `src/components/map/TabPanelsControl.vue`  
**Styles:** `src/styles/tab-panels.css`  
**API:** `src/composables/tabPanels.ts`  
**Layer state:** `src/composables/managedLayers.ts`  
**Reference:** gpu-client `TabsPanelsControl` + cartes.gouv.fr (side panel TODO)

## Behaviour

- **Closed by default**: vertical stack of 4 tab buttons **flush** (48×48, group shadow, like zoom +/- without gutter). Styles override OpenLayers `.ol-control button` (`1.375em`).
- No border / white inset on active state (solid blue background).
- **Open**: panel (~490 px, `--ec-tab-panels-width`: `30.6rem`) on the right; buttons **flush** to the panel left edge (no gap).
- Tab click: activates tab and opens panel; click on already active tab: closes.
- One active tab at a time.
- On open, `.ec-map-shell--tab-panels-open` shifts zoom, full screen and scale by `--ec-tab-panels-inset` (= panel width) + same `--ec-widget-gap` as map edge when panel closed.
- Full-height container with `pointer-events: none !important` (OpenLayers sets `pointer-events: auto` inline); only children (tabs / panel) receive clicks — otherwise bottom-right zoom / full screen are blocked.
- geopf-style tooltips on hover (`aria-label` → `::after`, left of buttons); hidden when tab is active.

## Tabs

| #   | Icon                          | Content                                                                                                                                                      |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0   | DSFR `fr-icon-map-pin-2-line` | **Info / location** — structured sheet (`FicheInfoPanel`); raw data (`raw`) at bottom if present                                                             |
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
- No layer permalink (out of scope).

## Dependencies

- Child of `MapShell` (`olMap` injection)
- DSFR + Remix Icon icons
- Components: `FicheInfoPanel`, `LayerCataloguePanel` (+ `CatalogLayerTree`, `BaseLayerRadioList`), `DataLayersManagerPanel`, `LayerLegendsPanel`, `TreeLayerSwitcher` (stack / legends)
- Catalogue styles: `src/styles/layer-catalogue.css` (full-width DSFR tabs)
