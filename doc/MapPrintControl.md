[![en](https://img.shields.io/badge/lang-en-red.svg)](MapPrintControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](MapPrintControl.fr.md)

# MapPrintControl

Map export control (PDF / PNG / JPEG), ported from [cartes.gouv.fr-entree-carto](https://github.com/IGNF/cartes.gouv.fr-entree-carto) (`PrintModal.vue`).

**Source:** `src/components/map/MapPrintControl.vue`, `src/components/map/MapPrintModal.vue`  
**Print engine:** `src/lib/map/print/` (`mapExport`, `printScale`, `cloneMapLayers`, `pngDpi`, `printFicheSnapshot`, `rasterizePrintSupplementPage`)  
**Supplement pages:** `src/components/map/print/` (`MapPrintFicheTerritoryPage`, `MapPrintFicheParcelPage`, `MapPrintLegendsPage`)

## Behaviour

- Opens a DSFR modal with paper options (format, orientation, margins, title, scale line, DPI).
- Builds a **preview** OpenLayers map by cloning visible layers from the main map (attributions + scale line bottom-right, like the main map).
- Optional extra **print pages** (when data is available via `TabPanelsControl` / `mapPrintPanelsKey`):
  - territory fiche — one page, tab contents in columns (no tab UI);
  - parcel fiche — one page, Infos / Documents columns;
  - legends — one page, layer groups with symbols and labels (no accordion).
- **Pagination** under the preview: one map page plus as many sheets as needed per annex (automatic vertical slicing when content exceeds the paper area).
- Export: multi-page PDF (`carte-et-annexes.pdf`); PNG/JPEG download **one file per page** (`carte - page N.ext`) when several pages are selected.
- Does not change the user’s live view after export.

## Placement

Bottom-left geopf column, **`order: -2`** — between the sketch tools toggle (`order: -3`) and the overview map (`order: -1`). See `map-controls.css`.

## Icon

Trigger button: `fr-icon-printer-line` (DSFR).

## Related

- **Parcel fiche print (Infos tab only)** — separate flow: button « Imprimer » in `FicheInfoPanel` (`window.print()` on the active tab HTML); the map print modal can add a full parcel page (Infos + Documents) when parcel data is loaded.

## Dependencies

- `MapPrintModal` inside `MapShell` (`olMap` inject); fiche/legend data via `mapPrintPanelsRef` (`TabPanelsControl`)
- `@gouvminint/vue-dsfr` (`DsfrModal` + form controls), `jspdf`, `html2canvas`, `@vueuse/core`
- Embed bundle registers vue-dsfr in `mount.ts`
