[![en](https://img.shields.io/badge/lang-en-red.svg)](README.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](README.fr.md)

# Documentation des contrôles carte

Chaque contrôle / composant cartographique a une page Markdown ici.  
À chaque ajout ou modification de contrôle : **mettre à jour la page associée** (description, options, détails pertinents).

## Intégration site tiers

- [Intégration gpu-site](./INTEGRATION.fr.md) — remplacement de gpu-client, `dist/`, limites actuelles
- [CSS bundles lib](./LibCssBundles.fr.md) — chunks CSS (accueil léger, SVGO webpack)
- [Équivalents gpu-client ↔ IGNF](./GPU_CLIENT_EQUIVALENTS.fr.md) — matrice fonctionnalités / vue-components / geopf / entree-carto IGNF
- [Démonstration](./Demo.fr.md) — pages `/` (localisation), `/map` (carte), `/geometry-editor`, `/sketch` + nav DSFR
- [Configuration démo](./DemoConfig.fr.md) — `public/js/demo-config.js` (équivalent gpu-client `exemple-config.js`)
- [Notifications](./Notifications.fr.md) — toasts Notivue style cartes.gouv.fr

## Contrôles

| Contrôle                    | Fichier source                                               | Documentation                                                   |
| --------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| MapShell                    | `src/components/map/MapShell.vue`                            | [MapShell.md](./MapShell.fr.md)                                    |
| ZoomControl                 | `src/components/map/ZoomControl.vue`                         | [ZoomControl.md](./ZoomControl.fr.md)                              |
| FullScreenControl           | `src/components/map/FullScreenControl.vue`                   | [FullScreenControl.md](./FullScreenControl.fr.md)                  |
| ScaleLineControl            | `src/components/map/ScaleLineControl.vue`                    | [ScaleLineControl.md](./ScaleLineControl.fr.md)                    |
| SearchEngineControl         | `src/components/map/SearchEngineControl.vue`                 | [SearchEngineControl.md](./SearchEngineControl.fr.md)              |
| mountSearchEngine           | `src/lib/mountSearchEngine.ts`                               | [mountSearchEngine.md](./mountSearchEngine.fr.md)                  |
| LocationSearchWidget        | `src/components/search/LocationSearchWidget.vue`             | [LocationSearchWidget.md](./LocationSearchWidget.fr.md)            |
| OverviewMapControl          | `src/components/map/OverviewMapControl.vue`                  | [OverviewMapControl.md](./OverviewMapControl.fr.md)                |
| TerritoriesControl          | `src/components/map/TerritoriesControl.vue`                  | [TerritoriesControl.md](./TerritoriesControl.fr.md)                |
| TabPanelsControl            | `src/components/map/TabPanelsControl.vue`                    | [TabPanelsControl.md](./TabPanelsControl.fr.md)                    |
| LayerCataloguePanel         | `src/components/panels/LayerCataloguePanel.vue`              | [TabPanelsControl.fr.md](./TabPanelsControl.fr.md#composants-panneau) |
| DataLayersManagerPanel      | `src/components/panels/DataLayersManagerPanel.vue`           | [DataLayersManagerPanel.md](./DataLayersManagerPanel.fr.md)        |
| LayerLegendsPanel           | `src/components/panels/LayerLegendsPanel.vue`                | [LayerLegendsPanel.md](./LayerLegendsPanel.fr.md)                  |
| CatalogLayerTree            | `src/components/layers/CatalogLayerTree.vue`                 | [CatalogLayerTree.md](./CatalogLayerTree.fr.md)                    |
| CatalogLayerSearch          | `src/components/layers/CatalogLayerSearch.vue`               | [CatalogLayerSearch.md](./CatalogLayerSearch.fr.md)                |
| BaseLayerRadioList          | `src/components/layers/BaseLayerRadioList.vue`               | [BaseLayerRadioList.md](./BaseLayerRadioList.fr.md)                |
| TileLayerSwitcher           | `src/components/layers/TileLayerSwitcher.vue`                | [TileLayerSwitcher.md](./TileLayerSwitcher.fr.md)                  |
| TreeLayerSwitcher           | `src/components/layers/TreeLayerSwitcher.vue`                | [TreeLayerSwitcher.md](./TreeLayerSwitcher.fr.md)                  |
| BaseLayerSwitcher           | `src/components/map/BaseLayerSwitcher.vue`                   | [BaseLayerSwitcher.md](./BaseLayerSwitcher.fr.md)                  |
| GeometryEditor (standalone) | `src/geometry-editor/`                                       | [GeometryEditor.md](./GeometryEditor.fr.md)                        |
| SketchControl               | `src/geometry-editor/SketchControl.ts` + `SketchControl.vue` | [SketchControl.md](./SketchControl.fr.md)                          |
