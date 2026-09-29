[![en](https://img.shields.io/badge/lang-en-red.svg)](MapPermalink.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](MapPermalink.fr.md)

# Permalink carte (gpu-client)

Fragment d’URL (`#…`) synchronisé avec l’état carte, comme `PermalinkControl` gpu-client. Le mode `mode=1|2` est dans le hash ([MapModeSelector](./MapModeSelector.fr.md)) ; l’ancien `?mode=` en query est lu une fois puis retiré.

**Bibliothèque :** `src/lib/map/mapPermalink.ts`  
**Composant sync :** `src/components/map/MapPermalinkSync.vue`  
**Pont couches :** `TabPanelsControl` → `mapPermalinkLayersBridgeRef`

## Paramètres hash

| Clé | Description |
| --- | ----------- |
| `lon`, `lat` | Centre vue (WGS84), **8 décimales** max dans le hash |
| `z` | Niveau de zoom (`zoom` accepté en lecture) |
| `tile` | Index fond de plan **1…n** (ordre `gpuBasePresets`) |
| `mlon`, `mlat` | Point cerise / fiche (WGS84), **8 décimales** max |
| `mode` | Parcelle / territoire (`1` / `2`) |
| *id couche* | État couche catalogue (ci-dessous) |

Mises à jour **debouncées** (300 ms) sur `moveend`, sur les changements **catalogue / Couches de données** (`TabPanelsControl`) et sur le **fond de plan** (`tile`). `mlon`/`mlat` : flush immédiat au déplacement de la cerise.

Les clés et valeurs de couche sont **encodées** (`encodeURIComponent`), y compris les `,` et `%` des identifiants gpu-client. Les hash legacy non encodés sont **normalisés** au chargement (compatibilité Vue Router).

## Clés couche

Dernier segment du chemin gpu-client (`pathToPermalinkId`), ex. `prescription,prescription_psmv021319505199`.

Valeur : `v:w:x:y:z` (gpu-client)

| Champ | Signification |
| ----- | ------------- |
| `v` | Case catalogue — `1` coché, `0` décoché. Clé absente → défaut **LAYER_CONFIG** ; `0:…` = décoché explicite. |
| `w` | Opacité `0`–`1` (curseur Couches de données) |
| `x` | Ordre dans la pile (0 = haut ; poignée « Glisser… ») |
| `y` | Niveaux de gris — `0` couleur, `1` gris |
| `z` | Affichage carte — `1` visible, `0` masquée (bouton Masquer/Afficher) |

Ancien format **4** segments `v:w:x:y` encore lu (`y` = gris ; `z` = `1` si `v=1`).

Exemple :

```text
#lon=2.35&lat=48.85&z=14&tile=1&mode=2&scot=1:0.8:8:0:1&prescription,prescription_psmv021319505199=1:0.7:2:0:1
```

## Restauration au chargement

1. Vue + `tile` depuis le hash  
2. Couches via `TabPanelsControl` si `LAYER_CONFIG` est disponible  
3. `mlon`/`mlat` → cerise + fiche (sauf `skipMarkerRestore` si `initialSearch` est défini)

## Intégration

```vue
<MapShell>
  <TabPanelsControl … />
  <MapPermalinkSync :skip-marker-restore="Boolean(initialSearch?.fullText)" />
</MapShell>
```

```typescript
provideMapPermalinkUi({
  presets: gpuBasePresets,
  getActiveBaseId: () => activeBase.value,
  setActiveBaseId: onUpdateBase,
  activeBaseIdRef: activeBase,
})
```
