[![en](https://img.shields.io/badge/lang-en-red.svg)](TileLayerSwitcher.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](TileLayerSwitcher.fr.md)

# TileLayerSwitcher

Sélecteur de **fonds de plan** en tuiles cliquables (équivalent `TileLayerSwitcherControl` de gpu-client).

**Source :** `src/components/layers/TileLayerSwitcher.vue`  
**Utilisé dans :** démos / intégrations légères (grille de tuiles). Le panneau Catalogue gpu utilise [BaseLayerRadioList](./BaseLayerRadioList.fr.md).

## Props

| Prop         | Type                | Description                      |
| ------------ | ------------------- | -------------------------------- |
| `presets`    | `BaseLayerPreset[]` | Fonds (`createBaseLayerPresets`) |
| `modelValue` | `BaseLayerId`       | Fond actif                       |

Émet `update:modelValue` et appelle `setActiveBaseLayer`.

## Comportement

Grille de tuiles (aperçu + label). La tuile active est bordée en bleu France.

## Limites actuelles

- Fonds « Plan / Ortho / Blanc » (`createBaseLayerPresets`) — distincts des 6 fonds gpu ([BaseLayerRadioList](./BaseLayerRadioList.fr.md)).
- Aperçus CSS (pas d’imagettes WMTS).
