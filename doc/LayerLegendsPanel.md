# LayerLegendsPanel

Onglet **Légendes** du panneau latéral : symboles des couches **visibles** dans la pile « Couches de données ».

**Source :** `src/components/panels/LayerLegendsPanel.vue`  
**Utilisé dans :** [TabPanelsControl](./TabPanelsControl.md) (onglet 3)

## Props

| Prop | Type | Description |
| ---- | ---- | ----------- |
| `layers` | `ManagedLayer[]` | Couches `inStack` et `visible` (fourni par `useManagedLayers.legendLayers`) |

## Comportement

- Titre avec icône Remix `ri-list-indefinite` (aligné sur le bouton d’onglet).
- Un bloc par couche : titre + liste d’entrées `LegendItem` (`title`, `imageUrl` optionnel).
- Pas de réglage d’opacité ici (réservé à [DataLayersManagerPanel](./DataLayersManagerPanel.md)).
- URLs d’images : **`legendImageDetailDirectory`** (injecté dans `gpu.config` par `gpu-client-config.js`, aussi fusionné dans `@/lib/config`) + chemin relatif de l’image + `.png`, comme gpu-client `LegendImages#getUrl`.
- Symboles dérivés de `LEGEND_CONFIG` / `LEGEND_REFERENCES` (`gpuLegendItems.ts`, aligné gpu-client `CreateTreeLayerSwitcherItems`) : chemins filtrés `info_surf/05`, sous-filtres `hasfilter2`, blocs « other », etc.
- **`scaleDependant`** : suffixe `-lowscale` / `-highscale` recalculé à partir du **zoom courant** de la carte (écoute `change:resolution` sur la vue OL).

## Dépendances

- Types : `@/types/stubs` (`LegendItem`), `@/composables/managedLayers`
- Config : `legendImageDetailDirectory` dans `gpu.config` après chargement du script GPU
