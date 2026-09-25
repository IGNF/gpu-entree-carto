[![en](https://img.shields.io/badge/lang-en-red.svg)](OverviewMapControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](OverviewMapControl.fr.md)

# OverviewMapControl

Géoplateforme overview map (`GeoportalOverviewMap`).

**Source:** `src/components/map/OverviewMapControl.vue`  
**Reference:** [cartes.gouv.fr](https://cartes.gouv.fr/explorer-les-cartes/) — `overviewMapOptions: 'bottom-left'`  
**Dependency:** `geopf-extensions-openlayers`

## Props

| Prop        | Type                   | Default         | Description                    |
| ----------- | ---------------------- | --------------- | ------------------------------ |
| `position`  | `GeopfControlPosition` | `'bottom-left'` | geopf position                 |
| `collapsed` | `boolean`              | `true`          | Overview collapsed on load     |

## Placement

Bottom-left, **above** the territory selector (`order: -1` in `map-controls.css`).

## Styles

- Active state / tooltip: same rules as Territories (`map-controls.css`, append aligned on button edge).

## Dependencies

- Child of `MapShell`
- geopf DSFR CSS + DSFR icons (`utility/icons`)
