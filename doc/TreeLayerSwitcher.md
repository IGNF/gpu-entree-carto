# TreeLayerSwitcher

Sélecteur de **couches métier** en arbre avec **légende intégrée** (équivalent `TreeLayerSwitcherControl` + légendes gpu-client).

**Source :** `src/components/layers/TreeLayerSwitcher.vue`  
**Utilisé dans :** onglets _Couches de données_ / _Légendes_ de [TabPanelsControl](./TabPanelsControl.md). Le catalogue _Données_ utilise [CatalogLayerTree](./CatalogLayerTree.md).

## Props / events

| Prop / event  | Type                      | Description                                                           |
| ------------- | ------------------------- | --------------------------------------------------------------------- |
| `nodes`       | `TreeLayerNode[]`         | Nœuds (`id`, `title`, `visible`, `legend?`, `children?`)              |
| `variant`     | `'full' \| 'catalog'`     | `catalog` : checkbox + titre uniquement (pas de légende sous le nœud) |
| `checkedById` | `Record<string, boolean>` | État coché en mode catalogue (sinon `node.visible`)                   |
| `@toggle`     | `(id, visible)`           | Changement de case                                                    |

## Comportement

- Cases à cocher par couche.
- **`full`** : si la couche est visible et a une `legend`, affichage des entrées sous le nœud.
- **`catalog`** : liste minimale type gpu-client TreeLayerSwitcher (sans légende intégrée).

## Limites actuelles

- Parsing `LAYER_CONFIG` → arbre : voir `layerConfigToTree.ts` et [CatalogLayerTree](./CatalogLayerTree.md).
- Pas d’opacité ni de zoom-range dans l’arbre catalogue (à porter depuis gpu-client).
