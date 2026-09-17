# CatalogLayerTree

Arbre **checkbox** du catalogue *Données* (équivalent gpu-client `TreeLayerSwitcherControl` / `CreateTreeLayerSwitcherItems`).

**Source :** `src/components/layers/CatalogLayerTree.vue`  
**Construction de l’arbre :** `src/lib/layerConfig/layerConfigToTree.ts` ← `window.LAYER_CONFIG`  
**Identifiants catalogue :** chemin TLS gpu-client (`name` + valeurs de filtre, pas le seul `title`) — voir `gpu.model.Layer#getOrCreatePath`.  
**Utilisé dans :** [LayerCataloguePanel](./TabPanelsControl.md#composants-panneau) → onglet Catalogue → *Données*

## Props / events

| Prop / event | Type | Description |
| ------------ | ---- | ----------- |
| `nodes` | `TreeLayerNode[]` | Racine de l’arbre (`children`, `defaultCollapsed`, `gpuVirtual`, …) |
| `checkedById` | `Record<string, boolean>` | État coché sur **chaque** entrée (propagation gpu-client) |
| `@toggle` | `(id, checked)` | → `setCatalogChecked` (checkboxes + visibilité WMS) |

## Comportement

- Nœuds repliables (`defaultCollapsed` si `hideLayers` dans la config gpu).
- Pas de légende sous le nœud (légendes → onglet **Légendes**).
- **Propagation checkboxes** (comme `TreeLayerSwitcherItem`) : coche parent → tous les descendants ; coche enfant → parents remontés (OR, hors `onlyLegend`) ; `onlyLegend` suit le parent.
- **Virtual** : pas de tuile WMS agrégée sur le nœud ; les feuilles en dessous portent la carte.
- **Agrégat** (parent non virtual avec WMS + enfants) : si tout le sous-arbre est coché avec la même opacité → une seule requête WMS sur le parent, feuilles masquées sur la carte (perf gpu-client).
- **`hideLayers: true`** : les entrées enfants ne sont pas affichées dans le sélecteur (`hiddenCatalogChildren`) ; le parent virtual les pilote toujours.
- Feuilles WMS : `gpuMapLayer` (y compris **`onlyLegend`** avec `name` — tuile WMS comme gpu-client, sans ligne dans le sélecteur).
- **`onlyLegend`** : masqué dans le sélecteur (`catalogSwitcherDisplayNodes`) ; entrée dans l’index (checkbox synchronisée au parent, légendes, WMS si `name`).
- Paramètres LAYER_CONFIG pris en compte à l’arbre : `visible`, `opacity`, **`forceOpacity`** (opacité figée à **100 %** sur la carte et dans la pile, curseur désactivé), `virtual`, `onlyLegend`, filtres CQL, min/max zoom (WMS), légendes (`LEGEND_*`).
- Synchronisation carte via `layerMapHooks` → `GpuWmsLayerRegistry` (démo `/map`).

## Dépendances

- Types `TreeLayerNode` : `TreeLayerSwitcher.vue`
- Config distante : `configScriptUrl` dans [DemoConfig.md](./DemoConfig.md)
