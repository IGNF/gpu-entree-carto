[![en](https://img.shields.io/badge/lang-en-red.svg)](TreeLayerSwitcher.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](TreeLayerSwitcher.fr.md)

# TreeLayerSwitcher

**Business layer** tree selector with **integrated legend** (gpu-client `TreeLayerSwitcherControl` + legends equivalent).

**Source:** `src/components/layers/TreeLayerSwitcher.vue`  
**Used in:** _Data layers_ / _Legends_ tabs of [TabPanelsControl](./TabPanelsControl.md). Catalogue _Data_ uses [CatalogLayerTree](./CatalogLayerTree.md).

## Props / events

| Prop / event  | Type                      | Description                                                           |
| ------------- | ------------------------- | --------------------------------------------------------------------- |
| `nodes`       | `TreeLayerNode[]`         | Nodes (`id`, `title`, `visible`, `legend?`, `children?`)              |
| `variant`     | `'full' \| 'catalog'`     | `catalog`: checkbox + title only (no legend under node)               |
| `checkedById` | `Record<string, boolean>` | Checked state in catalogue mode (otherwise `node.visible`)            |
| `@toggle`     | `(id, visible)`           | Checkbox change                                                       |

## Behaviour

- Checkbox per layer.
- **`full`**: if layer is visible and has `legend`, show entries under the node.
- **`catalog`**: minimal gpu-client TreeLayerSwitcher list (no integrated legend), **SM** checkboxes (`fr-checkbox-group--sm`).

## Current limits

- `LAYER_CONFIG` → tree parsing: see `layerConfigToTree.ts` and [CatalogLayerTree](./CatalogLayerTree.md).
- No opacity or zoom range in catalogue tree (to port from gpu-client).
