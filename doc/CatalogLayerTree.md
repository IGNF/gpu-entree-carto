# CatalogLayerTree

Arbre **checkbox** du catalogue _Données_ (équivalent gpu-client `TreeLayerSwitcherControl` / `CreateTreeLayerSwitcherItems`).

**Source :** `src/components/layers/CatalogLayerTree.vue`  
**Construction de l’arbre :** `src/lib/layerConfig/layerConfigToTree.ts` ← `window.LAYER_CONFIG`  
**Identifiants catalogue :** chemin TLS gpu-client (`name` + valeurs de filtre, pas le seul `title`) — voir `gpu.model.Layer#getOrCreatePath`.  
**Utilisé dans :** [LayerCataloguePanel](./TabPanelsControl.md#composants-panneau) → onglet Catalogue → _Données_, sous le titre **Sélection des données** (après [CatalogLayerSearch](./CatalogLayerSearch.md)).

## Props / events

| Prop / event         | Type                      | Description                                                                 |
| -------------------- | ------------------------- | --------------------------------------------------------------------------- |
| `nodes`              | `TreeLayerNode[]`         | Racine de l’arbre (`children`, `defaultCollapsed`, `gpuVirtual`, …)         |
| `checkedById`        | `Record<string, boolean>` | État coché sur **chaque** entrée (propagation gpu-client)                   |
| `catalogRoots`       | `TreeLayerNode[]`         | Racines complètes (optionnel, défaut `nodes`) — calcul des replis           |
| `pinnedExpandIds`    | `ReadonlySet<string>`     | Branches dépliées (recherche [CatalogLayerSearch](./CatalogLayerSearch.md)) |
| `highlightedNodeIds` | `ReadonlySet<string>`     | Surbrillance temporaire des lignes                                          |
| `focusCatalogNodeId` | `string \| null`          | Scroll vers la ligne (racine du composant)                                  |
| `@toggle`            | `(id, checked)`           | → `setCatalogChecked` (checkboxes + visibilité WMS)                         |
| `@unpin-expand`      | `(id)`                    | Retrait du dépliage forcé (repli manuel)                                    |

## Comportement

- **Repli par défaut** : seuls les nœuds racine sont visibles ; chaque branche est repliée (`undeployed`, gpu-client).
- **Dépliage auto** (`catalogAncestorIdsToExpand`) : dépliage **uniquement** si le sous-arbre est **mixte** (au moins une case cochée et une décochée). Tout coché → replié ; tout décoché (ex. racine SUP sans `visible`) → replié ; sélection partielle sous « Prescriptions » → dépliage jusqu’au niveau concerné.
- Repli / dépli manuel via le chevron ; l’état manuel est conservé tant que la structure de l’arbre ne change pas.
- Cases à cocher DSFR **taille SM** (`fr-checkbox-group--sm`).
- Pas de légende sous le nœud (légendes → onglet **Légendes**).
- **Propagation checkboxes** (comme `TreeLayerSwitcherItem`) : coche parent → tous les descendants ; coche enfant → parents remontés (OR, hors `onlyLegend`) ; `onlyLegend` suit le parent.
- **Virtual** : pas de tuile WMS agrégée sur le nœud ; les feuilles en dessous portent la carte.
- **Agrégat** (parent non virtual avec WMS + enfants) : si tout le sous-arbre est coché avec la même opacité → une seule requête WMS sur le parent, feuilles masquées sur la carte (perf gpu-client).
- **`hideLayers: true`** : les entrées enfants ne sont pas affichées dans le sélecteur (`hiddenCatalogChildren`) ; le parent virtual les pilote toujours. Dans **Couches de données**, une seule ligne parent ; légende agrégée sur le parent (gpu-client `createLegendImages`, sauf doublon `prescription_psmv`).
- Feuilles WMS : `gpuMapLayer` (y compris **`onlyLegend`** avec `name` — tuile WMS comme gpu-client, sans ligne dans le sélecteur).
- **`onlyLegend`** : masqué dans le sélecteur (`catalogSwitcherDisplayNodes`) ; **Couches de données** + **Légendes** lorsque la tuile est active (coche catalogue / parent).
- **`visible`** : comme gpu-client `Layer`, absent sur un enfant → hérite du parent ; explicite (`true` / `false`) prime. État initial des checkboxes sans écraser les `visible: false` explicites.
- Paramètres LAYER_CONFIG pris en compte à l’arbre : `opacity`, **`forceOpacity`** (100 % sur la carte, **absent** de l’onglet Couches de données), `virtual`, `onlyLegend`, filtres CQL, **`minZoomLevel` / `maxZoomLevel`** (hérités comme gpu-client), légendes (`LEGEND_*`).
- **Hors plage de zoom** : ligne grisée (`ec-not-in-zoom-range`, équivalent gpu-client `notInZoomRange`) — mise à jour au zoom carte ; dossier non tuile grisé si aucun descendant n’est dans la plage.
- **Couches de données** : une ligne par entrée cochée **dont la tuile WMS est active** sur la carte (agrégat actif → pas les feuilles cochées) — voir [DataLayersManagerPanel](./DataLayersManagerPanel.md).
- Synchronisation carte via `layerMapHooks` → `GpuWmsLayerRegistry` (démo `/map`).
- **Regroupement des requêtes WMS** (`GpuWmsLayerRegistry`) : le catalogue pilote toujours la carte entrée par entrée ; le registre fusionne ensuite les couches affichées **contiguës dans l’ordre de la pile**, de **même URL**, **même opacité** et **même réglage noir et blanc** en une seule source (`LAYERS=a,b,c`, premier nom dessiné en bas). Exemple : couches par défaut au zoom 15 → 2 requêtes par tuile (groupe + `mec` opaque) au lieu de 6.
  - Filtre CQL : un filtre par sous-couche, séparés par `;` (`INCLUDE` pour une sous-couche sans filtre ; nom à virgule `info,info_psmv` → filtre répété), sinon GeoServer refuse la requête.
  - Groupes recalculés à chaque changement de cases, d’opacité, de noir et blanc ou d’ordre, et quand une couche entre ou sort de sa plage de zoom (ex. `document` → couches DU entre les zooms 11 et 12). Plage du groupe = intersection des plages de ses couches.
  - Ajouter ou retirer une couche d’un groupe met à jour la même source : les tuiles déjà affichées restent visibles jusqu’au chargement des nouvelles.
  - Couches hors pile (absentes de l’ordre transmis) : regroupées entre elles par `zIndex` de la config, sous la pile.
  - Repli : si une tuile d’un groupe échoue (une sous-couche en erreur fait échouer toute la requête, ex. `_previsu` absente), ses couches repassent en requêtes séparées jusqu’au prochain chargement de configuration.
  - Impression : la couche de groupe porte ses options de source (copie hidpi) et un `id` qui change avec sa composition (cache d’aperçu).

## Dépendances

- Types `TreeLayerNode` : `TreeLayerSwitcher.vue`
- Config distante : `configScriptUrl` dans [DemoConfig.md](./DemoConfig.md)
