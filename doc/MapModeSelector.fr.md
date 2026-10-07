[![en](https://img.shields.io/badge/lang-en-red.svg)](MapModeSelector.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](MapModeSelector.fr.md)

# MapModeSelector

Commutateur de mode **Parcelle** / **Territoire** (aligné gpu-client : permalink `mode=1` ou `mode=2`, **territoire par défaut**).

**Source :** `src/components/map/MapModeSelector.vue`  
**État :** `provideMapMode()` / `useMapMode()` — `src/composables/mapMode.ts`  
**URL :** `src/lib/map/mapMode.ts`

## Interface

- Groupe de boutons segmentés **à droite du SearchEngine** (fond blanc, ombre, coins arrondis — tokens `--ec-map-control-*` ; écart `--ec-map-mode-search-gap`, 0 px par défaut).
- Rendu via **`Teleport` vers `.ol-overlaycontainer-stopevent`** (couche contrôles OL) : `z-index` 2, **sous** les onglets TabPanels (`z-index` 3) et **sous** la surface / feuille mobile TabPanels (`ec-tab-panels-shell`, `z-index` 2).
- **Territoires geopf actif** (`aria-pressed` sur le bouton) : sélecteur masqué (`visibility: hidden`) pour éviter la superposition avec le panneau territoires (mobile notamment).
- Deux options **Parcelle** / **Territoire** : picto + libellé ; inactif = picto et texte bleu France sur blanc ; actif = blanc sur fond bleu France. Pas de libellé « Mode », pas de pastilles radio visibles (entrées `radio` masquées pour l’accessibilité).
- **Mobile** (barre sous la recherche) : même groupe, **icônes seules** (libellés masqués visuellement, toujours dans le DOM pour les lecteurs d’écran).

## Props

| Prop         | Type     | Défaut  | Description                                    |
| ------------ | -------- | ------- | ---------------------------------------------- |
| `modelValue` | `1 \| 2` | inject  | `v-model` optionnel (`1` = parcelle)           |

Sans `modelValue`, utilise le contexte `provideMapMode()` de la vue carte.

## Permalink

- `mode=1` — mode parcelle  
- `mode=2` — mode territoire (défaut si paramètre absent)  
- Changer le sélecteur met à jour le **fragment** (`#mode=…`, `history.replaceState`, sans rechargement). L’ancien `?mode=` est migré dans le hash au chargement.

## Comportement carte

Avec une cerise (`mlon` / `mlat` ou dernier point d’emprise mode), le composant met à jour l’emprise rouge pointillée APICarto et anime la vue pour l’englober (padding recherche lieu). Plafond de zoom : **19** en mode Parcelle (contour parcellaire serré), **15** en mode Territoire (commune). L’emprise lieu geopf (bleu pointillé) reste affichée en parallèle.

- **Restauration permalink** (`MapPermalinkSync`) : cerise + emprise + vol une fois la couche recherche prête.
- **Changement Parcelle / Territoire** (`MapModeSelector`) : vol + refresh fiche pour le mode choisi.

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
