[![en](https://img.shields.io/badge/lang-en-red.svg)](DemoConfig.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](DemoConfig.fr.md)

# Configuration démo (`demo-config.js`)

Fichier JS **hors bundle**, sur le modèle de gpu-client [`exemple-config.js`](https://github.com/IGNF/gpu-client/blob/master/public/js/exemple-config.js).

**Fichier :** `public/js/demo-config.js`  
**Chargement :** `index.html` (avant l’app Vue) → `window.DEMO_CONFIG`  
**Consommation :** `src/lib/demo/demoConfig.ts` — pages `/`, `/map`

## Objectif

Modifier l’environnement ou le jeu de test **sans recompiler** ni toucher au code Vue : URL `gpu-client-config`, document, bbox, surcharges `gpu.config`, couches catalogue, recherche initiale, etc.

## Structure `window.DEMO_CONFIG`

| Clé                      | Description                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `useMinimified`          | `false` (défaut) : démos via sources Vite (imports ES). `true` : charge les bundles `dist/` (suffixe `.min` si minifiés) — accueil (`search-engine` / `location-search`), carte (`entree-carto` + `createStandardViewer`), `/geometry-editor`, `/sketch`. Prérequis : `npm run build` (ou cibles `build:*` concernées). En dev / preview, Vite sert `/dist/` via middleware. |
| `configScriptUrl`        | URL optionnelle de `/map/gpu-client-config.js` (prod, dev, local). Charge les globals `LAYER_CONFIG`, `LEGEND_CONFIG`, … |
| _(GitHub Pages)_         | Build `npm run build:demo:pages` : `dist/js/demo-config.js` pointe automatiquement vers `https://www.geoportail-urbanisme.gouv.fr/map/gpu-client-config.js` (fichier source `public/js/demo-config.js` reste en local `127.0.0.1:8000` pour le dev). |
| `document`               | Document GPU `{ id, type, status, name, bbox? }` — preview WMS + fiche au chargement de **`/map`** (après `gpu-client-config`) |
| `bbox`                   | `[minLon, minLat, maxLon, maxLat]` (EPSG:4326) si pas de handoff recherche depuis `/` ; ignorée si le hash URL contient déjà `lon`/`lat` (permalink) |
| `gpuConfigOverrides`     | Objet fusionné dans `gpu.config` / `config` entree-carto                                                                 |
| `map.baseLayerId`        | `carte` \| `carte-nb` \| `photo` \| `mixte` \| `cadastre` \| `blank` (presets gpu)                                       |
| `map.zoom`               | Zoom initial (défaut 6)                                                                                                  |
| `map.layerNodes`         | Catalogue onglet panneau latéral (id, title, visible, legend?)                                                           |
| `map.search`             | Recherche initiale (ignorée si handoff accueil → carte)                                                                  |
| `home.searchPlaceholder` | Placeholder recherche sur `/`                                                                                            |
| `home.searchWidget`      | `'search-engine'` (défaut, visuel gpu-site avec Avancée) \| `'location'` (autocomplete léger, sans geopf)                 |

## Exemples

Voir les blocs commentés en bas de `public/js/demo-config.js` (environnements gpu-site, jeux DU / SUP / SCOT).

## Document preview (`document` + `bbox`)

1. Ouvrir **`http://localhost:5173/map`** (pas seulement `/`).
2. **`configScriptUrl`** doit répondre (ex. gpu-site local `127.0.0.1:8000`) : sans `LAYER_CONFIG` / URLs WMS, pas de couches `_previsu` ni fiche API complète.
3. Au démarrage : emprise `bbox` (ou `document.bbox`), couches WMS filtrées sur `document.name` (partition), fiche territoire au centre de l’emprise si `apiFicheInfoUrl` est présent dans la config GPU.
4. **`document.type`** (et `name` pour les MEC) coche le catalogue comme gpu-client : PLU/POS/CC/PLUi/PSMV → vues d’ensemble + détaillée DU ; SUP → servitudes ; SCoT → schéma de cohérence ; MEC → selon `_DU_` / `_scot_` dans le nom. Prioritaire sur les clés `dev-*` écrites ensuite dans le hash par la carte ; **ignoré** seulement si le hash **à l’ouverture de la page** contenait déjà des paramètres de couches.
4. Vider le hash `#lon=…` dans l’URL ou ouvrir un onglet neuf si l’emprise ne bouge pas (le permalink carte prime sur `bbox`).

## Priorités au chargement `/map`

1. Handoff recherche depuis l’accueil (SPA)
2. Sinon `map.search` ou `bbox` / `document` du fichier JS
3. **Catalogue _Données_** : si le script `configScriptUrl` a défini `window.LAYER_CONFIG`, arbre via `layerConfigToTreeNodes` ; sinon `map.layerNodes` du fichier JS
4. Après chargement du script gpu, fusion de `window.gpu.config` dans le module `config` entree-carto (URLs WMS, etc.) ; les champs `*Url` relatifs (ex. `/api/fiche-info`) et **`legendImageDetailDirectory`** sont résolus par rapport à l’URL du fichier `gpu-client-config.js`, pas l’origine de la SPA (`configUrls.ts`, relu à l’affichage dans `resolveLegendImageDetailDirectory`).

## Limites

- WMS simplifié (`GpuWmsLayerRegistry`) : noms GetMap **identiques** à `LAYER_CONFIG.name` (ex. `dev-document`, préfixe `config.prefix` conservé) ; filtres CQL `filterAttribute` / `filterValue` / `filterValueLike` ; pas de hub zoom gpu-client.
- Avant chargement de `gpu-client-config.js`, un stub `window.gpu.config` est créé pour recevoir `legendImageDetailDirectory` et les URLs WMS.
- **Dev Vite** : les URLs `http://127.0.0.1:8000/…` (ou `localhost:8000`) sont réécrites vers le proxy same-origin `/__gpu_dev_proxy__/…` (`vite.config.ts`) pour éviter _OpaqueResponseBlocking_ sur les légendes et les `fetch` config.
- `LEGEND_CONFIG` : pas encore mappé automatiquement sur l’onglet Légendes.
