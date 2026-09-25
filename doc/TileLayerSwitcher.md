[![en](https://img.shields.io/badge/lang-en-red.svg)](TileLayerSwitcher.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](TileLayerSwitcher.fr.md)

# TileLayerSwitcher

**Base map** selector as clickable tiles (gpu-client `TileLayerSwitcherControl` equivalent).

**Source:** `src/components/layers/TileLayerSwitcher.vue`  
**Used in:** demos / lightweight integrations (tile grid). gpu Catalogue panel uses [BaseLayerRadioList](./BaseLayerRadioList.md).

## Props

| Prop         | Type                | Description                      |
| ------------ | ------------------- | -------------------------------- |
| `presets`    | `BaseLayerPreset[]` | Bases (`createBaseLayerPresets`) |
| `modelValue` | `BaseLayerId`       | Active base                      |

Emits `update:modelValue` and calls `setActiveBaseLayer`.

## Behaviour

Tile grid (preview + label). Active tile has France blue border.

## Current limits

- “Plan / Ortho / Blank” bases (`createBaseLayerPresets`) — distinct from 6 gpu bases ([BaseLayerRadioList](./BaseLayerRadioList.md)).
- CSS previews (no WMTS thumbnails).
