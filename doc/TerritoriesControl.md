[![en](https://img.shields.io/badge/lang-en-red.svg)](TerritoriesControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](TerritoriesControl.fr.md)

# TerritoriesControl

Géoplateforme territory selector (`Territories`) — metropolitan France, overseas departments, etc.

**Source:** `src/components/map/TerritoriesControl.vue`  
**Reference:** [cartes.gouv.fr](https://cartes.gouv.fr/explorer-les-cartes/) — `territoriesOptions` (`bottom-left`, `view.active`)  
**Dependency:** `geopf-extensions-openlayers`

## Props

| Prop         | Type                   | Default         | Description                              |
| ------------ | ---------------------- | --------------- | ---------------------------------------- |
| `position`   | `GeopfControlPosition` | `'bottom-left'` | geopf position                           |
| `collapsed`  | `boolean`              | `true`          | Panel collapsed on load                  |
| `auto`       | `boolean`              | `true`          | Load default territory list              |
| `viewActive` | `boolean`              | `true`          | Show “Modify territories”                |

## geopf options passed

- `panel: true`, `title: 'Sélectionner un territoire'`
- `view: { active, title: 'Modifier les territoires', description: 'Modifier la vue' }`
- DOM patch after creation:
  - header title (geopf still hardcodes “Sélecteur de territoires”);
  - DSFR `<dialog>` accessible name (`aria-labelledby` → header title `#…-title`, else `aria-label`);
  - close button `#GPterritoriesPanelClose` + `gpf-btn-icon-close`, flush right in header.

## Placement

Bottom-left, **below** the overview map.

## Styles

- Button active state: blue background (`map-controls.css`), not geopf `::after` bar
- Tooltip: append aligned on button edge
- Long titles in `.gpf-tile`: reduced font + 3-line clamp
- Close button `#GPterritoriesPanelClose`: `position: absolute; right` in header
- Dialog `#gpf-territories-views-container-id`: flush right of Territories panel (`left: 100%`), bottoms aligned (`bottom: 0`)
- Bottom-left Territories panel: `bottom: 0`, `max-height: 100cqb` (stays inside `.ec-map-shell`), scrollable tile list
- Widget as containing block (avoids geopf `top: 0` over full map height)

## Dependencies

- Child of `MapShell`
- DSFR icon CSS (`utility/icons/icons.min.css`) for `fr-icon-*` pictograms
- Network for territory thumbnails / icons (Géoplateforme URLs)
