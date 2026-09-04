# ScaleLineControl

Barre d’échelle métrique OpenLayers (`ol/control/ScaleLine`), style `ol-scale-line` + fond DSFR.

**Source :** `src/components/map/ScaleLineControl.vue`  
**Référence placement :** [cartes.gouv.fr / explorer-les-cartes](https://cartes.gouv.fr/explorer-les-cartes/)  
(IGNF `ScaleLine.vue` : `right: $widget-panel-x` = 48px + 2×8px)

## Props

Aucune pour l’instant.

## Options OpenLayers

| Option  | Valeur     | Description               |
| ------- | ---------- | ------------------------- |
| `units` | `'metric'` | Unités métriques (m / km) |

## Placement / style

- Bas-droite, à gauche de la colonne zoom / plein écran (`--ec-widget-panel-x`)
- Fond : `var(--background-default-grey)` (comme cartes.gouv)
- Pas de style Figma custom

## Dépendances

- Enfant de `MapShell`.
- `ol/ol.css` + `src/styles/map-controls.css`.
