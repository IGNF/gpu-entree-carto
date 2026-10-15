[![en](https://img.shields.io/badge/lang-en-red.svg)](FicheInfo.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](FicheInfo.fr.md)

# Fiche info panel (TabPanels)

Target alignment with **gpu-client** and **gpu-site**, based on:

- [`gpu-client/doc/FicheInfoDetaillee.md`](https://github.com/ignf/gpu-client/blob/main/doc/FicheInfoDetaillee.md) — **Territory** sheet (map click / point);
- [`gpu-client/doc/FicheParcelleDetaillee.md`](https://github.com/ignf/gpu-client/blob/main/doc/FicheParcelleDetaillee.md) — **parcel** content (former `/map/parcel-info/` page).

**UI:** `src/components/panels/FicheInfoPanel.vue` — inner tabs use DSFR **Tabs** (`fr-tabs`, `tab.min.css`), not the catalogue `fr-nav` bar.  
**Orchestration:** `src/lib/fiche/ficheInfoService.ts`  
**gpu-site JSON mapping:** `src/lib/fiche/ficheInfoFromGpuApi.ts`  
**Document presentation:** `src/lib/fiche/ficheDocumentPresentation.ts`

## Map modes

| Mode | UI tag | gpu-client source | Panel tabs (Figma target) |
| ---- | ------ | ----------------- | ------------------------- |
| **Parcel** (`mode=1`) | Parcelle | Former **parcel sheet** (legend + parcel-scale rules) | **Infos** + **Documents** |
| **Territory** (`mode=2`) | Territoire | **Fiche d'informations** on click | **Documents**, **SUP**, **Procedures** (+ PSMV / SCoT when present) |

The standalone parcel page is removed from gpu-site (DSFR branch); its content lives in entree-carto **Parcel** mode.

## Current state (entree-carto)

### Map click / search / permalink

- **Territory:** `GET config.apiFicheInfoUrl` with `lon`, `lat`, `zoom`, `mode` → HTML tabs.
- **Parcel:** same API when configured; otherwise APICarto cadastre (header + Infos/Documents placeholders).
- **Missing:** full fiche-info query params (preview, `documentId`, absorbed municipalities, anti-stale `seq`, etc.).

### Parcel mode UI

- **Infos** / **Documents** tabs: deferred **`gpu_api_parcel_fiche`** load; in-memory cache keyed by **`parcelId`** (`parcelFicheDetailCache.ts`) — same parcel on a new click or “Load information” reuses cached HTML without a new request when already loaded.

### Territory mode UI

- Close to target tabs via `buildDocumentTabs`; functional gaps in § Backlog.

## gpu-site APIs

### Point sheet

```
GET /api/fiche-info   (gpu_api_fiche_info)
```

Key query params: `lon`, `lat`, `zoom`, `zone`, `previewDocumentId`, `partition`, `includeParcel`, `client`, `seq`, `supersede`.  
Response includes `grid`, **`deletedGrids`**, partition maps, `proceduresByDocument`, `typeref`, `parcel`, …

### Parcel sheet

```
GET /api/feature-info/parcel/{parcelId}/fiche   (gpu_api_parcel_fiche)
```

Template URL: `config.apiParcelFicheUrl` with `{parcelId}` placeholder.

Response: `{ parcel, features, typeref }`. gpu-client **ParcelLegend** builds Infos HTML from `features` (to port or simplify using `DU_CATEGORIES` / `LEGEND_CONFIG` from gpu-client-config).

`parcelId` format: `{code_dep}_{code_com}_{code_arr}_{com_abs}_{section}_{numero}`.

## Target behaviour

### Territory mode

1. Call fiche-info with full params (normal vs **document preview**).
2. Title, RNU / absorbed municipality copy, document tabs (Documents, SUP, Procedures).
3. Non-enforceable callout, metadata / PDF links.

### Parcel mode

1. **Map click:** light header (parcel + territory CTA + cadastre modal).
2. **“Load information”:** resolve `parcelId` → `gpu_api_parcel_fiche` → **Infos** (urbanism rules intersecting parcel) and **Documents** (document cards with **IN FORCE** or **NON-ENFORCEABLE** + **APPROVED** badges from `effectiveStatus` / `status`; **`document.preview`** → single blue **PRÉVISUALISATION** badge); non-enforceable callout only when at least one listed document is non-enforceable).
3. **Print:** browser print dialog after parcel fiche load (`gpu_api_parcel_fiche`).

### Document preview

On embed or demo load with preview document: pass `previewDocumentId` / validation zone, **fit map to document extent**, activate catalog entries; fiche panel **closed** and **no location cherry** until map click or permalink `mlon`/`mlat`. **Documents** tab tiles use the **PRÉVISUALISATION** badge only (not in force / historical) — touches permalink, demo config, layers, fiche service.

### Absorbed municipalities (`deletedGrids`)

Titles and document lookup rules per FicheInfoDetaillee.

### Catalogue visibility (_Data_ layers)

Checked catalogue entries (permalink hash keys such as `dev-du`, `dev-sup`, `dev-scot`, `mec`, …) drive the fiche **without** a new API call:

- **Territory:** hide document tabs (DU, SUP, SCoT, procedures/MEC) when the family is unchecked; content rebuilt via `refreshFicheForCatalogVisibility` (`ficheCatalogVisibilityFilter.ts`, `ficheInfoFromGpuApi.ts`).
- **Parcel:** **Infos** sections and **Documents** blocks (DU, SUP, SCoT, MEC replacement tiles) filtered or rebuilt on catalogue change (`TabPanelsControl`).

### External links (tiles, procedures, PDF)

DSFR tiles (`fr-tile__link`), SUP legal links, and written-rule PDF buttons are emitted with `target="_blank"` and `rel="noopener noreferrer"`. `FicheInfoPanel` renders them through `SanitizedHtml` with `link-target-blank` so DOMPurify keeps the `target` attribute.

## Remaining gaps (after P0–P2)

| Priority | Topic | Notes |
| -------- | ----- | ----- |
| P3 | **ParcelLegend**: DU/SUP labels + CNIG pictograms (`LEGEND_CONFIG`, `legendImageDetailDirectory`) — lowscale/highscale follows map zoom (`useMapLegendZoom`) | `parcelLegendImage.ts`, `parcelFeatureLabel.ts` |
| P3 | Preview catalog partition activation on layer tree | `gpuWmsLayers`, layer config |

## Related docs

[ClickInfoControl](./ClickInfoControl.md), [MapModeSelector](./MapModeSelector.md), [TabPanelsControl](./TabPanelsControl.md).
