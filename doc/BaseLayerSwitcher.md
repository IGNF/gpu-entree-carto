[![en](https://img.shields.io/badge/lang-en-red.svg)](BaseLayerSwitcher.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](BaseLayerSwitcher.fr.md)

# BaseLayerSwitcher

Base map selector (DSFR radio). Toggles visibility of presets created by `createBaseLayerPresets()`.

**Source:** `src/components/map/BaseLayerSwitcher.vue`  
**Helpers:** `src/ol/baseLayers.ts`

## Props

| Prop         | Type                | Description                              |
| ------------ | ------------------- | ---------------------------------------- |
| `presets`    | `BaseLayerPreset[]` | Base list (`id`, `label`, `layer`)       |
| `modelValue` | `BaseLayerId`       | Active base: `'plan' \| 'ortho' \| 'blank'` |

## Events

| Event               | Payload       | Description                    |
| ------------------- | ------------- | ------------------------------ |
| `update:modelValue` | `BaseLayerId` | Emitted on base change (v-model) |

## Available bases (demo)

| Id      | Label    | Source                        |
| ------- | -------- | ----------------------------- |
| `plan`  | Plan IGN | WMTS Géoplateforme PLANIGNV2  |
| `ortho` | Ortho    | WMTS ORTHOIMAGERY.ORTHOPHOTOS |
| `blank` | Blank    | White background vector layer |

## Notes

- Former demo aside panel radio selector.
- **Prefer** [TileLayerSwitcher](./TileLayerSwitcher.md) in the layers tab of [TabPanelsControl](./TabPanelsControl.md).
- Eventually: extend via Géoplateforme extensions (6 gpu-client bases).
