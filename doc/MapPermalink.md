[![en](https://img.shields.io/badge/lang-en-red.svg)](MapPermalink.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](MapPermalink.fr.md)

# Map permalink (gpu-client)

URL **fragment** (`#…`) synced with map state, like gpu-client `PermalinkControl`. Map mode `mode=1|2` lives in the hash ([MapModeSelector](./MapModeSelector.md)); legacy `?mode=` in the query is read once then removed.

**Library:** `src/lib/map/mapPermalink.ts`  
**Sync component:** `src/components/map/MapPermalinkSync.vue`  
**Layer bridge:** `TabPanelsControl` → `mapPermalinkLayersBridgeRef`

## Hash parameters

| Key | Description |
| --- | ----------- |
| `lon`, `lat` | View center (WGS84), **8 decimal places** max in the hash |
| `z` | Zoom level (`zoom` read as alias) |
| `tile` | Base map preset index **1…n** (order of `gpuBasePresets`) |
| `mlon`, `mlat` | Cherry / fiche query point (WGS84), **8 decimal places** max |
| `mode` | Parcel / territory (`1` / `2`) |
| *layer id* | Catalog layer state (see below) |

Updates are **debounced** (300 ms) on `moveend`, on **catalog / data-layer** changes (`TabPanelsControl`), and on **base map** change (`tile`). `mlon`/`mlat` flush immediately when the marker moves.

Layer keys and values are **percent-encoded** in the hash (`encodeURIComponent`), including commas and `%` in gpu-client ids (e.g. `mec_mec_%_du_%` → `%25`). Legacy unencoded gpu-client hashes are normalized on load so Vue Router can decode the fragment safely.

## Layer keys

Last segment of the gpu-client layer path (`pathToPermalinkId`), e.g. `prescription,prescription_psmv021319505199`.

Value: `v:w:x:y:z` (gpu-client)

| Field | Meaning |
| ----- | ------- |
| `v` | Catalog checkbox — `1` checked, `0` unchecked. Missing key → **LAYER_CONFIG** default; `0:…` = explicit unchecked. |
| `w` | Opacity `0`–`1` (data layers range slider) |
| `x` | Stack order in data layers (0 = top; drag handle) |
| `y` | Grayscale — `0` colour, `1` grey |
| `z` | Layer shown on map — `1` visible, `0` hidden (hide/show button) |

Legacy **4** segments `v:w:x:y` are still read (`y` = grayscale; `z` defaults to `1` when `v=1`).

Example:

```text
#lon=2.35&lat=48.85&z=14&tile=1&mode=2&scot=1:0.8:8:0:1&prescription,prescription_psmv021319505199=1:0.7:2:0:1
```

## Restore on load

1. View + `tile` from hash  
2. Layer params via `TabPanelsControl` when `LAYER_CONFIG` is available  
3. `mlon`/`mlat` → cerise + fiche (unless `skipMarkerRestore` when `initialSearch` is set)

## Integration

```vue
<MapShell>
  <TabPanelsControl … />
  <MapPermalinkSync :skip-marker-restore="Boolean(initialSearch?.fullText)" />
</MapShell>
```

Provide base presets:

```typescript
provideMapPermalinkUi({
  presets: gpuBasePresets,
  getActiveBaseId: () => activeBase.value,
  setActiveBaseId: onUpdateBase,
  activeBaseIdRef: activeBase,
})
```
