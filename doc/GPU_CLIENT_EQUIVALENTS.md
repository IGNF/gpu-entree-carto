[![en](https://img.shields.io/badge/lang-en-red.svg)](GPU_CLIENT_EQUIVALENTS.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](GPU_CLIENT_EQUIVALENTS.fr.md)

# gpu-client ↔ IGNF components

Inventory of gpu-client features and search for equivalents in the cartes.gouv.fr ecosystem.

## Important conclusion

**[cartes.gouv.fr-vue-components](https://github.com/IGNF/cartes.gouv.fr-vue-components) contains no map controls.**  
These are **UI chrome** components (header, footer, modals, SQL editor) based on VueDSFR.

Map equivalents live elsewhere:

| Repository                                                                             | Role                                                                  |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [geopf-extensions-openlayers](https://github.com/IGNF/geopf-extensions-openlayers)     | Géoplateforme **OpenLayers widgets** (source of truth for controls)   |
| [cartes.gouv.fr-entree-carto](https://github.com/IGNF/cartes.gouv.fr-entree-carto)     | **Vue wrappers** around geopf (`src/components/carte/control/*`)        |
| [cartes.gouv.fr-vue-components](https://github.com/IGNF/cartes.gouv.fr-vue-components) | Site chrome only (`CgfrHeader`, `CgfrFooter`, modals…)                |

---

## “Equivalent” column legend

| Symbol      | Meaning                                      |
| ----------- | -------------------------------------------- |
| **Yes**     | Direct usable equivalent                     |
| **Partial** | Close, but API / UX / GPU business differs   |
| **No**      | Rewrite required (GPU business)              |
| **Chrome**  | vue-components only (not map)                |

---

## Feature matrix

### Map shell / basic controls

| gpu-client                  | Role                        | vue-components | geopf-extensions               | cartes.gouv entree-carto (Vue) |
| --------------------------- | --------------------------- | -------------- | ------------------------------ | ------------------------------ |
| `Viewer`                    | Shell `ol.Map` (`#gpu-map`) | No             | OL Map + GeoPF layers          | `Map.vue` / `Carto.vue`        |
| `ol.control.Zoom`           | Zoom +/-                    | No             | `GeoportalZoom` **Yes**        | `Zoom.vue` **Yes**             |
| `ol.control.ScaleLine`      | Scale bar                   | No             | — (native OL)                  | `ScaleLine.vue` **Yes**        |
| `ol.control.Attribution`    | Credits                     | No             | `GeoportalAttribution` **Yes** | `Attributions.vue` **Yes**     |
| North reset                 | Reset north                 | No             | —                              | — **No**                       |
| `FullScreenSwitcherControl` | Full screen                 | No             | `GeoportalFullScreen` **Yes**  | `FullScreen.vue` **Yes**       |
| `BarControl`                | Grouped toolbar             | No             | `ControlList` **Partial**      | `ControlList.vue` **Partial**  |

### Base maps / layers

| gpu-client                        | Role                             | vue-components | geopf-extensions                        | cartes.gouv entree-carto                                               |
| --------------------------------- | -------------------------------- | -------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| `TileLayerSwitcherControl`        | 6 bases (Plan, Ortho, Cadastre…) | No             | `LayerSwitcher` **Partial**             | [TileLayerSwitcher](./TileLayerSwitcher.md) **Partial** (3 demo bases) |
| `TreeLayerSwitcherControl`        | GPU business layer tree          | No             | `LayerSwitcher` + `Catalog` **Partial** | [TreeLayerSwitcher](./TreeLayerSwitcher.md) **Partial** (stubs)        |
| Cadastre / region / dept layers   | Admin layers                     | No             | `LayerWMTS/WMS` **Partial**             | Vue layers **Partial**                                                 |
| `createGeoportalLayer` / WMTS     | IGN base helpers                 | No             | GeoPF sources **Yes**                   | via geopf **Yes**                                                      |

### Legend

| gpu-client                    | Role                  | vue-components | geopf-extensions  | cartes.gouv entree-carto |
| ----------------------------- | --------------------- | -------------- | ----------------- | ------------------------ |
| `LegendItem` / `LegendImages` | Legends in tree       | No             | `Legends` **Yes** | `Legends.vue` **Yes**    |
| `ParcelLegend`                | Parcel view legend    | No             | — **No**          | — **No**                 |

### Location / geocoding

| gpu-client                    | Role                       | vue-components | geopf-extensions                   | cartes.gouv entree-carto                       |
| ----------------------------- | -------------------------- | -------------- | ---------------------------------- | ---------------------------------------------- |
| `LocateControl`               | Place / address / parcel   | No             | `SearchEngine` **Yes**             | `SearchEngineControl` (geopf Advanced) **Yes** |
| `services.Geocode`            | Gp autocomplete + cadastre | No             | SearchEngine / IGN geocode **Yes** | via geopf **Yes**                              |
| `DistrictService`             | INSEE districts            | No             | — **No**                           | — **No**                                       |
| `ReverseGeocode` (absent gpu) | Address on click           | No             | `ReverseGeocode` **Yes**           | `ReverseGeocode.vue` **Yes**                   |

### Info sheet / map click

| gpu-client                          | Role                    | vue-components | geopf-extensions             | cartes.gouv entree-carto                                          |
| ----------------------------------- | ----------------------- | -------------- | ---------------------------- | ----------------------------------------------------------------- |
| `ClickInfoControl`                  | Click mode → sheet      | No             | `GetFeatureInfo` **Partial** | `GetFeatureInfo.vue` **Partial**                                  |
| `FicheInfo*` (DU/SUP/SCOT/parcel)   | GPU business sheet      | No             | — **No**                     | — **No** (GPU business)                                           |
| `GpuApiClient`                      | GPU Symfony API         | No             | — **No**                     | — **No**                                                          |
| `MarkerControl`                     | Marker + coords         | No             | markers util **Partial**     | **Partial**                                                       |
| `TabsPanelsControl`                 | Sheet / layer tabs      | No             | — **No**                     | [TabPanelsControl](./TabPanelsControl.md) **Partial** (4 tabs)      |
| `FeaturePopupControl`               | Sketch feature style    | No             | Drawing styles **Partial**   | `Drawing.vue` **Partial**                                         |

### Parcel

| gpu-client        | Role                  | vue-components | geopf-extensions | cartes.gouv entree-carto        |
| ----------------- | --------------------- | -------------- | ---------------- | ------------------------------- |
| `ParcelViewer`    | Parcel sheet page     | No             | — **No**         | — **No**                        |
| `ParcelMap`       | Dedicated parcel map  | No             | — **No**         | — **No**                        |
| `SetScaleControl` | Scale choice          | No             | — **No**         | ScaleLine only **Partial**      |

### Measure / draw / print

| gpu-client                          | Role                   | vue-components | geopf-extensions                          | cartes.gouv entree-carto             |
| ----------------------------------- | ---------------------- | -------------- | ----------------------------------------- | ------------------------------------ |
| `MeasureControl`                    | Distance / area        | No             | `MeasureLength/Area` **Yes**              | `Measure*.vue` **Yes**               |
| `DrawBarControl` + draw/edit/select | Sketch                 | No             | `Drawing` **Yes**                         | `Drawing.vue` **Yes**                |
| `Import/ExportGeoJsonControl`       | Sketch import/export   | No             | `LayerImport`, `ButtonExport` **Partial** | `LayerImport.vue` **Partial**        |
| `PrintControl`                      | html2canvas capture    | No             | — **No**                                  | `PrintModal.vue` (jspdf) **Partial** |
| `LinkControl`                       | Print legend link      | No             | — **No**                                  | — **No**                             |
| `ToolsBarControl`                   | Vertical tools bar     | No             | `ControlList` **Partial**                 | **Partial**                          |

### Permalink / share / help / layout

| gpu-client         | Role          | vue-components | geopf-extensions               | cartes.gouv entree-carto           |
| ------------------ | ------------- | -------------- | ------------------------------ | ---------------------------------- |
| `PermalinkControl` | GPU URL hash  | No             | — **No**                       | `Share` / `ShareModal` **Partial** |
| `MiniMapControl`   | Overview map  | No             | `GeoportalOverviewMap` **Yes** | `OverviewMap.vue` **Yes**          |
| `HelpLayerControl` | Help bubbles  | No             | — **No**                       | — **No**                           |

### Site chrome (not map)

| Need                        | vue-components                                             |
| --------------------------- | ---------------------------------------------------------- |
| DSFR header / footer        | `CgfrHeader`, `CgfrFooter` **Chrome**                      |
| Theme / cookie modals       | `CgfrModal*` **Chrome**                                    |
| Other                       | `CgfrSqlEditor`, `CgfrFollow`, `CgfrSelectList` **Chrome** |

---

## Summary for entree-carto

### Reusable (priority geopf + IGNF Vue wrappers)

- Zoom, full screen, attributions, overview
- Generic legends
- Search / Géoplateforme geocode
- Drawing, measures
- LayerSwitcher / Catalog (adapt to GPU layer model)

### Keep / rewrite (GPU business, not in IGNF)

- DU / SUP / SCOT / parcel info sheets (`FicheInfo*`, `GpuApiClient`)
- `ParcelViewer` / parcel legend
- Layer tree + scale-dependent GPU legends
- gpu-site specific URL permalink
- Map help, business print, `DistrictService`
- GPU “6 tile” base switcher (close but not 1:1)

### vue-components

Useful only to align **chrome** (header/footer) — **not** for the map.

---

## Condensed gpu-client inventory (exported)

| Export                                                                                       | Type                         |
| -------------------------------------------------------------------------------------------- | ---------------------------- |
| `gpu.createStandardViewer`                                                                   | Full map assembly            |
| `gpu.Viewer`                                                                                 | OL shell                     |
| `gpu.ParcelViewer`                                                                           | Parcel view                  |
| `gpu.config`                                                                                 | Host config                  |
| `gpu.control.*`                                                                              | ~24 controls (see matrix)    |
| `gpu.services.Geocode`, `FeaturesShower`, `HighlightFeature`, `DrawStyle`, `DistrictService` | Services                     |
| `gpu.helper.createWMTSSource`, `createGeoportalLayer`, `stringHelper`                        | Helpers                      |

Code reference: `/home/AHorde/SITES/gpu-client/src/gpu/`.

---

## Recommended next steps

1. Wire **geopf-extensions-openlayers** for generic controls (zoom, measure, draw, search…).
2. Follow Vue wrappers from **cartes.gouv.fr-entree-carto** for `MapShell` + controls pattern.
3. Port **GPU business** (sheet, parcel, layer tree) from gpu-client — no IGNF equivalent.
4. Do not expect map components from **vue-components**.
