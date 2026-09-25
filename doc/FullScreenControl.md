[![en](https://img.shields.io/badge/lang-en-red.svg)](FullScreenControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](FullScreenControl.fr.md)

# FullScreenControl

Géoplateforme full-screen control (`GeoportalFullScreen`).

**Source:** `src/components/map/FullScreenControl.vue`  
**Placement reference:** [cartes.gouv.fr / explorer-les-cartes](https://cartes.gouv.fr/explorer-les-cartes/) — `fullscreenOptions: 'bottom-right'`  
**Dependency:** `geopf-extensions-openlayers`

## Props

| Prop       | Type                   | Default          | Description    |
| ---------- | ---------------------- | ---------------- | -------------- |
| `position` | `GeopfControlPosition` | `'bottom-right'` | geopf position |

## Placement

Bottom-right, above zoom (geopf `prepend` in `bottom-*`).  
geopf `bottom: 0.5em` offset cancelled in the bottom-right column (`map-controls.css`) to align with the scale bar.

## Dependencies

- Child of `MapShell`.
- geopf DSFR CSS loaded in demo / embed.

## Behaviour / CSS

- Icon via `::after` (geopf mask), no Classic sprite or OpenLayers label.
- `map-controls.css` forces `background-image: none` and hides the inner `<span>` to avoid duplication when the host also loads full DSFR (gpu-site).
- Button uses `font-size: 0` (hide OL label): tooltip `::before` forces `font-size: 0.75rem` to match zoom / territory controls.
