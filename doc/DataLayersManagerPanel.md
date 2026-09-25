[![en](https://img.shields.io/badge/lang-en-red.svg)](DataLayersManagerPanel.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](DataLayersManagerPanel.fr.md)

# DataLayersManagerPanel

**Data layers** tab: adjust (visibility, opacity, greyscale, order) of entries **active on the map**, among those checked in the catalogue.

**Source:** `src/components/panels/DataLayersManagerPanel.vue`  
**State:** `useManagedLayers` (`src/composables/managedLayers.ts`)  
**Inclusion rule:** `shouldShowInDataLayersStack` in `catalogDataLayersStack.ts`

## Display rules

| Condition                                         | Data layers                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checked + WMS tile **shown** on map               | **One row**                                                                                                                                                                                                                                                                                                                                                         |
| Active WMS aggregate (`computeMapVisibilityById`) | **Parent** row only; **Detail** (`ri-list-unordered`, left of Legends) → separate **direct child** tiles (detail **does not turn off** if opacities match again — no automatic regroup); **Regroup** (`ri-separator`, on each direct child) → single parent row, opacity **remembered at detail** applied to whole subtree, **re-checks** catalogue entries in subtree (e.g. layer removed from panel); visibility / greyed derived from children |
| `forceOpacity: true`                              | **No row** in panel; WMS tile always **above** others (max z-index, unaffected by visible-layer drag)                                                                                                                                                                                                                                                               |
| `hideLayers: true`                                | **Parent** row only (children hidden from selector and panel)                                                                                                                                                                                                                                                                                                       |
| Virtual folder without `hideLayers`               | No row (only active WMS leaves appear)                                                                                                                                                                                                                                                                                                                              |
| `onlyLegend: true`                                | **One row** if checked and tile active (e.g. coherence schema); absent from catalogue selector but controllable here (opacity, eye, remove)                                                                                                                                                                                                                         |

No **synchronised** parent ↔ child rows in the panel. Each row drives WMS tiles it represents (`wmsIdsControlledByDataLayersPanelEntry`). **Opacity** exception: if an **aggregate** is the active map tile, value replicated to **whole** catalogue subtree (`catalogIdsForPanelOpacityWhenEntryAdjusted`, including `virtual` nodes) to keep gpu-client aggregate mode (`isSameAsDescendants`).

The **map** applies gpu-client aggregates (`computeMapVisibilityById`); the panel follows effective visibility.

Rows **outside** `minZoomLevel` / `maxZoomLevel` (LAYER_CONFIG) are **greyed** like gpu-client TreeLayerSwitcher (`catalogLayerZoomRange.ts`, `ec-not-in-zoom-range` class).

## Props / events

| Prop / event               | Type                          | Description                                                                                                                                                                               |
| -------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layers`                   | `ManagedLayer[]`              | Order by **sort keys** (`stackSortKeyById`, drag); unchecked entries **keep** key; drag reorders active layers only; re-check → catalogue position preserved                              |
| `@visible`                 | `(id, visible)`               | Show / hide eye (WMS controlled by row)                                                                                                                                                   |
| `@opacity`                 | `(id, opacity)`               | Opacity 0–100 %                                                                                                                                                                           |
| `@toggle-grayscale`        | `(id)`                        | Greyscale                                                                                                                                                                                 |
| `@remove`                  | `(id)`                        | Uncheck in catalogue                                                                                                                                                                      |
| `@reorder`                 | `(fromIndex, toInsertBefore)` | Reorder stack; apply map z-index (bottom → top)                                                                                                                                           |
| `@enable-aggregate-detail` | `(aggregateId)`               | Enable **detail** mode (`splitAggregateIds`, opacity / visibility / greyscale snapshot)                                                                                                   |
| `@regroup-aggregate`       | `(aggregateId)`               | Regroup aggregate and disable detail mode                                                                                                                                                 |
| (detail enabled)           | —                             | Sort keys (`catalogStackDisplayOrder`) **replace** aggregate with **contiguous direct children**, in **catalogue order** (no split in global stack)                                       |

## Order and z-index

- **Top** of list = tile **above** on map (highest z-index).
- **Bottom** of list = tile **below** (lowest z-index).
- Drag-and-drop: handle right of title, blue insertion marker.

## UI

- Title with **`ri-stack-line`** icon
- Rows separated by border; right of title (before Legends): **Regroup** (`ri-separator`, children in detail mode) then **Detail** (`ri-list-unordered`, aggregates); **Legends** button (`ri-list-indefinite`); handle **`ri-drag-move-2-fill`**

## Dependencies

- Remix Icon, `data-layers.css` styles
- Integration: [TabPanelsControl](./TabPanelsControl.md)
