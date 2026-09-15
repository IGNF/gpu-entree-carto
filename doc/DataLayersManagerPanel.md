# DataLayersManagerPanel

Onglet **Couches de données** du panneau latéral : pile des couches cochées dans le catalogue (ordre d’empilement, visibilité, opacité).

**Source :** `src/components/panels/DataLayersManagerPanel.vue`  
**Styles :** `src/styles/data-layers.css`  
**État :** `useManagedLayers` (`src/composables/managedLayers.ts`)  
**Intégré dans :** [TabPanelsControl](./TabPanelsControl.md)

## Props / events

| Prop / event | Type | Description |
| ------------ | ---- | ----------- |
| `layers` | `ManagedLayer[]` | Couches dans la pile (`stackLayers`, ordre carte = inverse liste) |
| `@visible` | `(id, visible)` | Affichage / masquage (icône œil) |
| `@opacity` | `(id, opacity)` | Curseur opacité 0–100 % |
| `@reset-opacity` | `(id)` | Contraste par défaut → `defaultOpacity` (100) |
| `@remove` | `(id)` | Retire la couche de la pile (poubelle) |
| `@reorder` | `(fromIndex, toIndex)` | Réordonne la pile (indices liste UI, haut = dessus) |

## UI (Figma GPU UX/UI)

- Titre avec icône **`ri-stack-line`** (aligné sur l’onglet latéral).
- Par couche : titre + bouton **Légendes** (si entrées `legend`) + poignée **`ri-drag-move-2-fill`** (à droite) pour glisser-déposer et modifier le z-index carte (`gpuWmsLayerRegistry.applyStackOrder`).
- Barre horizontale : **œil** (`ri-eye-line` / `ri-eye-off-line`), **poubelle** (`ri-delete-bin-line`), **contraste** (`ri-contrast-fill`), curseur DSFR (`fr-range`) + pourcentage.

## Dépendances

- Remix Icon (`remixicon.css` déjà chargé sur la démo).
- Bouton légendes : classes DSFR `fr-btn`.
