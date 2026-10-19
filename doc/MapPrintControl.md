[![en](https://img.shields.io/badge/lang-en-red.svg)](MapPrintControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](MapPrintControl.fr.md)

# MapPrintControl

Map export control (PDF / PNG / JPEG), ported from [cartes.gouv.fr-entree-carto](https://github.com/IGNF/cartes.gouv.fr-entree-carto) (`PrintModal.vue`).

**Source:** `src/components/map/MapPrintControl.vue`, `src/components/map/MapPrintModal.vue`  
**Print engine:** `src/lib/map/print/` (`mapExport`, `printScale`, `cloneMapLayers`, `pngDpi`, `printFicheSnapshot`, `rasterizePrintSupplementPage`)  
**Supplement pages:** `src/components/map/print/` (`MapPrintFicheTerritoryPage`, `MapPrintFicheParcelPage`, `MapPrintLegendsPage`)

## Behaviour

- Opens a DSFR modal with a **print template** preset or custom settings (paper format, orientation, margins, title, scale line, DPI).
- **Templates** (`src/lib/map/print/printTemplates.ts`): A4 quick preview (96 DPI), A4 print (300 DPI), A4 landscape, A3 preview — annex pagination is pre-warmed in the background to reduce wait when switching presets.
- Builds a **preview** OpenLayers map by cloning visible layers from the main map (attributions + scale line bottom-right, like the main map).
- Optional extra **print pages** (when data is available via `TabPanelsControl` / `mapPrintPanelsKey`):
  - territory fiche — one page, tab contents in columns (no tab UI);
  - parcel fiche — one page, Infos / Documents columns;
  - legends — one page, layer groups with symbols and labels (no accordion).
- **Pagination** above the preview (right column, sibling of the form): label such as “Page 1 / 1 — Map” even for a single sheet; previous/next buttons when several pages; one map page plus as many sheets as needed per annex (automatic vertical slicing when content exceeds the paper area).
- **Preview column**: **Ctrl + wheel** on the frame (outside the map) zooms the paper and annex pages in/out; wheel alone scrolls; scrollbars appear when enlarged content overflows; wheel over the map still drives OpenLayers zoom.
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
