[![en](https://img.shields.io/badge/lang-en-red.svg)](ClickInfoControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](ClickInfoControl.fr.md)

# ClickInfoControl

Always-on map click that fills the **fiche** tab (first lateral panel tab) with parcel or urban-planning document information, depending on [MapModeSelector](./MapModeSelector.md) (`mode=1` parcel, `mode=2` territory).

**Source:** `src/components/map/ClickInfoControl.vue`  
**Service:** `src/lib/fiche/ficheInfoService.ts`  
**Styles:** `src/styles/click-info.css`  
**Sketch gate:** `src/composables/sketchToolEngaged.ts` (set from `SketchControl`)

## Behaviour

- Listens to OpenLayers `singleclick` on the injected map (`olMap`).
- **Disabled** while a sketch tool is active (draw, modify, remove, measure, text, etc.).
- Ignores clicks on UI (tab panels, search widget, mode selector, sketch bar, form controls) and hits on sketch/measure vector layers.
- Calls `loadFicheForMapPoint({ lon, lat, mode, zoom })`:
  - **Territory:** only `config.apiFicheInfoUrl` (from gpu-client-config); if missing or request fails → “Indisponibilité du service” (no APICarto `gpu/document`); gpu-site JSON fills the fiche: municipality title, then tabs per document type (DU, PSMV, SUP, SCoT) plus an “Procédures en cours” tab when applicable;
  - **Parcel:** `apiFicheInfoUrl` when configured (same JSON: parcel header + same document tabs), otherwise APICarto `cadastre/parcelle`.
- Opens the fiche tab via `tabPanelsApiRef.showSelection`.
- Places the geopf **cherry** on `singleclick` (no map popup — fiche in the side panel), then loads the fiche **asynchronously**; **no map recentering**.
- Draws a **mode emprise** on the SearchEngine layer (`searchResultGraphics`): **parcel** (red, APICarto) in **Parcelle** mode; **municipality** (red) in **Territoire** mode, plus **municipal arrondissement** (orange) and **city-wide municipality** (red, geo.api.gouv.fr contour) in Paris, Lyon, and Marseille; at all zoom levels; no geopf place extent on click.

## Cursor

When click-info is active and sketch tools are idle, adds `ec-map-shell--click-info` on `.ec-map-shell`. CSS sets a composite pointer + “i” cursor on the map viewport (Remix-inspired glyph).

## Integration

Mount as a sibling of other map controls under `MapShell` (after `provideMapMode()`):

```vue
<script setup lang="ts">
import ClickInfoControl from '@/components/map/ClickInfoControl.vue'
import '@/styles/click-info.css'
</script>

<template>
  <MapShell>
    <TabPanelsControl />
    <SearchEngineControl />
    <ClickInfoControl />
    <MapModeSelector />
    <!-- … -->
  </MapShell>
</template>
```

No props. Requires `provideMapMode()` on the same view for mode-aware fiche content.

## Related

- [SearchEngineControl](./SearchEngineControl.md) — also fills the fiche tab after a location search (`loadFicheForSearch`).
- [TabPanelsControl](./TabPanelsControl.md) — fiche tab (index 0).
