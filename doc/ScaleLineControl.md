[![en](https://img.shields.io/badge/lang-en-red.svg)](ScaleLineControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](ScaleLineControl.fr.md)

# ScaleLineControl

OpenLayers metric scale bar (`ol/control/ScaleLine`), `ol-scale-line` styling + DSFR background.

**Source:** `src/components/map/ScaleLineControl.vue`  
**Placement reference:** [cartes.gouv.fr / explorer-les-cartes](https://cartes.gouv.fr/explorer-les-cartes/)  
(IGNF `ScaleLine.vue`: `right: $widget-panel-x` = 48px + 2×8px)

## Props

None for now.

## OpenLayers options

| Option     | Value      | Description              |
| ---------- | ---------- | ------------------------ |
| `units`    | `'metric'` | Metric units (m / km)    |
| `minWidth` | `100`      | Same as gpu-client       |

## Placement / style

- Bottom-right: `--ec-scale-line-right` (aligned with `.position-container-bottom-right` + widget column)
- **Attributions** at the bottom (`bottom: gap`), at the former scale bar horizontal position
- **Scale bar** above attributions (`--ec-scale-attribution-stack-gap`, 6px)
- Scale background: `var(--background-default-grey)` (as on cartes.gouv)

## Dependencies

- Child of `MapShell`.
- `ol/ol.css` + `src/styles/map-controls.css`.
