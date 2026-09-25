[![en](https://img.shields.io/badge/lang-en-red.svg)](DataLayersManagerPanel.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](DataLayersManagerPanel.fr.md)

# DataLayersManagerPanel

Onglet **Couches de données** : réglage (visibilité, opacité, niveaux de gris, ordre) des entrées **actives sur la carte**, parmi celles cochées dans le catalogue.

**Source :** `src/components/panels/DataLayersManagerPanel.vue`  
**État :** `useManagedLayers` (`src/composables/managedLayers.ts`)  
**Règle d’inclusion :** `shouldShowInDataLayersStack` dans `catalogDataLayersStack.ts`

## Règle d’affichage

| Condition                                         | Couches de données                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Case cochée + tuile WMS **affichée** sur la carte | **Une ligne**                                                                                                                                                                                                                                                                                                                                                              |
| Agrégat WMS actif (`computeMapVisibilityById`)    | Ligne **parent** uniquement ; **Détailler** (`ri-list-unordered`, à gauche de Légendes) → tuiles **enfants directs** séparées (le détail **ne se désactive pas** si les opacités redeviennent identiques — pas de regroupement automatique) ; **Regrouper** (`ri-separator`, sur chaque enfant direct) → une seule ligne parent, opacité **mémorisée au détail** appliquée à tout le sous-arbre, **recoche** les entrées catalogue du sous-arbre (ex. couche retirée du panneau) ; visibilité / grisé déduits des enfants |
| `forceOpacity: true`                              | **Aucune ligne** dans le panneau ; tuile WMS toujours **au-dessus** des autres (z-index max, non affectée par le drag des couches visibles)                                                                                                                                                                                                                                |
| `hideLayers: true`                                | Ligne **parent** seule (enfants masqués du sélecteur et du panneau)                                                                                                                                                                                                                                                                                                        |
| Dossier virtual sans `hideLayers`                 | Pas de ligne (seules les feuilles WMS actives apparaissent)                                                                                                                                                                                                                                                                                                                |
| `onlyLegend: true`                                | **Une ligne** si cochée et tuile active (ex. schéma de cohérence) ; absent du sélecteur catalogue mais pilotable ici (opacité, œil, retrait)                                                                                                                                                                                                                               |

Pas de **lignes** parent ↔ enfant synchronisées dans le panneau. Chaque ligne pilote les tuiles WMS qu’elle représente (`wmsIdsControlledByDataLayersPanelEntry`). Exception **opacité** : si un **agrégat** est la tuile active sur la carte, la valeur est répliquée sur **tout** le sous-arbre catalogue (`catalogIdsForPanelOpacityWhenEntryAdjusted`, nœuds `virtual` inclus) pour conserver le mode agrégat gpu-client (`isSameAsDescendants`).

La **carte** applique les agrégats gpu-client (`computeMapVisibilityById`) ; le panneau suit cette visibilité effective.

Les lignes **hors plage** `minZoomLevel` / `maxZoomLevel` (LAYER_CONFIG) sont **grisées** comme dans le TreeLayerSwitcher gpu-client (`catalogLayerZoomRange.ts`, classe `ec-not-in-zoom-range`).

## Props / events

| Prop / event               | Type                          | Description                                                                                                                                                                               |
| -------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layers`                   | `ManagedLayer[]`              | Ordre par **clés de tri** (`stackSortKeyById`, drag) ; entrées décochées **conservent** leur clé ; le drag ne réordonne que les couches actives ; recocher → position catalogue préservée |
| `@visible`                 | `(id, visible)`               | Œil afficher / masquer (WMS contrôlés par la ligne)                                                                                                                                       |
| `@opacity`                 | `(id, opacity)`               | Opacité 0–100 %                                                                                                                                                                           |
| `@toggle-grayscale`        | `(id)`                        | Niveaux de gris                                                                                                                                                                           |
| `@remove`                  | `(id)`                        | Décoche dans le catalogue                                                                                                                                                                 |
| `@reorder`                 | `(fromIndex, toInsertBefore)` | Réordonne la pile ; applique le z-index carte (bas → haut)                                                                                                                                |
| `@enable-aggregate-detail` | `(aggregateId)`               | Active le mode **détaillé** (`splitAggregateIds`, snapshot opacité / visibilité / grisé)                                                                                                  |
| `@regroup-aggregate`       | `(aggregateId)`               | Regroupe l’agrégat et désactive le mode détaillé                                                                                                                                          |
| (détail activé)            | —                             | Les clés de tri (`catalogStackDisplayOrder`) **remplacent** l’agrégat par ses **enfants directs contigus**, dans l’**ordre catalogue** (plus d’éclatement dans la pile globale)           |

## Ordre et z-index

- **Haut** de la liste = tuile **au-dessus** sur la carte (z-index le plus élevé).
- **Bas** de la liste = tuile **en dessous** (z-index le plus bas).
- Glisser-déposer : poignée à droite du titre, marqueur bleu d’insertion.

## UI

- Titre avec icône **`ri-stack-line`**
- Lignes séparées par bordure ; à droite du titre (avant Légendes) : **Regrouper** (`ri-separator`, enfants en mode détaillé) puis **Détailler** (`ri-list-unordered`, agrégats) ; bouton **Légendes** (`ri-list-indefinite`) ; poignée **`ri-drag-move-2-fill`**

## Dépendances

- Remix Icon, styles `data-layers.css`
- Intégration : [TabPanelsControl](./TabPanelsControl.fr.md)
