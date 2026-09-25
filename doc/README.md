[![en](https://img.shields.io/badge/lang-en-red.svg)](README.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](README.fr.md)

# Map control documentation

Each map control / cartographic component has a Markdown page here.  
When adding or changing a control: **update the associated page** (description, options, relevant details).

## Third-party site integration

- [gpu-site integration](./INTEGRATION.md) — replacing gpu-client, `dist/`, current limits
- [Library CSS bundles](./LibCssBundles.md) — CSS chunks (light home page, webpack SVGO)
- [gpu-client ↔ IGNF equivalents](./GPU_CLIENT_EQUIVALENTS.md) — feature matrix / vue-components / geopf / entree-carto IGNF
- [Demo](./Demo.md) — routes `/` (location), `/map` (map), `/geometry-editor`, `/sketch` + DSFR nav
- [Demo configuration](./DemoConfig.md) — `public/js/demo-config.js` (gpu-client `exemple-config.js` equivalent)
- [Notifications](./Notifications.md) — Notivue toasts in cartes.gouv.fr style

## Controls

| Control                     | Source file                                                  | Documentation                                                      |
| --------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| MapShell                    | `src/components/map/MapShell.vue`                            | [MapShell.md](./MapShell.md)                                       |
| ZoomControl                 | `src/components/map/ZoomControl.vue`                         | [ZoomControl.md](./ZoomControl.md)                                 |
| FullScreenControl           | `src/components/map/FullScreenControl.vue`                   | [FullScreenControl.md](./FullScreenControl.md)                     |
| ScaleLineControl            | `src/components/map/ScaleLineControl.vue`                    | [ScaleLineControl.md](./ScaleLineControl.md)                       |
| SearchEngineControl         | `src/components/map/SearchEngineControl.vue`                 | [SearchEngineControl.md](./SearchEngineControl.md)                 |
| mountSearchEngine           | `src/lib/mountSearchEngine.ts`                               | [mountSearchEngine.md](./mountSearchEngine.md)                     |
| LocationSearchWidget        | `src/components/search/LocationSearchWidget.vue`             | [LocationSearchWidget.md](./LocationSearchWidget.md)               |
| OverviewMapControl          | `src/components/map/OverviewMapControl.vue`                  | [OverviewMapControl.md](./OverviewMapControl.md)                   |
| TerritoriesControl          | `src/components/map/TerritoriesControl.vue`                  | [TerritoriesControl.md](./TerritoriesControl.md)                   |
| TabPanelsControl            | `src/components/map/TabPanelsControl.vue`                    | [TabPanelsControl.md](./TabPanelsControl.md)                       |
| LayerCataloguePanel         | `src/components/panels/LayerCataloguePanel.vue`              | [TabPanelsControl.md](./TabPanelsControl.md#panel-components)      |
| DataLayersManagerPanel      | `src/components/panels/DataLayersManagerPanel.vue`           | [DataLayersManagerPanel.md](./DataLayersManagerPanel.md)           |
| LayerLegendsPanel           | `src/components/panels/LayerLegendsPanel.vue`                | [LayerLegendsPanel.md](./LayerLegendsPanel.md)                     |
| CatalogLayerTree            | `src/components/layers/CatalogLayerTree.vue`                 | [CatalogLayerTree.md](./CatalogLayerTree.md)                       |
| CatalogLayerSearch          | `src/components/layers/CatalogLayerSearch.vue`               | [CatalogLayerSearch.md](./CatalogLayerSearch.md)                   |
| BaseLayerRadioList          | `src/components/layers/BaseLayerRadioList.vue`               | [BaseLayerRadioList.md](./BaseLayerRadioList.md)                   |
| TileLayerSwitcher           | `src/components/layers/TileLayerSwitcher.vue`                | [TileLayerSwitcher.md](./TileLayerSwitcher.md)                     |
| TreeLayerSwitcher           | `src/components/layers/TreeLayerSwitcher.vue`                | [TreeLayerSwitcher.md](./TreeLayerSwitcher.md)                     |
| BaseLayerSwitcher           | `src/components/map/BaseLayerSwitcher.vue`                   | [BaseLayerSwitcher.md](./BaseLayerSwitcher.md)                     |
| GeometryEditor (standalone) | `src/geometry-editor/`                                       | [GeometryEditor.md](./GeometryEditor.md)                           |
| SketchControl               | `src/geometry-editor/SketchControl.ts` + `SketchControl.vue` | [SketchControl.md](./SketchControl.md)                             |
