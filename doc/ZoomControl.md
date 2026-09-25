[![en](https://img.shields.io/badge/lang-en-red.svg)](ZoomControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](ZoomControl.fr.md)

# ZoomControl

Géoplateforme zoom control (`GeoportalZoom` via `geopf-extensions-openlayers`).

**Source:** `src/components/map/ZoomControl.vue`  
**Placement reference:** [cartes.gouv.fr / explorer-les-cartes](https://cartes.gouv.fr/explorer-les-cartes/) — `zoomOptions: 'bottom-right'`  
**Dependency:** `geopf-extensions-openlayers`

## Props

| Prop       | Type                   | Default          | Description    |
| ---------- | ---------------------- | ---------------- | -------------- |
| `position` | `GeopfControlPosition` | `'bottom-right'` | geopf position |

## Placement

Bottom-right, **below** full screen (column `position-container-bottom-right`, same `bottom` as scale bar).  
Styles: `src/styles/map-controls.css`.

## Dependencies

- Child of `MapShell` (`olMap` injection).
- OpenLayers ≥ 10.
- Lifecycle via `useOlControl`.
