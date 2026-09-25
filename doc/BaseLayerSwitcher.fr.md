[![en](https://img.shields.io/badge/lang-en-red.svg)](BaseLayerSwitcher.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](BaseLayerSwitcher.fr.md)

# BaseLayerSwitcher

Sélecteur de fond de plan (radio DSFR). Bascule la visibilité des presets créés par `createBaseLayerPresets()`.

**Source :** `src/components/map/BaseLayerSwitcher.vue`  
**Helpers :** `src/ol/baseLayers.ts`

## Props

| Prop         | Type                | Description                                 |
| ------------ | ------------------- | ------------------------------------------- |
| `presets`    | `BaseLayerPreset[]` | Liste des fonds (`id`, `label`, `layer`)    |
| `modelValue` | `BaseLayerId`       | Fond actif : `'plan' \| 'ortho' \| 'blank'` |

## Événements

| Événement           | Payload       | Description                          |
| ------------------- | ------------- | ------------------------------------ |
| `update:modelValue` | `BaseLayerId` | Émis au changement de fond (v-model) |

## Fonds disponibles (démo)

| Id      | Libellé  | Source                        |
| ------- | -------- | ----------------------------- |
| `plan`  | Plan IGN | WMTS Géoplateforme PLANIGNV2  |
| `ortho` | Ortho    | WMTS ORTHOIMAGERY.ORTHOPHOTOS |
| `blank` | Blanc    | Couche vectorielle fond blanc |

## Notes

- Ancien sélecteur radio du panneau aside démo.
- **Préférer** [TileLayerSwitcher](./TileLayerSwitcher.fr.md) dans l’onglet couches du [TabPanelsControl](./TabPanelsControl.fr.md).
- À terme : enrichir via extensions Géoplateforme (6 fonds gpu-client).
