# TileLayerSwitcher

Sélecteur de **fonds de plan** en tuiles cliquables (équivalent `TileLayerSwitcherControl` de gpu-client).

**Source :** `src/components/layers/TileLayerSwitcher.vue`  
**Utilisé dans :** onglet 3 de [TabPanelsControl](./TabPanelsControl.md)

## Props

| Prop         | Type                | Description                      |
| ------------ | ------------------- | -------------------------------- |
| `presets`    | `BaseLayerPreset[]` | Fonds (`createBaseLayerPresets`) |
| `modelValue` | `BaseLayerId`       | Fond actif                       |

Émet `update:modelValue` et appelle `setActiveBaseLayer`.

## Comportement

Grille de tuiles (aperçu + label). La tuile active est bordée en bleu France.

## Limites actuelles

- 3 fonds démo (Plan / Ortho / Blanc) — les 6 fonds gpu-client (NB, Mixte, Cadastre…) viendront avec la config Géoplateforme.
- Aperçus CSS (pas encore d’imagettes WMTS `getLayerImageUrl`).
