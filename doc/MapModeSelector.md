[![en](https://img.shields.io/badge/lang-en-red.svg)](MapModeSelector.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](MapModeSelector.fr.md)

# MapModeSelector

Parcel / territory mode switch (gpu-client parity: permalink `mode=1` or `mode=2`, **territory default**).

**Source:** `src/components/map/MapModeSelector.vue`  
**State:** `provideMapMode()` / `useMapMode()` — `src/composables/mapMode.ts`  
**URL helpers:** `src/lib/map/mapMode.ts`

## UI

- Dark bar **to the right of SearchEngine** (square outer corners, no `border-radius` on `.ec-map-mode-selector`)
- Label **Mode** + two **radio** cards: gpu-client SVG icons **Parcelle** / **Territoire** (`fill`: `--light-options-primary-color-sun-113-blue-france-sun-113`)
- Same light blue background on both cards; selected: blue border, filled radio; unselected **radio** circle slightly transparent

## Props

| Prop         | Type        | Default | Description                          |
| ------------ | ----------- | ------- | ------------------------------------ |
| `modelValue` | `1 \| 2`    | inject  | Optional `v-model` (`1` = parcel)   |

Without `modelValue`, uses `provideMapMode()` context on the map view.

## Permalink

- `mode=1` — parcel mode  
- `mode=2` — territory mode (default if parameter missing)  
- Changing the selector updates the URL **hash** (`#mode=…`) via `history.replaceState` (no reload). Legacy `?mode=` is migrated into the hash on load.

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
