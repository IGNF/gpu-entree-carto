# CatalogLayerTree

Arbre **checkbox** du catalogue *Données* (équivalent gpu-client `TreeLayerSwitcherControl` / `CreateTreeLayerSwitcherItems`).

**Source :** `src/components/layers/CatalogLayerTree.vue`  
**Construction de l’arbre :** `src/lib/layerConfig/layerConfigToTree.ts` ← `window.LAYER_CONFIG`  
**Utilisé dans :** [LayerCataloguePanel](./TabPanelsControl.md#composants-panneau) → onglet Catalogue → *Données*

## Props / events

| Prop / event | Type | Description |
| ------------ | ---- | ----------- |
| `nodes` | `TreeLayerNode[]` | Racine de l’arbre (`children`, `defaultCollapsed`, `gpuVirtual`, …) |
| `checkedById` | `Record<string, boolean>` | État « dans la pile » (catalogue), piloté par `useManagedLayers` |
| `@toggle` | `(id, inStack)` | Case cochée / décochée |

## Comportement

- Nœuds repliables (`defaultCollapsed` si `hideLayers` dans la config gpu).
- Pas de légende sous le nœud (légendes → onglet 4).
- Les feuilles avec couche WMS sont synchronisées via `layerMapHooks` (`GpuWmsLayerRegistry` en démo `/map`).

## Dépendances

- Types `TreeLayerNode` : `TreeLayerSwitcher.vue`
- Config distante : `configScriptUrl` dans [DemoConfig.md](./DemoConfig.md)
