[![en](https://img.shields.io/badge/lang-en-red.svg)](MapPrintControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](MapPrintControl.fr.md)

# MapPrintControl

Map export control (PDF / PNG / JPEG), ported from [cartes.gouv.fr-entree-carto](https://github.com/IGNF/cartes.gouv.fr-entree-carto) (`PrintModal.vue`).

**Source:** `src/components/map/MapPrintControl.vue`, `src/components/map/MapPrintModal.vue`  
**Print engine:** `src/lib/map/print/` (`offscreenPrintMapExport`, `waitForMapExportReady`, `mapExport`, `printExportProgress`, `printScale`, `cloneMapLayers`, `pngDpi`, `printFicheSnapshot`, `rasterizePrintSupplementPage`)  
**Supplement pages:** `src/components/map/print/` (`MapPrintFicheTerritoryPage`, `MapPrintFicheParcelPage`, `MapPrintLegendsPage`, `PrintExportProgressOverlay`)

## Behaviour

- Opens a DSFR modal with a **print template** preset or custom settings (paper format, orientation, margins, title, scale line, DPI).
- **Templates** (`src/lib/map/print/printTemplates.ts`): A4 quick preview (96 DPI), A4 print (300 DPI), A4 landscape, A3 preview — annex pagination is pre-warmed in the background to reduce wait when switching presets.
- Builds a **preview** OpenLayers map by cloning visible layers from the main map (attributions + scale line bottom-right, like the main map).
- Optional extra **print pages** (when data is available via `TabPanelsControl` / `mapPrintPanelsKey`):
  - territory fiche — one page, tab contents in columns (no tab UI; no “Documents” section heading; SUP legal-profile links omitted in print);
  - parcel fiche — one page (cadastre references when available, then **Urban planning rules** / **Documents covering the parcel**, DSFR informational callouts at the bottom); extra spacing between cadastre block and rules;
  - legends — layer groups with symbols and labels (no accordion); by default **only layers in zoom range at the preview map zoom** (others hidden, not grayed out); optional **All legends** (when “Show legend” is checked) lists every layer that has a legend (including hidden / out-of-range), **without muted styling** and **independent of preview map zoom**. Annex pages: **inner inset** (~1.6 mm, separate from form paper margin) to reduce clipping at slice top/bottom; slightly larger legend icons at **300 DPI**.
- **Annex content vs map view:** **Territory fiche** does not depend on preview pan/zoom; **parcel fiche** does not either, except rule pictos **-lowscale** / **-highscale** (~zoom 17); **legends** follow preview zoom unless **All legends** is enabled. Annex pagination is recomputed **in the background** (no preview overlay) when that content changes; “Preparing preview…” applies only to **layout** (paper, margins, DPI) or **main-map → preview resync**.
- **Pagination** above the preview (right column, sibling of the form): label such as “Page 1 / 1 — Map” even for a single sheet; previous/next buttons when several pages; one map page plus as many sheets as needed per annex (automatic vertical slicing when content exceeds the paper area).
- **Preview column**: **Ctrl + wheel** on the frame (outside the map) zooms the paper and annex pages in/out; wheel alone scrolls; scrollbars appear when enlarged content overflows; wheel over the map still drives OpenLayers zoom.
- Export: multi-page PDF (`carte-et-annexes.pdf`); PNG/JPEG download **one file per page** (`carte - page N.ext`) when several pages are selected. Annex pages are exported by **capturing the on-screen preview frame** (html2canvas, upscaled to export DPI) for WYSIWYG output; the off-screen measure block is only used for page counts.
- **Preview map view** is copied from the main map on **first** modal open; later opens **reuse** the preview map and annex pagination cache when unchanged. If the main map moved and the preview was not customized, **immediate resync** (same as **Replace map**, with a semi-transparent “Preparing preview…” banner while tiles load—the map stays visible underneath). Modal body **scrolls** when content exceeds the viewport height. Changing form options (paper, margins, title, DPI, etc.) does **not** reset pan/zoom on the preview map. After the user pans or zooms the preview map, secondary button **Replace map** (`Replacer la carte`) realigns the preview view with the main map.
- Primary action **Export** (`Exporter`) runs PDF/PNG/JPEG export. Does not change the live main map or the visible preview map; an **off-screen map** (`offscreenPrintMapExport`) renders the same geographic extent at export DPI, waiting for tiles to finish loading (`waitForMapExportReady`). Title, scale line, and attributions are still composited from the preview DOM. A **progress bar** (`PrintExportProgressOverlay`) shows percent complete and the current step label (**Page i/n** prefix, sub-steps for off-screen map/tiles/annex capture/file encoding). **Pan/zoom on the preview map** no longer triggers “Preparing preview…”; legend pagination (zoom-dependent) is recomputed **on Export** (steps ~1–8%), then map/annex capture and file encoding.
- **WYSIWYG:** **Map** page = same extent and visible layers as the preview, rendered at export resolution; **annex** pages = capture of the on-screen preview frame (pixel-identical to the preview, upscaled to DPI). The **map title** matches the “Legends” page title typography (`--print-title-font`, 4.5 mm).

## Export pipeline (roadmap)

| Phase | Status | Goal |
| --- | --- | --- |
| 1 | Done | Off-screen map raster + tile wait + progress UI; interactive preview unchanged. |
| 2 | Done | PNG (DPI metadata), JPEG, and PDF assembly in a **Web Worker** (`printExport.worker.ts`), main-thread fallback if unavailable. |
| 3 | Done | Export **tile pre-warming** (`printMapPrewarm.ts`) in the background (idle) after open / layout change. |
| 4 | Done | Map render cache (`printMapRenderCache.ts`) keyed by extent, DPI, and visible layer fingerprint. |

## Placement

Bottom-left geopf column, **`order: -2`** — between the sketch tools toggle (`order: -3`) and the overview map (`order: -1`). See `map-controls.css`.

## Icon

Trigger button: `fr-icon-printer-line` (DSFR).

## Related

- **Print from fiche info** — parcel / territory **Print** buttons in `FicheInfoPanel` open the map print modal with the matching fiche option preselected (the other fiche unchecked).

## Dependencies

- `MapPrintModal` inside `MapShell` (`olMap` inject); fiche/legend data via `mapPrintPanelsRef` (`TabPanelsControl`)
- `@gouvminint/vue-dsfr` (`DsfrModal` + form controls), `pdf-lib`, `html2canvas`, `@vueuse/core`
- Embed bundle registers vue-dsfr in `mount.ts`
