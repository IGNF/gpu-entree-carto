[![en](https://img.shields.io/badge/lang-en-red.svg)](MapShell.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](MapShell.fr.md)

# MapShell

Conteneur de la carte OpenLayers. Crée la map, expose l’instance aux contrôles enfants via injection Vue (`olMap`).

**Source :** `src/components/map/MapShell.vue`  
**Composable :** `src/composables/useOlMap.ts`

## Props

| Prop     | Type          | Défaut | Description                          |
| -------- | ------------- | ------ | ------------------------------------ |
| `layers` | `BaseLayer[]` | `[]`   | Couches initiales passées à `ol.Map` |
| `zoom`   | `number`      | `6`    | Zoom initial (comme gpu-client)      |

## Slot

Slot par défaut : reçoit `{ map }` ; typiquement les contrôles (`ZoomControl`, `ScaleLineControl`, …).

## API exposée

| Méthode / ref              | Description                                     |
| -------------------------- | ----------------------------------------------- |
| `map` (via `defineExpose`) | `ShallowRef<Map \| null>` — instance OpenLayers |

## Injection

Fournit `olMap` (`ShallowRef<Map | null>`) aux descendants pour attacher / détacher des contrôles OL.

## Notes

- Projection : EPSG:3857, centre France, minZoom 5 / maxZoom 19.
- Attribution OL **activée**, non repliable (`collapsible: false`, comme gpu-client) ; texte et logos IGN via `ignGeoportalAttributions` ; bandeau bas-droite sous l’échelle (`map-controls.css`).
- Zoom / rotate natifs désactivés (contrôles dédiés).
- Le conteneur carte expose `id="gpu-map"` pour compatibilité gpu-site (`gpu-map.css`).
