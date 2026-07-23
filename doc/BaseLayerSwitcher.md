# BaseLayerSwitcher

Sélecteur de fond de plan (radio DSFR). Bascule la visibilité des presets créés par `createBaseLayerPresets()`.

**Source :** `src/components/map/BaseLayerSwitcher.vue`  
**Helpers :** `src/ol/baseLayers.ts`

## Props

| Prop | Type | Description |
|------|------|-------------|
| `presets` | `BaseLayerPreset[]` | Liste des fonds (`id`, `label`, `layer`) |
| `modelValue` | `BaseLayerId` | Fond actif : `'plan' \| 'ortho' \| 'blank'` |

## Événements

| Événement | Payload | Description |
|-----------|---------|-------------|
| `update:modelValue` | `BaseLayerId` | Émis au changement de fond (v-model) |

## Fonds disponibles (démo)

| Id | Libellé | Source |
|----|---------|--------|
| `plan` | Plan IGN | WMTS Géoplateforme PLANIGNV2 |
| `ortho` | Ortho | WMTS ORTHOIMAGERY.ORTHOPHOTOS |
| `blank` | Blanc | Couche vectorielle fond blanc |

## Notes

- Composant UI panneau (pas un contrôle OL natif).
- À terme : remplacer / enrichir via extensions Géoplateforme.
