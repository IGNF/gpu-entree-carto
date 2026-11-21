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
| `apiFicheInfoCombinedUrl` | Endpoint combiné v2 |
| `apiFicheInfoPreferCombined` | `false` pour forcer les appels split `/territoire` et `/parcelle` (défaut : combiné si v2) |
| `apiFicheInfoCatalogFamilies` | `false` pour désactiver le filtrage `activeFamilies` piloté par le catalogue (défaut : `true` en v2) |

Les chemins relatifs se résolvent par rapport à l’hôte du script gpu-client-config (`configUrls.ts`).

### Règles serveur

- **Documents v2 (gpu-site)** — pipeline en trois temps : résolution **parcelle + commune** au clic ; chargement BDD pour le **maillage communal** (DU, PSMV…), **SUP** via **`municipality_sup`** (INSEE → partitions `{idgest}_SUP_{département}_{suptype}`), **SCoT** au point si la commune n’a pas de maillage SCoT, partitions WFS **au point** si aucune commune, et partitions WFS sur la **parcelle** ; **synthèse** par scope (`territoire` = catalogue communal si INSEE résolu, sinon partitions au point ; `parcelle` = partitions intersectant la parcelle). En **territoire**, un document BDD sans entité d’urbanisme WFS au clic (hors SUP via `municipality_sup`) n’est pas affiché. **Cache lookup** (5 min, tags `published_documents`, INSEE commune, id parcelle, maillage document) ; invalidation à la publication : communes déduites par **descendance** maillage (SCoT / EPCI / département → communes). API legacy `/api/fiche-info` inchangée.
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
- **Clic carte** : si v2 est configuré (`apiFicheInfoTerritoireUrl` / `apiFicheInfoParcelleUrl` ou URL racine v2), un seul `GET` sur `apiFicheInfoCombinedUrl` (`scope=both`) remplit le cache territoire **et** parcelle au point cerise ; pas d’enrichissement silencieux `/parcelle` dans ce cas.
- **Catalogue** : les cases Données (DU/PSMV/MEC → `du`, SUP, SCoT) partent en `activeFamilies[]` ; les sous-couches SUP cochées (`supType` dans `config_layers.json`) en `activeSupTypes[]` (ex. `AC1`). Au même point cerise, les familles ou types SUP nouvellement cochés déclenchent un complément réseau (fusion JSON locale, `ensureFicheCatalogSupplementAtMarker`).
- **Split** : avec `apiFicheInfoPreferCombined = false`, appels par mode ; en territoire, second appel `/parcelle` (ou cache) pour les métadonnées parcelle du CTA retour.
- **Parcelle — Infos** : zonages / prescriptions / informations affichés seulement si le document de la partition est **en production** dans la fiche-info API (même critère que les tuiles Documents).
- Cache **par mode** au point cerise (`ficheInfoService.ts`) ; second clic ou changement de mode **sans** nouveau point = cache (pas de refetch).
- Annulation du `fetch` précédent au clic suivant (`AbortController`) ; requête légère `supersede=true` avec `client` / `seq` pour couper le travail Symfony en cours avant le nouvel appel.
- Présentation : tuiles DSFR horizontales (`ficheDocumentTiles.ts`).
- **SCoT** : une tuile n’est affichée que si l’`id` document gpu-site correspond au `gpu_id` (ou `gpu_doc_id`) de l’entité WFS au point (plus de seul rapprochement par partition `scot_*`).
- **MEC (territoire)** : gpu-site interroge aussi la couche WFS `mec` sur l’**emprise communale** (intersection avec le contour `ign_grid`), pas uniquement au cerise — pour détecter une MEC SCoT (ou DU) qui recouvre la commune sans intersecter le point de localisation.

Voir aussi [FicheInfo](./FicheInfo.fr.md).
