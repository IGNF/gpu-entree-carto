[![en](https://img.shields.io/badge/lang-en-red.svg)](BaseLayerRadioList.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](BaseLayerRadioList.fr.md)

# BaseLayerRadioList

Liste verticale de **boutons radio** pour les fonds de plan, avec **vignette** et **description repliable** (équivalent gpu-client `TileLayerSwitcherControl`).

**Source :** `src/components/layers/BaseLayerRadioList.vue`  
**Presets :** `src/ol/gpuBaseLayerPresets.ts` (`createGpuBaseLayerEnvironment`)  
**Utilisé dans :** [LayerCataloguePanel](./TabPanelsControl.fr.md#composants-panneau) → onglet Catalogue → _Fonds de cartes_

## Props / events

| Prop / event         | Type                   | Description                                                                       |
| -------------------- | ---------------------- | --------------------------------------------------------------------------------- |
| `presets`            | `GpuBaseLayerPreset[]` | id, label, `description`, `stack` (pile `mainLayers`), `thumbnailLayers` dérivées |
| `modelValue`         | `GpuBaseLayerId`       | Fond actif                                                                        |
| `@update:modelValue` | `(id)`                 | Sélection d’un fond                                                               |

## Comportement

- Une seule sélection (pastille `.ec-base-radio`, tokens DSFR bleu France), alignée au centre de la vignette carrée.
- Bouton **caret** (`fr-icon-arrow-*-s-line`) à droite du titre : affiche/masque sous-titre + description (HTML dans `description`, rendu via `SanitizedHtml` / DOMPurify).
- **Titre** (label) en gris foncé ; **sous-titre** et **description** en gris mention (même teinte).
- Vignettes carrées : empilement de tuiles WMTS (comme gpu-client `TileLayerSwitcher`), coordonnées `[9, 253, -177]`, couches filtrées selon `minResolution` / `maxResolution` au zoom d’aperçu (`gpuBaseLayerThumbnails.ts`). Images `loading="lazy"` / `decoding="async"`.

## Intégration carte

Le parent crée un `GpuBaseLayerEnvironment` (`createGpuBaseLayerEnvironment`), appelle `setActiveGpuBaseLayer(env, id)` et passe `env.allLayers` à `MapShell` (voir `DemoView.vue`). Une seule instance OpenLayers par couche WMTS / limite (pool `mainLayers`, comme gpu-client).

Piles de couches par fond : alignées sur gpu-client `createStandardViewer` / `TileLayerSwitcher` (`cadastreLow`/`cadastreHigh`, limites région/département GeoJSON dans `public/json-data/` (URL via `import.meta.env.BASE_URL` pour GitHub Pages), mixte sans plan IGN). Définition : `src/ol/gpuBaseLayerPresets.ts`, `src/ol/gpuLimitOverlayLayers.ts`.
