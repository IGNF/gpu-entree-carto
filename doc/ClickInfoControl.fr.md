[![en](https://img.shields.io/badge/lang-en-red.svg)](ClickInfoControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](ClickInfoControl.fr.md)

# ClickInfoControl

Clic carte **permanent** qui remplit l’onglet **fiche** (premier onglet du panneau latéral) avec des informations parcelle ou document d’urbanisme, selon le [MapModeSelector](./MapModeSelector.fr.md) (`mode=1` parcelle, `mode=2` territoire).

**Source :** `src/components/map/ClickInfoControl.vue`  
**Service :** `src/lib/fiche/ficheInfoService.ts`  
**Styles :** `src/styles/click-info.css`  
**Verrou croquis :** `src/composables/sketchToolEngaged.ts` (mis à jour par `SketchControl`)

## Comportement

- Écoute `singleclick` OpenLayers sur la carte injectée (`olMap`).
- **Désactivé** tant qu’un outil croquis est actif (dessin, mesure, texte, etc.).
- Ignore les clics sur l’UI (panneaux, recherche, sélecteur de mode, barre croquis, champs de formulaire) et les pixels touchant les couches vectorielles croquis / mesure.
- Appelle `loadFicheForMapPoint({ lon, lat, mode, zoom })` :
  - tente d’abord `config.apiFicheInfoUrl` (`/api/fiche-info`) si disponible ;
  - sinon repli APICarto (`cadastre/parcelle` ou `gpu/document`).
- Ouvre l’onglet fiche via `tabPanelsApiRef.showSelection`.
- Pose la **cerise** geopf dès le `singleclick` (sans bulle popup — fiche dans le panneau), puis charge la fiche en **asynchrone** ; **sans recentrer** la vue.
- Si aucune emprise geopf n’est présente, charge l’emprise **communale** (APICarto `cadastre/commune`) en pointillés sur la couche SearchEngine (`searchResultGraphics`).

## Curseur

Quand le clic info est actif et les croquis inactifs, ajoute `ec-map-shell--click-info` sur `.ec-map-shell`. Le CSS applique un curseur composite pointeur + « i » sur le viewport carte (glyph inspiré Remix).

## Intégration

À monter en frère des autres contrôles sous `MapShell` (après `provideMapMode()`) :

```vue
<script setup lang="ts">
import ClickInfoControl from '@/components/map/ClickInfoControl.vue'
import '@/styles/click-info.css'
</script>

<template>
  <MapShell>
    <TabPanelsControl />
    <SearchEngineControl />
    <ClickInfoControl />
    <MapModeSelector />
    <!-- … -->
  </MapShell>
</template>
```

Sans props. Nécessite `provideMapMode()` sur la même vue pour une fiche adaptée au mode.

## Voir aussi

- [SearchEngineControl](./SearchEngineControl.fr.md) — remplit aussi la fiche après une recherche (`loadFicheForSearch`).
- [TabPanelsControl](./TabPanelsControl.fr.md) — onglet fiche (index 0).
