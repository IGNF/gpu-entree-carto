[![en](https://img.shields.io/badge/lang-en-red.svg)](BaseLayerRadioList.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](BaseLayerRadioList.fr.md)

# BaseLayerRadioList

Vertical list of **radio buttons** for base maps, with **thumbnail** and **collapsible description** (gpu-client `TileLayerSwitcherControl` equivalent).

**Source:** `src/components/layers/BaseLayerRadioList.vue`  
**Presets:** `src/ol/gpuBaseLayerPresets.ts` (`createGpuBaseLayerEnvironment`)  
**Used in:** [LayerCataloguePanel](./TabPanelsControl.md#panel-components) → Catalogue tab → _Base maps_

## Props / events

| Prop / event         | Type                   | Description                                                                       |
| -------------------- | ---------------------- | --------------------------------------------------------------------------------- |
| `presets`            | `GpuBaseLayerPreset[]` | id, label, `description`, `stack` (`mainLayers` stack), derived `thumbnailLayers` |
| `modelValue`         | `GpuBaseLayerId`       | Active base                                                                       |
| `@update:modelValue` | `(id)`                 | Base selection                                                                    |

## Behaviour

- Single selection (`.ec-base-radio` dot, DSFR France blue tokens), aligned to square thumbnail centre.
- **Caret** button (`fr-icon-arrow-*-s-line`) right of title: show/hide subtitle + description (HTML in `description`, rendered via `SanitizedHtml` / DOMPurify).
- **Title** (label) in dark grey; **subtitle** and **description** in mention grey (same tone).
- Square thumbnails: WMTS tile stack (as gpu-client `TileLayerSwitcher`), coordinates `[9, 253, -177]`, layers filtered by `minResolution` / `maxResolution` at preview zoom (`gpuBaseLayerThumbnails.ts`). Images `loading="lazy"` / `decoding="async"`.

## Map integration

Parent creates a `GpuBaseLayerEnvironment` (`createGpuBaseLayerEnvironment`), calls `setActiveGpuBaseLayer(env, id)` and passes `env.allLayers` to `MapShell` (see `DemoView.vue`). One OpenLayers instance per WMTS layer / boundary (pool `mainLayers`, as gpu-client).

Layer stacks per base: aligned with gpu-client `createStandardViewer` / `TileLayerSwitcher` (`cadastreLow`/`cadastreHigh`, region/department GeoJSON limits in `public/json-data/` (URL via `import.meta.env.BASE_URL` for GitHub Pages), mixed without IGN plan). Definition: `src/ol/gpuBaseLayerPresets.ts`, `src/ol/gpuLimitOverlayLayers.ts`.
