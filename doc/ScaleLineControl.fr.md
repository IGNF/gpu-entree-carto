[![en](https://img.shields.io/badge/lang-en-red.svg)](ScaleLineControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](ScaleLineControl.fr.md)

# ScaleLineControl

Barre d’échelle métrique OpenLayers (`ol/control/ScaleLine`), style `ol-scale-line` + fond DSFR.

**Source :** `src/components/map/ScaleLineControl.vue`  
**Référence placement :** [cartes.gouv.fr / explorer-les-cartes](https://cartes.gouv.fr/explorer-les-cartes/)  
(IGNF `ScaleLine.vue` : `right: $widget-panel-x` = 48px + 2×8px)

## Props

Aucune pour l’instant.

## Options OpenLayers

| Option     | Valeur     | Description               |
| ---------- | ---------- | ------------------------- |
| `units`    | `'metric'` | Unités métriques (m / km) |
| `minWidth` | `100`      | Comme gpu-client          |

## Placement / style

- Bas-droite : `--ec-scale-line-right` (aligné sur `.position-container-bottom-right` + colonne widgets)
- **Attributions** en bas (`bottom: gap`), à l’emplacement horizontal de l’ancienne échelle
- **Échelle** au-dessus des attributions (`--ec-scale-attribution-stack-gap`, 6px)
- Fond échelle : `var(--background-default-grey)` (comme cartes.gouv)

## Dépendances

- Enfant de `MapShell`.
- `ol/ol.css` + `src/styles/map-controls.css`.
