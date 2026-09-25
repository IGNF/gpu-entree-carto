[![en](https://img.shields.io/badge/lang-en-red.svg)](CatalogLayerSearch.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](CatalogLayerSearch.fr.md)

# CatalogLayerSearch

**Search** bar above the catalogue tree (_Data_).

**Source:** `src/components/layers/CatalogLayerSearch.vue`  
**Used in:** [LayerCataloguePanel](./TabPanelsControl.md#panel-components) → Catalogue tab → _Data_, above **Data selection** block ([CatalogLayerTree](./CatalogLayerTree.md)).

## Props / events

| Prop / event  | Type                      | Description                                         |
| ------------- | ------------------------- | --------------------------------------------------- |
| `roots`       | `TreeLayerNode[]`         | `LAYER_CONFIG` roots                                |
| `checkedById` | `Record<string, boolean>` | Catalogue checked state                             |
| `mapZoom`     | `number`                  | Map zoom (out-of-range greying)                     |
| `@toggle`     | `(id, checked)`           | Same effect as tree (`setCatalogChecked`)           |
| `@focus-node` | `(id)`                    | Expands tree, scroll and highlight on row           |

## Behaviour

- DSFR field `fr-input-group` / `fr-input` (global `dsfr.min.css` styles), filter on input without a Search button.
- **Case-insensitive** filter on **title** of selector-visible entries (`catalogSwitcherDisplayNodes`, excluding `onlyLegend`).
- Results: same DSFR row as tree (`fr-checkbox-group fr-checkbox-group--sm` + `fr-label`); label click → focus in [CatalogLayerTree](./CatalogLayerTree.md) (`pinnedExpandIds`, `ec-catalog-tree__row--highlight` animation) in addition to native checkbox behaviour.
- Out-of-zoom entries: `ec-not-in-zoom-range` class.

## Dependencies

- `src/lib/layerConfig/catalogTreeSearch.ts`
- [CatalogLayerTree](./CatalogLayerTree.md)
