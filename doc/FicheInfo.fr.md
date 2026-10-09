[![en](https://img.shields.io/badge/lang-en-red.svg)](FicheInfo.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](FicheInfo.fr.md)

# Fiche informations (panneau TabPanels)

Alignement cible avec **gpu-client** et **gpu-site**, à partir de :

- [`gpu-client/doc/FicheInfoDetaillee.md`](https://github.com/ignf/gpu-client/blob/main/doc/FicheInfoDetaillee.md) — fiche **Territoire** (clic carte / point) ;
- [`gpu-client/doc/FicheParcelleDetaillee.md`](https://github.com/ignf/gpu-client/blob/main/doc/FicheParcelleDetaillee.md) — contenu **parcelle** (ex-page `/map/parcel-info/`).

**UI :** `src/components/panels/FicheInfoPanel.vue` — onglets internes DSFR **Onglets** (`fr-tabs`, `tab.min.css`), distincts de la barre `fr-nav` du catalogue.  
**Orchestration :** `src/lib/fiche/ficheInfoService.ts`  
**Mapping JSON gpu-site :** `src/lib/fiche/ficheInfoFromGpuApi.ts`  
**Présentation documents :** `src/lib/fiche/ficheDocumentPresentation.ts`

## Rôle des deux modes carte

| Mode | Tag UI | Source métier gpu-client | Onglets panneau (cible Figma) |
| ---- | ------ | ------------------------ | ----------------------------- |
| **Parcelle** (`mode=1`) | Parcelle (violet) | Ancienne **fiche parcelle** (légende + documents à l’échelle parcelle) | **Infos** (règles intersectant la parcelle) + **Documents** |
| **Territoire** (`mode=2`) | Territoire (vert) | **Fiche d’informations** au clic (commune / point) | **Documents**, **SUP**, **Procédures** (+ PSMV / SCoT si données) |

La fiche parcelle **disparaît** de gpu-site (branche DSFR) : son contenu est **intégré** au mode Parcelle de entree-carto, sans page dédiée `/map/parcel-info/`.

## État actuel (entree-carto)

### Clic carte / recherche / permalink

- **Territoire :** `GET config.apiFicheInfoUrl` (`gpu_api_fiche_info`) avec `lon`, `lat`, `zoom`, `mode` — mapping vers onglets HTML (`documentTabs`).
- **Parcelle :** même API si configurée ; sinon APICarto `cadastre/parcelle` (en-tête + placeholders Infos/Documents).
- **Pas encore :** paramètres fiche-info complets (preview, `documentId`, communes absorbées, séquence anti-course, etc.).

### UI mode Parcelle

- Onglets **Infos** / **Documents** : chargement différé `gpu_api_parcel_fiche` ; cache mémoire par **`parcelId`** (`parcelFicheDetailCache.ts`) — reclic sur la même parcelle ou bouton « Charger les informations » sans nouvel appel si déjà en cache.
- Au clic carte, si l’API fiche-info répond, `parcelInfosHtml` / `parcelDocumentsHtml` sont **pré-remplis** depuis le JSON **point** (`/api/fiche-info`), pas depuis **`gpu_api_parcel_fiche`**.

### UI mode Territoire

- Proche du visuel cible (onglets Documents / SUP / Procédures) via `buildDocumentTabs`.
- Manques fonctionnels listés au § « Écarts ».

## APIs gpu-site

### Fiche point (Territoire + en-tête parcelle au clic)

```
GET /api/fiche-info   (gpu_api_fiche_info)
```

Paramètres importants (voir FicheInfoDetaillee §6) :

| Paramètre | Usage |
| --------- | ----- |
| `lon`, `lat` | Obligatoires (sauf `supersede`) |
| `zoom` | Petite échelle, visibilité parcelle |
| `zone` | `production` / `validation` (preview) |
| `previewDocumentId` | Document en prévisualisation |
| `partition` | Filtre WFS en validation |
| `includeParcel` | Inclure attributs parcelle |
| `client`, `seq` | Abandon requêtes obsolètes |
| `supersede` | Contournement garde-fous coordonnées |

Réponse clé : `grid`, **`deletedGrids`** (communes absorbées), partitions `dus` / `psmvs` / `sups` / `scots`, `proceduresByDocument`, `typeref`, `parcel`, etc.

### Fiche parcelle (contenu détaillé à la parcelle)

```
GET /api/feature-info/parcel/{parcelId}/fiche   (gpu_api_parcel_fiche)
```

URL modèle injectée : `config.apiParcelFicheUrl` (placeholder `{parcelId}` dans gpu-client-config).

Réponse :

```json
{
  "parcel": { "type": "FeatureCollection", "features": [] },
  "features": [],
  "typeref": "01"
}
```

`parcelId` = `{code_dep}_{code_com}_{code_arr}_{com_abs}_{section}_{numero}` (gpu-site `ParcelService`, propriété `id` sur la feature cadastre).

Côté gpu-client, **ParcelLegend** + présentation documents transforment `features` en HTML (équivalent « VUE DETAILLEE DES DOCUMENTS D'URBANISME » + cartes documents). **À porter ou simplifier** dans entree-carto (configs `DU_CATEGORIES`, `SUP_CATEGORIES`, `LEGEND_CONFIG` déjà dans gpu-client-config).

## Comportement cible

### Mode Territoire (image maquette Territoire)

1. Clic / recherche → `fiche-info` avec paramètres complets selon contexte (carte normale vs **preview document**).
2. Titre : commune `(INSEE)` ; textes RNU / communes absorbées / documents manquants selon règles gpu-client.
3. Onglets :
   - **Documents** — DU / PSMV (panneau « Documents d’urbanisme ») ;
   - **SUP** ;
   - **Procédures** — procédures en cours.
4. Bandeau non-exécutoire, liens métadonnées / PDF, Envergo (si prévu).

### Mode Parcelle (image maquette Parcelle)

1. **Clic carte :** APICarto ou fiche-info **léger** — en-tête parcelle, bouton territoire, références cadastrales ; **ne pas** charger tout le détail tant que l’utilisateur n’a pas demandé (option produit : garder un résumé au clic).
2. **« Charger les informations »** (Infos ou Documents) :
   - construire `parcelId` depuis `selection.raw.parcel` ou propriétés cadastre ;
   - `GET apiParcelFicheUrl` ;
   - **Infos :** HTML type légende gpu-client (zonage, prescriptions, infos, MEC) ;
   - **Documents :** cartes documents intersectant la parcelle (badges **EN VIGUEUR** ou **NON EXÉCUTOIRE** + **APPROUVÉ** selon `effectiveStatus` / `status`) ; encart « Certains documents ne sont pas exécutoires… » **uniquement** si au moins une carte est non exécutoire.
3. **Imprimer** : fenêtre d’impression navigateur une fois la fiche parcelle chargée (`gpu_api_parcel_fiche`).

### Preview document (`documentId`)

Hors fiche seule : au chargement carte en mode preview gpu-site :

- passer `previewDocumentId` / `zone=validation` à fiche-info ;
- **recentrer** sur l’emprise du document ;
- activer les entrées catalogue correspondantes.

Fichiers entree-carto concernés : permalink / `demoConfig`, `managedLayers`, `MapPermalinkSync`, service fiche (nouveaux query params).

### Communes absorbées (`deletedGrids`)

- Affichage titres / messages « commune fusionnée » ;
- recherche documents sur maillages absorbés quand aucune partition au point (règles FicheInfoDetaillee §11–12).

## Écarts restants (après P0–P2)

| Priorité | Sujet | Fichiers / notes |
| -------- | ----- | ---------------- |
| P3 | **ParcelLegend** : libellés DU/SUP + pictos CNIG (`LEGEND_CONFIG`, `legendImageDetailDirectory`) — bascule lowscale/highscale au zoom carte (`useMapLegendZoom`) | `parcelLegendImage.ts`, `parcelFeatureLabel.ts` |
| P3 | Catalogue preview : activation partition côté arbre couches (embed gpu-site) | `gpuWmsLayers`, layer config |

## Fichiers de référence entree-carto

| Fichier | Rôle |
| ------- | ---- |
| `FicheInfoPanel.vue` | Layout Parcelle / Territoire, onglets DSFR (`fr-tabs`), chargement différé |
| `ficheInfoService.ts` | Fetch, cache par mode, APICarto, TabPanels |
| `parcelFicheDetailCache.ts` | Cache détail parcelle (`parcelId` → Infos/Documents + `_parcelFiche`) |
| `ficheInfoFromGpuApi.ts` | JSON fiche-info → `FicheInfoSelection` |
| `ficheDocumentPresentation.ts` | Cartes documents (Territoire / parcelle documents) |
| `ficheCadastreReferences.ts` | Modal références cadastrales |
| `ClickInfoControl.vue` | Déclencheur clic carte |

Voir aussi [ClickInfoControl](./ClickInfoControl.fr.md), [MapModeSelector](./MapModeSelector.fr.md), [TabPanelsControl](./TabPanelsControl.fr.md).
