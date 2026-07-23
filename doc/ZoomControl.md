# ZoomControl

Contrôle de zoom Géoplateforme (`GeoportalZoom` via `geopf-extensions-openlayers`).

**Source :** `src/components/map/ZoomControl.vue`  
**Référence placement :** [cartes.gouv.fr / explorer-les-cartes](https://cartes.gouv.fr/explorer-les-cartes/) — `zoomOptions: 'bottom-right'`  
**Dépendance :** `geopf-extensions-openlayers`

## Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `position` | `GeopfControlPosition` | `'bottom-right'` | Position geopf |

## Placement

Bas-droite de la carte, empilé avec `FullScreenControl` (colonne `position-container-bottom-right`).  
Constantes : `src/map/controlPositions.ts`. Styles : `src/styles/map-controls.css`.

## Dépendances

- Enfant de `MapShell` (injection `olMap`).
- OpenLayers ≥ 10.
- Cycle de vie via `useOlControl`.
