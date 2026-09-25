[![en](https://img.shields.io/badge/lang-en-red.svg)](CatalogLayerTree.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](CatalogLayerTree.fr.md)

# CatalogLayerTree

**Checkbox** tree for _Data_ catalogue (gpu-client `TreeLayerSwitcherControl` / `CreateTreeLayerSwitcherItems` equivalent).

**Source:** `src/components/layers/CatalogLayerTree.vue`  
**Tree build:** `src/lib/layerConfig/layerConfigToTree.ts` ← `window.LAYER_CONFIG`  
**Catalogue IDs:** gpu-client TLS path (`name` + filter values, not title alone) — see `gpu.model.Layer#getOrCreatePath`.  
**Used in:** [LayerCataloguePanel](./TabPanelsControl.md#panel-components) → Catalogue tab → _Data_, under **Data selection** title (after [CatalogLayerSearch](./CatalogLayerSearch.md)).

## Props / events

| Prop / event         | Type                      | Description                                                                 |
| -------------------- | ------------------------- | --------------------------------------------------------------------------- |
| `nodes`              | `TreeLayerNode[]`         | Tree root (`children`, `defaultCollapsed`, `gpuVirtual`, …)                 |
| `checkedById`        | `Record<string, boolean>` | Checked state on **each** entry (gpu-client propagation)                      |
| `catalogRoots`       | `TreeLayerNode[]`         | Full roots (optional, default `nodes`) — collapse calculation               |
| `pinnedExpandIds`    | `ReadonlySet<string>`     | Expanded branches ([CatalogLayerSearch](./CatalogLayerSearch.md) search)    |
| `highlightedNodeIds` | `ReadonlySet<string>`     | Temporary row highlight                                                     |
| `focusCatalogNodeId` | `string \| null`          | Scroll to row (component root)                                              |
| `@toggle`            | `(id, checked)`           | → `setCatalogChecked` (checkboxes + WMS visibility)                         |
| `@unpin-expand`      | `(id)`                    | Remove forced expand (manual collapse)                                      |

## Behaviour

- **Collapsed by default**: only root nodes visible; each branch collapsed (`undeployed`, gpu-client).
- **Auto expand** (`catalogAncestorIdsToExpand`): expand **only** if subtree is **mixed** (at least one checked and one unchecked). All checked → collapsed; all unchecked (e.g. SUP root without `visible`) → collapsed; partial selection under “Prescriptions” → expand to concerned level.
- Manual expand/collapse via chevron; manual state kept until tree structure changes.
- DSFR checkboxes **SM** size (`fr-checkbox-group--sm`).
- No legend under node (legends → **Legends** tab).
- **Checkbox propagation** (as `TreeLayerSwitcherItem`): parent check → all descendants; child check → parents bubble (OR, except `onlyLegend`); `onlyLegend` follows parent.
- **Virtual**: no aggregate WMS tile on node; leaves below carry the map.
- **Aggregate** (non-virtual parent with WMS + children): if whole subtree checked with same opacity → single WMS request on parent, leaves hidden on map (gpu-client perf).
- **`hideLayers: true`**: child entries not shown in selector (`hiddenCatalogChildren`); virtual parent still drives them. In **Data layers**, single parent row; aggregate legend on parent (gpu-client `createLegendImages`, except `prescription_psmv` duplicate).
- WMS leaves: `gpuMapLayer` (including **`onlyLegend`** with `name` — WMS tile as gpu-client, no selector row).
- **`onlyLegend`**: hidden in selector (`catalogSwitcherDisplayNodes`); **Data layers** + **Legends** when tile active (catalogue check / parent).
- **`visible`**: as gpu-client `Layer`, absent on child → inherit parent; explicit (`true` / `false`) wins. Initial checkbox state without overwriting explicit `visible: false`.
- LAYER_CONFIG params at tree: `opacity`, **`forceOpacity`** (100% on map, **absent** from Data layers tab), `virtual`, `onlyLegend`, CQL filters, **`minZoomLevel` / `maxZoomLevel`** (inherited as gpu-client), legends (`LEGEND_*`).
- **Out of zoom range**: greyed row (`ec-not-in-zoom-range`, gpu-client `notInZoomRange` equivalent) — updates on map zoom; non-tile folder greyed if no descendant in range.
- **Data layers**: one row per checked entry **whose WMS tile is active** on map (active aggregate → not checked leaves) — see [DataLayersManagerPanel](./DataLayersManagerPanel.md).
- Map sync via `layerMapHooks` → `GpuWmsLayerRegistry` (demo `/map`).

## Dependencies

- Types `TreeLayerNode`: `TreeLayerSwitcher.vue`
- Remote config: `configScriptUrl` in [DemoConfig.md](./DemoConfig.md)
