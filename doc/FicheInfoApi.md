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
| `apiFicheInfoCombinedUrl` | Combined endpoint (preferred fetch when set) |

Relative paths resolve against the gpu-client-config script host (`configUrls.ts`).

### Server-side rules

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
- After each successful fetch, **both** territory and parcel selections are cached at the cherry point (mode switch without refetch).
- Selection caches keyed by territory / parcel id (`ficheInfoSelectionCache.ts`).
- Presentation: DSFR horizontal tiles (`ficheDocumentTiles.ts`).

See also [FicheInfo](./FicheInfo.md).
