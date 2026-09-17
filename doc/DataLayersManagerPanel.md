# DataLayersManagerPanel

Onglet **Couches de données** : réglage (visibilité, opacité, niveaux de gris, ordre) des entrées **actives sur la carte**, parmi celles cochées dans le catalogue.

**Source :** `src/components/panels/DataLayersManagerPanel.vue`  
**État :** `useManagedLayers` (`src/composables/managedLayers.ts`)  
**Règle d’inclusion :** `shouldShowInDataLayersStack` dans `catalogDataLayersStack.ts`

## Règle d’affichage

| Condition | Couches de données |
| --------- | ------------------ |
| Case cochée + tuile WMS **affichée** sur la carte | **Une ligne** |
| Agrégat WMS actif (`computeMapVisibilityById`) | Ligne **parent** uniquement (enfants cochés mais masqués sur la carte → absents du panneau) |
| `forceOpacity: true` | **Aucune ligne** |
| `hideLayers: true` | Ligne **parent** seule (enfants masqués du sélecteur et du panneau) |
| Dossier virtual sans `hideLayers` | Pas de ligne (seules les feuilles WMS actives apparaissent) |
| `onlyLegend: true` | **Aucune ligne** (légendes → onglet [Légendes](./LayerLegendsPanel.md) si couche active) |

Pas de **lignes** parent ↔ enfant synchronisées dans le panneau. Chaque ligne pilote les tuiles WMS qu’elle représente (`wmsIdsControlledByDataLayersPanelEntry`). Exception **opacité** : si un **agrégat** est la tuile active sur la carte, la valeur est répliquée sur **tout** le sous-arbre catalogue (`catalogIdsForPanelOpacityWhenEntryAdjusted`, nœuds `virtual` inclus) pour conserver le mode agrégat gpu-client (`isSameAsDescendants`).

La **carte** applique les agrégats gpu-client (`computeMapVisibilityById`) ; le panneau suit cette visibilité effective.

## Props / events

| Prop / event | Type | Description |
| ------------ | ---- | ----------- |
| `layers` | `ManagedLayer[]` | Ordre **utilisateur** (`stackDisplayOrderIds`) ; nouvelles couches ajoutées en bas |
| `@visible` | `(id, visible)` | Œil afficher / masquer (WMS contrôlés par la ligne) |
| `@opacity` | `(id, opacity)` | Opacité 0–100 % |
| `@toggle-grayscale` | `(id)` | Niveaux de gris |
| `@remove` | `(id)` | Décoche dans le catalogue |
| `@reorder` | `(fromIndex, toInsertBefore)` | Réordonne la pile ; applique le z-index carte (bas → haut) |

## Ordre et z-index

- **Haut** de la liste = tuile **au-dessus** sur la carte (z-index le plus élevé).
- **Bas** de la liste = tuile **en dessous** (z-index le plus bas).
- Glisser-déposer : poignée à droite du titre, marqueur bleu d’insertion.

## UI

- Titre avec icône **`ri-stack-line`**
- Lignes séparées par bordure ; bouton **Légendes** (`ri-list-indefinite`, contour gris) → onglet Légendes + dépliage / scroll vers la couche (`openLegendForLayer`) ; poignée **`ri-drag-move-2-fill`**

## Dépendances

- Remix Icon, styles `data-layers.css`
- Intégration : [TabPanelsControl](./TabPanelsControl.md)
