# MapModeSelector

Commutateur de mode **Parcelle** / **Territoire** (aligné gpu-client : permalink `mode=1` ou `mode=2`, **territoire par défaut**).

**Source :** `src/components/map/MapModeSelector.vue`  
**État :** `provideMapMode()` / `useMapMode()` — `src/composables/mapMode.ts`  
**URL :** `src/lib/map/mapMode.ts`

## Interface

- Groupe de boutons segmentés **à droite du SearchEngine** (fond blanc, ombre, coins arrondis — tokens `--ec-map-control-*` ; écart `--ec-map-mode-search-gap`, 0 px par défaut).
- Rendu via **`Teleport` vers `.ol-overlaycontainer-stopevent`** (couche contrôles OL) : `z-index` 2, **sous** les onglets TabPanels (`z-index` 3) et **sous** la surface / feuille mobile TabPanels (`ec-tab-panels-shell`, `z-index` 2).
- **Territoires geopf actif** (`aria-pressed` sur le bouton) : sélecteur masqué (`visibility: hidden`) pour éviter la superposition avec le panneau territoires (mobile notamment).
- Trois options **Coordonnées** / **Parcelle** / **Territoire** : picto + libellé ; inactif = picto et texte bleu France sur blanc ; actif = blanc sur fond bleu France. Pas de libellé « Mode », pas de pastilles radio visibles (entrées `radio` masquées pour l’accessibilité).
- **Mobile** (barre sous la recherche) : même groupe, **icônes seules** (libellés masqués visuellement, toujours dans le DOM pour les lecteurs d’écran).

## Mode Coordonnées (`mode=3`)

- Fiche du **point cliqué uniquement** : même contenu que la fiche parcelle (onglets Infos et Documents), avec les règles au point (`pointFiche`, route `/api/fiche-info/coordonnees`) au lieu de celles de la parcelle entière.
- Titre « Coordonnées » + longitude / latitude ; boutons vers la **parcelle du point** et vers la **commune** ; pas de références cadastrales.
- Pas d’emprise rouge (seulement la cerise) ; le tag « Coordonnées » de la fiche recentre sur la cerise au zoom actuel.
- `mode=3` est propre à entree-carto (inconnu de gpu-client). Nécessite gpu-site avec la route `/coordonnees` ; jamais servi par la requête combinée.

## Modes proposés (config)

Les modes affichés se choisissent par la config ; **par défaut, les trois**.

| Où | Clé | Exemple |
| --- | --- | --- |
| `gpu.createStandardViewer(params)` (intégration gpu-site) | `params.modes` | `modes: [1, 2]` |
| Démo `/map` (`public/js/demo-config.js`) | `map.modes` | `modes: [1, 2]` (réglage actuel : Parcelle et Territoire) |
| Démo « Fiche info » | — | toujours les trois modes |

- Valeurs : `1` Parcelle, `2` Territoire, `3` Coordonnées. Liste vide ou invalide = les trois modes.
- Le sélecteur n’affiche que les modes proposés, dans l’ordre Coordonnées, Parcelle, Territoire. Il est masqué s’il n’en reste qu’un.
- Mode demandé non proposé (permalien `mode=…`, page d’accueil, `params.mode`) : repli sur Territoire, sinon sur le premier mode proposé. L’adresse est corrigée.
- **Fiche info** : un bouton de bascule vers un mode non proposé (« Parcelle AB 0145 », bouton de la commune) est remplacé par le même libellé en texte (`ec-fiche-info__mode-switch-text`). L’aide de la fiche vide ne cite que les modes proposés.
- **Impression** : l’annexe « fiche info parcelle » ou « territoire » n’est proposée que si son mode l’est.

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

Avec une cerise (`mlon` / `mlat` ou dernier point d’emprise mode), le composant met à jour l’emprise rouge pointillée (géométries fiche-info v2) et la fiche, **sans déplacer la vue**. Le recentrage sur l’emprise se fait seulement au clic sur le tag **Parcelle** / **Territoire** de la fiche (« Recentrer sur la parcelle / le territoire » ; plafond de zoom **19** en Parcelle, **15** en Territoire). L’emprise lieu geopf (bleu pointillé) reste affichée en parallèle.

- **Restauration permalink** (`MapPermalinkSync`) : cerise + emprise une fois la couche recherche prête (la vue reste celle du permalien).
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
