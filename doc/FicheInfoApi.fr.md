[![en](https://img.shields.io/badge/lang-en-red.svg)](FicheInfoApi.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](FicheInfoApi.fr.md)

# API fiche info (contrat gpu-site)

Référence client **entree-carto** — les routes sont implémentées côté **gpu-site** (Symfony).

## Routes

| Route | Usage |
| ----- | ----- |
| `GET /api/fiche-info-v2/territoire?lon=&lat=&zoom=` | Fiche territoire (commune / arrondissement) |
| `GET /api/fiche-info-v2/parcelle?lon=&lat=&zoom=` | Fiche parcelle |
| `GET /api/fiche-info-v2?lon=&lat=&zoom=` | Réponse combinée (évite deux appels au changement de mode) |

Legacy : `GET /api/fiche-info` avec `mode`, `includeParcel`, paramètres preview (`ficheInfoQuery.ts`).

### Clés de config (`gpu.config`)

| Clé | Rôle |
| --- | ---- |
| `apiFicheInfoUrl` | URL de base (legacy ou racine v2) |
| `apiFicheInfoTerritoireUrl` | Surcharge endpoint territoire |
| `apiFicheInfoParcelleUrl` | Surcharge endpoint parcelle |
| `apiFicheInfoCombinedUrl` | Endpoint combiné (prioritaire si défini) |

Les chemins relatifs se résolvent par rapport à l’hôte du script gpu-client-config (`configUrls.ts`).

### Règles serveur

- **APICarto** (`cadastre/commune`, `cadastre/parcelle`) uniquement **côté gpu-site**, jamais depuis le navigateur.
- Réponses avec clés de cache stables : `grid.insee`, identifiant parcelle (`parcelId` ou propriétés `parcel`).
- Indices client optionnels : `knownParcelId`, `knownGridInsee` (cache serveur / 304 — évolution).

### Allègement payload v2 (gpu-site)

Appliqué uniquement sur **`/api/fiche-info-v2*`** (pas sur `/api/fiche-info` legacy) :

| Retiré / allégé | Motif |
| --------------- | ----- |
| `rawFeatures`, `partitions`, `documentPartitions`, `notUnforceableByDocument`, `duLowScale`, `territoryParcelId`, `features` racine | Non utilisés par la fiche entree-carto |
| `features` et `pets` des partitions `dus` / … | Territoire : tuiles `documents` ; parcelle : `parcelFiche.features` |
| `lowScaleDocument` | Absent si `dus` a déjà des documents en production |
| `parcelFeature` | Absent si `parcelGeometry` est présent |
| `grid` | Réduit à `name`, `insee`, `is_rnu` |
| `parcel` | Champs cadastre utiles (section, numero, insee, id, …) |
| `deletedGrids[]` | `properties.insee` / `name` / `is_rnu` seulement |
| Documents (panneaux / low-scale) | Liste blanche : `id`, `title`, `name`, `originalName`, `type`, `status`, `effectiveStatus`, `legalStatus`, `viewUrl`, `archiveUrl`, `typepsc`, `typeref` |
| `proceduresByDocument` | Procédure + `procedureType.title`, fichiers (`url`, dates) |
| `parcelFiche` | `{ features }` seulement (combiné / parcelle) ; absent sur `/territoire` |
| `parcelGeometry` | Absent sur `/territoire` |

Les clients v2 ne doivent pas compter sur d’autres champs que ce contrat.

## Payload JSON (extrait)

Même forme que `/api/fiche-info` actuel (`GpuFicheInfoPayload`) + extensions v2 (emprises carte : `parcelGeometry`, `gridGeometry`, `parentGridGeometry` pour les arrondissements Paris/Lyon/Marseille) :

| Champ | Description |
| ----- | ----------- |
| `parcel`, `grid`, `dus`, `psmvs`, `sups`, `scots`, `proceduresByDocument` | Fiche gpu-site existante |
| `parcelFiche` ou `features` | Règles + documents parcelle (remplace `gpu_api_parcel_fiche` si présent) |
| `parcelGeometry`, `gridGeometry` | GeoJSON pour surbrillance carte (EPSG:4326) |
| `parcelId`, `territoryParcelId` | Bascules mode parcelle / territoire |
| Document : `id`, `viewUrl`, `legalStatus`, `effectiveStatus` | Tuiles DSFR + badges |

## Comportement entree-carto

- Plus de repli APICarto dans le navigateur.
- Après chaque réponse OK, cache **territoire et parcelle** au point cerise (changement de mode sans refetch).
- Caches par identifiants territoire / parcelle (`ficheInfoSelectionCache.ts`).
- Présentation : tuiles DSFR horizontales (`ficheDocumentTiles.ts`).

Voir aussi [FicheInfo](./FicheInfo.fr.md).
