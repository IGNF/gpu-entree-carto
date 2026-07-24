# TabPanelsControl

Panneau latéral à **4 onglets** (contrôle OpenLayers), à droite de la carte.

**Source :** `src/components/map/TabPanelsControl.vue`  
**Styles :** `src/styles/tab-panels.css`  
**API :** `src/composables/tabPanels.ts`  
**Référence :** [gpu-client `TabsPanelsControl`](https://gitlab.gpf-tech.ign.fr/gpu/gpu-client) + captures `_local/captures/` + Figma GPU UX-UI (`node-id=310-7048`)

## Comportement

- **Fermé par défaut** : pile verticale de 4 boutons-onglets **collés** (48×48, ombre sur le groupe, comme zoom +/- sans gutter). Les styles battent `.ol-control button` d’OpenLayers (`1.375em`).
- Pas de bordure / inset blanc sur l’état actif (fond bleu plein).
- **Ouvert** : panneau (~612 px, 1,5× la largeur Figma ~408 px) à droite ; les boutons sont **collés** au bord gauche du panneau (pas d’écart).
- Clic sur un onglet : active cet onglet et ouvre le panneau ; clic sur l’onglet déjà actif : ferme.
- Un seul onglet actif à la fois.
- À l’ouverture, `.ec-map-shell--tab-panels-open` décale zoom, plein écran et échelle de `--ec-tab-panels-inset` (= largeur panneau) + le même `--ec-widget-gap` qu’au bord de carte lorsque le panneau est fermé.

## Onglets

| # | Icône DSFR | Contenu |
|---|------------|---------|
| 0 | `fr-icon-map-pin-2-line` (localisation) | Fiche info — texte « Aucune sélection… » ou données de localisation |
| 1 | `fr-icon-road-map-line` | Vide (réservé) |
| 2 | `fr-icon-layout-grid-line` | `TileLayerSwitcher` + `TreeLayerSwitcher` (+ légende) |
| 3 | `fr-icon-list-unordered` | Attributs bruts de la sélection |

Mapping gpu-client (3 onglets) → entree-carto (4) : fiche → 0, *(nouveau vide)* → 1, couches → 2, raw → 3.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `basePresets` | `BaseLayerPreset[]` | Fonds pour le TileLayerSwitcher |
| `baseModelValue` | `BaseLayerId` | Fond actif (`v-model:base-model-value`) |
| `layerNodes` | `TreeLayerNode[]` | Arbre / stubs pour TreeLayerSwitcher |

## API (`TabPanelsApi`)

Exposée via `provide`, `defineExpose`, et `tabPanelsApiRef` (accès sibling, ex. SearchEngine) :

- `openTab(index)` / `closePanels()`
- `showSelection({ title, bodyHtml?, raw? })` — remplit onglets 0 et 3, ouvre l’onglet 0
- `clearSelection()`
- refs : `isOpen`, `activeTab`, `selection`

## Intégration localisation

`SearchEngineControl` appelle `showSelection` après `initialSearch` (accueil → carte). GetFeatureInfo branchera plus tard sur la même API.

## Dépendances

- Enfant de `MapShell` (injection `olMap`)
- Icônes DSFR (`utility/icons`)
- Composants : `FicheInfoPanel`, `RawInfoPanel`, `TileLayerSwitcher`, `TreeLayerSwitcher`
