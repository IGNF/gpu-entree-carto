# BaseLayerRadioList

Liste verticale de **boutons radio** pour les fonds de plan, avec **vignette** et **description repliable** (équivalent gpu-client `TileLayerSwitcherControl`).

**Source :** `src/components/layers/BaseLayerRadioList.vue`  
**Presets :** `src/ol/gpuBaseLayerPresets.ts` (`createGpuBaseLayerEnvironment`)  
**Utilisé dans :** [LayerCataloguePanel](./TabPanelsControl.md#composants-panneau) → onglet Catalogue → _Fonds de cartes_

## Props / events

| Prop / event         | Type                   | Description                                                                       |
| -------------------- | ---------------------- | --------------------------------------------------------------------------------- |
| `presets`            | `GpuBaseLayerPreset[]` | id, label, `description`, `stack` (pile `mainLayers`), `thumbnailLayers` dérivées |
| `modelValue`         | `GpuBaseLayerId`       | Fond actif                                                                        |
| `@update:modelValue` | `(id)`                 | Sélection d’un fond                                                               |

## Comportement

- Fond **Cadastre** : couches cadastre transparentes posées sur un **fond blanc** (`setActiveGpuBaseLayer`), lisible en thème sombre ; pas sur les autres fonds (le cadastre bas zoom s’y superpose au plan ou à la photo).
- Une seule sélection (pastille `.ec-base-radio`, tokens DSFR bleu France), alignée au centre de la vignette carrée.
- Bouton **caret** (`fr-icon-arrow-*-s-line`) à droite du titre : affiche/masque sous-titre + description (HTML dans `description`, rendu via `SanitizedHtml` / DOMPurify).
- **Titre** (label) en gris foncé ; **sous-titre** et **description** en gris mention (même teinte).
- Vignettes carrées : empilement de tuiles WMTS (comme gpu-client `TileLayerSwitcher`), coordonnées `[9, 253, -177]` dans le TileMatrixSet de chaque couche, couches filtrées selon `minResolution` / `maxResolution` au zoom d’aperçu (`gpuBaseLayerThumbnails.ts`). Images `loading="lazy"` / `decoding="async"`.

## Intégration carte

Le parent crée un `GpuBaseLayerEnvironment` (`createGpuBaseLayerEnvironment`), appelle `setActiveGpuBaseLayer(env, id)` et passe `env.allLayers` à `MapShell` (voir `DemoView.vue`). Une seule instance OpenLayers par couche WMTS / limite (pool `mainLayers`, comme gpu-client).

Sources WMTS (`src/ol/createGeopfWmtsSource.ts`) : tuiles Géoplateforme de 256 px affichées à leur taille nominale, donc au même niveau de tuiles que cartes.gouv.fr à zoom égal (gpu-client agrandit 2× les tuiles du niveau inférieur). Chaque couche utilise le TileMatrixSet déclaré dans les GetCapabilities (`PM_0_19` pour Plan IGN, ortho et PCI Express, `PM_0_20` pour la BD Parcellaire, `PM_6_18` pour noms et routes, `PM_6_16` pour les limites administratives) ; hors de ces niveaux, OpenLayers réutilise le niveau le plus proche. L’aperçu et l’export d’impression utilisent une variante en grille 512 px (`geopfWmtsPrintSource`) pour garder des libellés lisibles sur papier.

Piles de couches par fond : alignées sur gpu-client `createStandardViewer` / `TileLayerSwitcher` (`cadastreLow`/`cadastreHigh`, limites région/département GeoJSON dans `public/json-data/` (`resolveLimitGeoJsonDataRoot` : `BASE_URL` en démo autonome ; gpu-site via `gpu.config.baseUrl` à la racine web, pas sous `/map/`), mixte sans plan IGN). Définition : `src/ol/gpuBaseLayerPresets.ts`, `src/ol/gpuLimitOverlayLayers.ts`.

Limites région/département : GeoJSON téléchargé au premier affichage de la couche (zoom 7 pour les régions, 8 et plus pour les départements), pas au démarrage de la carte ; rendu en image (`VectorImage`) pour garder le déplacement fluide malgré le nombre de sommets. Un échec de chargement est signalé en console sans nouvelle tentative avant rechargement de la page. L’aperçu d’impression partage la même source (`GPU_LIMIT_OVERLAY_PROP`).
