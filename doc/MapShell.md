[![en](https://img.shields.io/badge/lang-en-red.svg)](MapShell.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](MapShell.fr.md)

# MapShell

OpenLayers map container. Creates the map and exposes the instance to child controls via Vue injection (`olMap`).

**Source:** `src/components/map/MapShell.vue`  
**Composable:** `src/composables/useOlMap.ts`

## Props

| Prop     | Type          | Default | Description                         |
| -------- | ------------- | ------- | ----------------------------------- |
| `layers` | `BaseLayer[]` | `[]`    | Initial layers passed to `ol.Map`   |
| `zoom`   | `number`      | `6`     | Initial zoom (same as gpu-client)   |

## Slot

Default slot receives `{ map }`; typically controls (`ZoomControl`, `ScaleLineControl`, …).

## Exposed API

| Method / ref               | Description                                     |
| -------------------------- | ----------------------------------------------- |
| `map` (via `defineExpose`) | `ShallowRef<Map \| null>` — OpenLayers instance |

## Injection

Provides `olMap` (`ShallowRef<Map | null>`) to descendants for attaching / detaching OL controls.

## Notes

- Projection: EPSG:3857, France center, minZoom 5 / maxZoom 19.
- OL attribution **enabled**, not collapsible (`collapsible: false`, as gpu-client); IGN text and logos via `ignGeoportalAttributions`; bottom-right strip under the scale bar (`map-controls.css`).
- Native zoom / rotate disabled (dedicated controls).
- Map container exposes `id="gpu-map"` for gpu-site compatibility (`gpu-map.css`).
