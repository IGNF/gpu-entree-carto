# API fiche info (contrat gpu-site)

Référence client **entree-carto** — les routes sont implémentées côté **gpu-site** (Symfony).

## Routes

| Route | Usage |
| ----- | ----- |
| `GET /api/fiche-info/territoire?lon=&lat=&zoom=` | Fiche territoire (commune / arrondissement) |
| `GET /api/fiche-info/parcelle?lon=&lat=&zoom=` | Fiche parcelle |
| `GET /api/fiche-info?lon=&lat=&zoom=` | Réponse combinée (évite deux appels au changement de mode) |
| `GET /api/fiche-info/coordonnees?lon=&lat=&zoom=` | Mode Coordonnées : règles au point (`pointFiche.features`, format de `parcelFiche`), documents de la commune, `parcelId` du point, sans fiche parcelle |

Ces routes remplacent `/api/fiche-info-v2*` ; l’ancienne `/api/fiche-info` (paramètres `mode`, `includeParcel`) n’est plus gérée par entree-carto. Seule l’URL vient de la config : le client ne déduit plus de comportement du chemin.

### Clés de config (`gpu.config`)

| Clé | Rôle |
| --- | ---- |
| `apiFicheInfoUrl` | URL de base (combinée ; `/territoire` et `/parcelle` en sont dérivées) |
| `apiFicheInfoTerritoireUrl` | Surcharge endpoint territoire |
| `apiFicheInfoCoordonneesUrl` | Surcharge endpoint coordonnées (sinon `apiFicheInfoUrl` + `/coordonnees`) |
| `apiFicheInfoParcelleUrl` | Surcharge endpoint parcelle |
| `apiFicheInfoCombinedUrl` | Surcharge endpoint combiné |
| `apiFicheInfoPreferCombined` | `false` pour forcer les appels split `/territoire` et `/parcelle` (défaut : combiné) |
| `apiFicheInfoCatalogFamilies` | `false` pour désactiver le filtrage `activeFamilies` piloté par le catalogue (défaut : `true`) |

Les chemins relatifs se résolvent par rapport à l’hôte du script gpu-client-config (`configUrls.ts`).

### Règles serveur

- **Documents (gpu-site)** — pipeline en trois temps : résolution **parcelle + commune** au clic ; chargement BDD pour le **maillage communal** (DU, PSMV…), **SUP** via **`municipality_sup`** (INSEE → partitions `{idgest}_SUP_{département}_{suptype}`), **SCoT** au point si la commune n’a pas de maillage SCoT, partitions WFS **au point** si aucune commune, et partitions WFS sur la **parcelle** ; **synthèse** par scope (`territoire` = catalogue communal si INSEE résolu, sinon partitions au point ; `parcelle` = partitions intersectant la parcelle). En **territoire**, un document BDD sans entité d’urbanisme WFS au clic (hors SUP via `municipality_sup`) n’est pas affiché. **Cache lookup** (5 min, tags `published_documents`, INSEE commune, id parcelle, maillage document) ; invalidation à la publication : communes déduites par **descendance** maillage (SCoT / EPCI / département → communes).
- **APICarto** (`cadastre/commune`, `cadastre/parcelle`) uniquement **côté gpu-site**, jamais depuis le navigateur.
- Réponses avec clés de cache stables : `grid.insee`, identifiant parcelle (`parcelId` ou propriétés `parcel`).
- Indices client optionnels : `knownParcelId`, `knownGridInsee` (cache serveur / 304 — évolution).

### Allègement payload (gpu-site)

Appliqué sur **`/api/fiche-info*`** :

| Retiré / allégé | Motif |
| --------------- | ----- |
| `rawFeatures`, `partitions`, `documentPartitions`, `notUnforceableByDocument`, `duLowScale`, `territoryParcelId`, `features` racine | Non utilisés par la fiche entree-carto |
| `features` et `pets` des partitions `dus` / … | Territoire : tuiles `documents` ; parcelle : `parcelFiche.features` |
| `lowScaleDocument` | Absent si `dus` a déjà des documents en production |
| `parcelFeature` | Absent si `parcelGeometry` est présent |
| `grid` | Réduit à `name`, `insee`, `is_rnu`, `is_coastline` |
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
- **Clic carte** : un seul `GET` sur l’URL combinée (`scope=both`) remplit le cache territoire **et** parcelle au point cerise ; pas d’enrichissement silencieux `/parcelle` dans ce cas.
- **Catalogue** : `activeFamilies[]` contient toujours `du` (commune, MEC DU et SCoT au point), `sup` si une couche SUP est cochée **et** dans sa plage de zoom (hors petite échelle), `scot` si une couche SCoT est cochée ; les sous-couches SUP cochées (`supType` dans `config_layers.json`) en `activeSupTypes[]` (ex. `AC1`). Au même point cerise, les familles ou types SUP nouvellement cochés déclenchent un complément réseau (fusion JSON locale, `ensureFicheCatalogSupplementAtMarker`), de même que l’entrée de la couche SUP dans sa plage de zoom. Une famille marquée `supIncluded` / `scotIncluded` à `false` dans la réponse (absent = incluse) n’est pas considérée comme acquise.
- **Limitation de débit** : gpu-site compte par IP les requêtes exposant des SUP (fiche avec `sup`, fiche parcelle). Sur HTTP 429, la fiche affiche « Service temporairement saturé, réessayez. » (avec le bouton Réessayer), la fiche parcelle le même message.
- **Split** : avec `apiFicheInfoPreferCombined = false`, appels par mode ; en territoire, second appel `/parcelle` (ou cache) pour les métadonnées parcelle du CTA retour.
- **Liens des tuiles document** : `viewUrl`, sinon page du document `/document/by-id/{id}` (route commune à gpu-site main et dsfr ; `documentViewUrl` de la config si présent), sinon **aucun lien** — l’archive (`archiveUrl`, `urlfic`) n’est jamais proposée ; document hors base : pas de lien.
- **Pièce écrite (PDF) d’une règle** : `urlfic`, sinon `nomfic` s’il est une URL, sinon fichier `nomfic` (ou `fichier` pour les SUP) du document de la partition via `apiDocumentFileUrl` (`/api/document/{id}/files/{fichier}`, ancre `#page=N` conservée) ; sans lien, pas d’icône PDF.
- **Catalogue → règles DU** : couches DU reconnues avec les noms de production (`du,psmv`, `info,info_psmv`) comme avec ceux préfixés `dev-`.
- **Compatibilité gpu-site main** (démo en ligne, `geoportail-urbanisme.gouv.fr`) : sans `gridGeometry`, l’emprise de la commune est lue dans `grid.feature.geometry`.
- **Servitude de passage sur le littoral (EL9)** : tuile EL9 (texte + « article L. 121-31 du code de l’urbanisme », lien Légifrance) en tête des SUP — **territoire** : commune littorale (`grid.is_coastline`) ; **parcelle** (onglet Documents) : point dans la zone d’alerte (`is_el9_alert`). Affichée seulement si les SUP sont cochées.
- **Pas de commune au point** (ex. en mer) : fiche territoire titrée « Pas de commune à cet emplacement », message « Pas de document trouvé à cet emplacement… ».
- **Parcelle — Infos** : zonages / prescriptions / informations affichés seulement si le document de la partition est **en production** dans la fiche-info API (même critère que les tuiles Documents).
- Cache **par mode** au point cerise (`ficheInfoService.ts`) ; second clic ou changement de mode **sans** nouveau point = cache (pas de refetch).
- Ce cache est **séparé par route** : Parcelle / Territoire (requête combinée) d’un côté, Coordonnées (`/coordonnees`, règles au point) de l’autre. Les réponses ne sont jamais fusionnées entre routes : passer de Parcelle à Coordonnées au même point interroge `/coordonnees` une fois, puis chaque mode reprend son cache.
- Annulation du `fetch` précédent au clic suivant (`AbortController`) ; requête légère `supersede=true` avec `client` / `seq` pour couper le travail Symfony en cours avant le nouvel appel.
- Présentation : tuiles DSFR horizontales (`ficheDocumentTiles.ts`).
- **SCoT** : une tuile n’est affichée que si l’`id` document gpu-site correspond au `gpu_id` (ou `gpu_doc_id`) de l’entité WFS au point (plus de seul rapprochement par partition `scot_*`).
- **SCoT absent de la base** (données carte / WFS uniquement, sans `gpu_id`) : `approved` vrai → badge gris **NON PUBLIÉ**, sinon → badge gris **ARRÊTÉ** (`scotWfsStatus.ts`, même règle que les styles WMS et gpu-client). La tuile n’a pas de lien (le document n’existe pas) ; elle apparaît dans **Documents** (parcelle) et dans l’onglet **SCoT** (territoire, à partir de `parcelFiche.features`). Les lignes **Infos** parcelle reçoivent le suffixe ` - non publié` / ` - arrêté` et le pictogramme de légende `SCOT_NOT_PUBLISHED` / `SCOT_PERIMETER`.
- **MEC (territoire)** : gpu-site interroge aussi la couche WFS `mec` sur l’**emprise communale** (intersection avec le contour `ign_grid`), pas uniquement au cerise — pour détecter une MEC SCoT (ou DU) qui recouvre la commune sans intersecter le point de localisation.

Voir aussi [FicheInfo](./FicheInfo.md).
