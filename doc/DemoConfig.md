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
| `configScriptUrl`        | URL optionnelle de `/map/gpu-client-config.js` (prod, dev, local). Charge les globals `LAYER_CONFIG`, `LEGEND_CONFIG`, … |
| `document`               | Document GPU `{ id, type, status, name, bbox? }` — ouvre la fiche info au chargement de `/map`                           |
| `bbox`                   | `[minLon, minLat, maxLon, maxLat]` (EPSG:4326) si pas de handoff recherche depuis `/`                                    |
| `gpuConfigOverrides`     | Objet fusionné dans `gpu.config` / `config` entree-carto                                                                 |
| `map.baseLayerId`        | `carte` \| `carte-nb` \| `photo` \| `mixte` \| `cadastre` \| `blank` (presets gpu)                                       |
| `map.zoom`               | Zoom initial (défaut 6)                                                                                                  |
| `map.layerNodes`         | Catalogue onglet panneau latéral (id, title, visible, legend?)                                                           |
| `map.search`             | Recherche initiale (ignorée si handoff accueil → carte)                                                                  |
| `home.searchPlaceholder` | Placeholder recherche sur `/`                                                                                            |

## Exemples

Voir les blocs commentés en bas de `public/js/demo-config.js` (environnements gpu-site, jeux DU / SUP / SCOT).

## Priorités au chargement `/map`

1. Handoff recherche depuis l’accueil (SPA)
2. Sinon `map.search` ou `bbox` / `document` du fichier JS
3. **Catalogue _Données_** : si le script `configScriptUrl` a défini `window.LAYER_CONFIG`, arbre via `layerConfigToTreeNodes` ; sinon `map.layerNodes` du fichier JS
4. Après chargement du script gpu, fusion de `window.gpu.config` dans le module `config` entree-carto (URLs WMS, etc.)

## Limites

- WMS simplifié (`GpuWmsLayerRegistry`) : noms GetMap **identiques** à `LAYER_CONFIG.name` (ex. `dev-document`, préfixe `config.prefix` conservé) ; filtres CQL `filterAttribute` / `filterValue` / `filterValueLike` ; pas de hub zoom gpu-client.
- Avant chargement de `gpu-client-config.js`, un stub `window.gpu.config` est créé pour recevoir `legendImageDetailDirectory` et les URLs WMS.
- **Dev Vite** : les URLs `http://127.0.0.1:8000/…` (ou `localhost:8000`) sont réécrites vers le proxy same-origin `/__gpu_dev_proxy__/…` (`vite.config.ts`) pour éviter _OpaqueResponseBlocking_ sur les légendes et les `fetch` config.
- `LEGEND_CONFIG` : pas encore mappé automatiquement sur l’onglet Légendes.
