[![en](https://img.shields.io/badge/lang-en-red.svg)](MapModeSelector.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](MapModeSelector.fr.md)

# MapModeSelector

Commutateur de mode **Parcelle** / **Territoire** (aligné gpu-client : permalink `mode=1` ou `mode=2`, **territoire par défaut**).

**Source :** `src/components/map/MapModeSelector.vue`  
**État :** `provideMapMode()` / `useMapMode()` — `src/composables/mapMode.ts`  
**URL :** `src/lib/map/mapMode.ts`

## Interface

- Barre sombre **à droite du SearchEngine** (coins droits, sans `border-radius` sur `.ec-map-mode-selector`)
- Libellé **Mode** + deux cartes **radio** : icônes SVG gpu-client **Parcelle** / **Territoire** (`fill` : `--light-options-primary-color-sun-113-blue-france-sun-113`)
- Fond bleu clair identique pour les deux cartes ; carte sélectionnée : bordure bleue, pastille radio pleine ; pastille **semi-transparente** si non sélectionnée

## Props

| Prop         | Type     | Défaut  | Description                                    |
| ------------ | -------- | ------- | ---------------------------------------------- |
| `modelValue` | `1 \| 2` | inject  | `v-model` optionnel (`1` = parcelle)           |

Sans `modelValue`, utilise le contexte `provideMapMode()` de la vue carte.

## Permalink

- `mode=1` — mode parcelle  
- `mode=2` — mode territoire (défaut si paramètre absent)  
- Changer le sélecteur met à jour le **fragment** (`#mode=…`, `history.replaceState`, sans rechargement). L’ancien `?mode=` est migré dans le hash au chargement.

## Intégration

```vue
<script setup lang="ts">
import { provideMapMode } from '@/composables/mapMode'
import MapModeSelector from '@/components/map/MapModeSelector.vue'
import '@/styles/map-mode-selector.css'

provideMapMode({ initial: 2 })
</script>

<template>
  <MapShell>
    <MapModeSelector />
    …
  </MapShell>
</template>
```

Présent sur la démo `/map` et `EmbedMapViewer` (`createStandardViewer`).

## Dépendances

- Enfant de `MapShell` (positionnement absolu)
- À venir : contenu onglet fiche et clic info selon `useMapMode()`
