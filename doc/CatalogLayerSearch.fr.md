[![en](https://img.shields.io/badge/lang-en-red.svg)](CatalogLayerSearch.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](CatalogLayerSearch.fr.md)

# CatalogLayerSearch

Barre de **recherche** au-dessus de l’arbre catalogue (_Données_).

**Source :** `src/components/layers/CatalogLayerSearch.vue`  
**Utilisé dans :** [LayerCataloguePanel](./TabPanelsControl.fr.md#composants-panneau) → onglet Catalogue → _Données_, au-dessus du bloc **Sélection des données** ([CatalogLayerTree](./CatalogLayerTree.fr.md)).

## Props / events

| Prop / event  | Type                      | Description                                         |
| ------------- | ------------------------- | --------------------------------------------------- |
| `roots`       | `TreeLayerNode[]`         | Racines `LAYER_CONFIG`                              |
| `checkedById` | `Record<string, boolean>` | État coché catalogue                                |
| `mapZoom`     | `number`                  | Zoom carte (grisage hors plage)                     |
| `@toggle`     | `(id, checked)`           | Même effet que l’arbre (`setCatalogChecked`)        |
| `@focus-node` | `(id)`                    | Déplie l’arbre, scroll et surbrillance sur la ligne |

## Comportement

- Champ DSFR `fr-input-group` / `fr-input` (styles globaux `dsfr.min.css`), filtrage à la saisie sans bouton « Rechercher ».
- Filtre **insensible à la casse** sur le **titre** des entrées visibles du sélecteur (`catalogSwitcherDisplayNodes`, sans `onlyLegend`).
- Résultats : même ligne DSFR que l’arbre (`fr-checkbox-group fr-checkbox-group--sm` + `fr-label`) ; clic sur le libellé → focus dans [CatalogLayerTree](./CatalogLayerTree.fr.md) (`pinnedExpandIds`, animation `ec-catalog-tree__row--highlight`) en plus du comportement natif case à cocher.
- Entrées hors plage zoom : classe `ec-not-in-zoom-range`.

## Dépendances

- `src/lib/layerConfig/catalogTreeSearch.ts`
- [CatalogLayerTree](./CatalogLayerTree.fr.md)
