[![en](https://img.shields.io/badge/lang-en-red.svg)](MapModeSelector.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](MapModeSelector.fr.md)

# MapModeSelector

Parcel / territory mode switch (gpu-client parity: permalink `mode=1` or `mode=2`, **territory default**).

**Source:** `src/components/map/MapModeSelector.vue`  
**State:** `provideMapMode()` / `useMapMode()` — `src/composables/mapMode.ts`  
**URL helpers:** `src/lib/map/mapMode.ts`

## UI

- Segmented **button group to the right of SearchEngine** (white background, shadow, rounded corners — `--ec-map-control-*`; gap `--ec-map-mode-search-gap`, 0 px default).
- **`Teleport` to `.ol-overlaycontainer-stopevent`** (OL controls layer): `z-index` 2, **below** TabPanels tabs (`z-index` 3) and **below** the TabPanels surface / mobile sheet (`ec-tab-panels-shell`, `z-index` 2).
- **Territories geopf active** (button `aria-pressed`): selector hidden to avoid overlapping the territories panel (especially on mobile).
- Two options **Parcelle** / **Territoire**: icon + label; idle = blue icon and text on white; active = white on blue France. No **Mode** heading, no visible radio circles (hidden `radio` inputs for accessibility).
- **Mobile** (bar below search): same group, **icons only** (labels visually hidden, still in the DOM for screen readers).

## Props

| Prop         | Type        | Default | Description                          |
| ------------ | ----------- | ------- | ------------------------------------ |
| `modelValue` | `1 \| 2`    | inject  | Optional `v-model` (`1` = parcel)   |

Without `modelValue`, uses `provideMapMode()` context on the map view.

## Permalink

- `mode=1` — parcel mode  
- `mode=2` — territory mode (default if parameter missing)  
- Changing the selector updates the URL **hash** (`#mode=…`) via `history.replaceState` (no reload). Legacy `?mode=` is migrated into the hash on load.

## Map behaviour

With a cherry marker (`mlon` / `mlat` or last mode-emprise point), the selector refreshes the red dashed APICarto emprise and animates the view to fit it (place-search padding). Zoom cap: **19** in Parcel mode (tight parcel outline), **15** in Territory mode (commune). The geopf place outline (blue dashed) stays visible alongside it.

- **Permalink restore** (`MapPermalinkSync`): cherry + emprise + fit once the search layer is ready.
- **Parcel / Territory switch** (`MapModeSelector`): animated fit + fiche refresh for the new mode.

## Integration

```vue
<script setup lang="ts">
import { provideMapMode } from '@/composables/mapMode'
import MapModeSelector from '@/components/map/MapModeSelector.vue'
import '@/styles/map-mode-selector.css'

provideMapMode({ initial: 2 })
</script>

<template>
  <MapShell>
    <MapModeSelector />
    …
  </MapShell>
</template>
```

Mounted on `/map` demo and `EmbedMapViewer` (`createStandardViewer`).

## Dependencies

- Child of `MapShell` (absolute positioning)
- Future: fiche tab content and click-info behaviour depend on `useMapMode()`
