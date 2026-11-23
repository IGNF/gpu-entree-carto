[![en](https://img.shields.io/badge/lang-en-red.svg)](FicheInfoApi.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](FicheInfoApi.fr.md)

# Fiche info API (gpu-site contract)

Client reference for **entree-carto** — routes are implemented in **gpu-site** (Symfony).

## Endpoints

| Route | Use |
| ----- | --- |
| `GET /api/fiche-info-v2/territoire?lon=&lat=&zoom=` | Territory fiche (commune / arrondissement) |
| `GET /api/fiche-info-v2/parcelle?lon=&lat=&zoom=` | Parcel fiche |
| `GET /api/fiche-info-v2?lon=&lat=&zoom=` | Combined payload (optional, avoids duplicate calls on mode switch) |

Legacy: `GET /api/fiche-info` with `mode`, `includeParcel`, preview params (`ficheInfoQuery.ts`).

### Config keys (`gpu.config`)

| Key | Role |
| --- | ---- |
| `apiFicheInfoUrl` | Base URL (legacy or v2 root) |
| `apiFicheInfoTerritoireUrl` | Override territory endpoint |
| `apiFicheInfoParcelleUrl` | Override parcel endpoint |
| `apiFicheInfoCombinedUrl` | Combined v2 endpoint |
| `apiFicheInfoPreferCombined` | `false` to force split `/territoire` and `/parcelle` calls (default: combined when v2 is configured) |
| `apiFicheInfoCatalogFamilies` | `false` to disable catalog-driven `activeFamilies` filtering (default: `true` with v2) |

Relative paths resolve against the gpu-client-config script host (`configUrls.ts`).

### Server-side rules

- **v2 documents (gpu-site)** — three-step pipeline: resolve **parcel + commune** at the click; load **DB** documents for the **commune grid** (DU, PSMV…), **SUP** via **`municipality_sup`** (INSEE → partitions `{idgest}_SUP_{department}_{suptype}`), **SCoT** at the point when the commune grid has no SCoT document, WFS partitions **at the point** when no commune is resolved, and WFS partitions intersecting the **parcel**; **synthesize** by scope (`territoire` = commune catalogue when INSEE is resolved, otherwise point partitions only; `parcelle` = partitions intersecting the parcel only). On **territoire**, a DB document is omitted unless WFS returns urbanism entities at the click for that partition (SUP commune entries via `municipality_sup` still apply). **Lookup cache** (5 min, tags `published_documents`, commune INSEE, parcel id, document grid); on publish/status change, commune tags cleared via grid **descendance** (SCoT / EPCI / department → municipalities). Legacy `/api/fiche-info` unchanged.
- **APICarto** (`cadastre/commune`, `cadastre/parcelle`) must be called **only from gpu-site**, not from the browser.
- Responses should include stable cache keys: `grid.insee`, parcel cadastre id (`parcelId` or `parcel` properties).
- Optional client hints: `knownParcelId`, `knownGridInsee` (for server cache / 304 — future).

### v2 payload slimming (gpu-site)

Applied only on **`/api/fiche-info-v2*`** (not legacy `/api/fiche-info`):

| Removed / slimmed | Reason |
| ----------------- | ------ |
| `rawFeatures`, `partitions`, `documentPartitions`, `notUnforceableByDocument`, `duLowScale`, `territoryParcelId`, root `features` | Not used by entree-carto fiche |
| `dus` / … partition `features`, `pets` | Territory UI uses `documents` only; parcel rules use `parcelFiche.features` |
| `lowScaleDocument` | Omitted when `dus` already has production documents |
| `parcelFeature` | Omitted when `parcelGeometry` is present |
| `grid` | Reduced to `name`, `insee`, `is_rnu` |
| `parcel` | Cadastre fields only (section, numero, insee, id, …) |
| `deletedGrids[]` | `properties.insee` / `name` / `is_rnu` only |
| Panel / low-scale **documents** | Whitelist: `id`, `title`, `name`, `originalName`, `type`, `status`, `effectiveStatus`, `legalStatus`, `viewUrl`, `archiveUrl`, `typepsc`, `typeref` |
| `proceduresByDocument` | Procedure + `procedureType.title`, file `url` / dates only |
| `parcelFiche` | `{ features }` only (combined / parcelle scope); omitted on `/territoire` |
| `parcelGeometry` | Omitted on `/territoire` |

Clients must not rely on fields outside this contract on v2 responses.

## JSON payload (subset)

Same shape as today’s `/api/fiche-info` (`GpuFicheInfoPayload`) plus v2 extensions (including map mode emprises: `parcelGeometry`, `gridGeometry`, `parentGridGeometry` for Paris/Lyon/Marseille arrondissements):

| Field | Description |
| ----- | ----------- |
| `parcel`, `grid`, `dus`, `psmvs`, `sups`, `scots`, `proceduresByDocument` | Existing gpu-site fiche |
| `parcelFiche` or `features` | Full parcel urbanism rules + document features (replaces separate `gpu_api_parcel_fiche` when present) |
| `parcelGeometry`, `gridGeometry` | GeoJSON for map highlight (EPSG:4326) |
| `parcelId`, `territoryParcelId` | Mode-switch CTAs |
| Document `id`, `viewUrl`, `legalStatus`, `effectiveStatus` | DSFR tiles + badges |

## entree-carto behaviour

- No APICarto fallback in the browser.
- **Map click**: when v2 split endpoints are configured, a single `GET` on `apiFicheInfoCombinedUrl` (`scope=both`) fills territory **and** parcel cache at the cherry point; no silent `/parcelle` enrichment in that case.
- **Catalog**: Données checkboxes (DU/PSMV/MEC → `du`, SUP, SCoT) are sent as `activeFamilies[]`; checked SUP sub-layers send `activeSupTypes[]` from `config_layers.json` `supType` (e.g. `AC1`). At the same cherry point, newly checked families or SUP types trigger an incremental fetch (local JSON merge, `ensureFicheCatalogSupplementAtMarker`).
- **Split** (`apiFicheInfoPreferCombined = false`): per-mode requests; territory still may call `/parcelle` silently for the back-to-parcel CTA metadata.
- **Parcel — Infos** — zoning, prescriptions, and information rules are shown only when the partition’s document is **in production** in the fiche-info API (same rule as Document tiles).
- **Per-mode** cache at the cherry point (`ficheInfoService.ts`); repeat click or mode switch at the same point uses cache (no refetch).
- Previous in-flight `fetch` aborted on the next click (`AbortController`); lightweight `supersede=true` with `client` / `seq` stops stale Symfony work before the main request.
- Presentation: DSFR horizontal tiles (`ficheDocumentTiles.ts`).
- **SCoT**: a tile is shown only when the gpu-site document `id` matches the WFS feature `gpu_id` (or `gpu_doc_id`) at the click point (no partition-only fallback).
- **SCoT not in the database** (map/WFS data only, no `gpu_id`): `approved` true → grey **NON PUBLIÉ** badge, otherwise → grey **ARRÊTÉ** badge (`scotWfsStatus.ts`, same rule as the WMS styles and gpu-client). The tile has no link (the document does not exist) and is shown in parcel **Documents** and in the territory **SCoT** tab (from `parcelFiche.features`). Parcel **Infos** rows get the ` - non publié` / ` - arrêté` suffix and the `SCOT_NOT_PUBLISHED` / `SCOT_PERIMETER` legend picture.
- **MEC (territory)**: gpu-site also queries WFS layer `mec` against the **commune footprint** (`ign_grid` outline), not only the cherry point — so a SCoT (or DU) MEC overlapping the commune is detected even when the marker is elsewhere on the municipality.

See also [FicheInfo](./FicheInfo.md).
