# TreeLayerSwitcher

Sélecteur de **couches métier** en arbre avec **légende intégrée** (équivalent `TreeLayerSwitcherControl` + légendes gpu-client).

**Source :** `src/components/layers/TreeLayerSwitcher.vue`  
**Utilisé dans :** onglet 3 de [TabPanelsControl](./TabPanelsControl.md)

## Props / events

| Prop / event | Type              | Description                                              |
| ------------ | ----------------- | -------------------------------------------------------- |
| `nodes`      | `TreeLayerNode[]` | Nœuds (`id`, `title`, `visible`, `legend?`, `children?`) |
| `@toggle`    | `(id, visible)`   | Changement de visibilité                                 |

## Comportement

- Cases à cocher par couche.
- Si la couche est visible et a une `legend`, affichage des entrées (swatch / image + titre) sous le nœud.

## Limites actuelles

- Nœuds plats / stubs en démo.
- Pas encore de parsing `layerConfig` / `legendConfig` / `legendReferences` depuis `/map/gpu-client-config.js`.
- Pas d’opacité ni de zoom-range (à porter depuis gpu-client).
