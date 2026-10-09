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

- **Infos** / **Documents** tabs and “Load information” buttons only toggle local flags — **no fetch**.
- On map click, when fiche-info returns, `parcelInfosHtml` / `parcelDocumentsHtml` are filled from **point** JSON, not **`gpu_api_parcel_fiche`**.

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
2. **“Load information”:** resolve `parcelId` → `gpu_api_parcel_fiche` → **Infos** (urbanism rules intersecting parcel) and **Documents** (document cards).
3. **Print:** browser print dialog after parcel fiche load (`gpu_api_parcel_fiche`).

### Document preview

On embed load with preview document: pass `previewDocumentId` / validation zone, **fit map to document extent**, activate catalog entries — touches permalink, demo config, layers, fiche service.

### Absorbed municipalities (`deletedGrids`)

Titles and document lookup rules per FicheInfoDetaillee.

## Remaining gaps (after P0–P2)

| Priority | Topic | Notes |
| -------- | ----- | ----- |
| P3 | Full **ParcelLegend** parity (CNIG legend images) | `parcelFicheFromGpuApi.ts`, `legendImageDetailDirectory` |
| P3 | Preview catalog partition activation on layer tree | `gpuWmsLayers`, layer config |

## Related docs

[ClickInfoControl](./ClickInfoControl.md), [MapModeSelector](./MapModeSelector.md), [TabPanelsControl](./TabPanelsControl.md).
