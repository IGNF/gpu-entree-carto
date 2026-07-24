# Documentation des contrôles carte

Chaque contrôle / composant cartographique a une page Markdown ici.  
À chaque ajout ou modification de contrôle : **mettre à jour la page associée** (description, options, détails pertinents).

## Intégration site tiers

- [Intégration gpu-site](./INTEGRATION.md) — remplacement de gpu-client, `dist/`, limites actuelles
- [Équivalents gpu-client ↔ IGNF](./GPU_CLIENT_EQUIVALENTS.md) — matrice fonctionnalités / vue-components / geopf / entree-carto IGNF
- [Démonstration](./Demo.md) — pages `/` (localisation), `/map` (carte), `/geometry-editor` + nav DSFR

## Contrôles

| Contrôle | Fichier source | Documentation |
|----------|----------------|---------------|
| MapShell | `src/components/map/MapShell.vue` | [MapShell.md](./MapShell.md) |
| ZoomControl | `src/components/map/ZoomControl.vue` | [ZoomControl.md](./ZoomControl.md) |
| FullScreenControl | `src/components/map/FullScreenControl.vue` | [FullScreenControl.md](./FullScreenControl.md) |
| ScaleLineControl | `src/components/map/ScaleLineControl.vue` | [ScaleLineControl.md](./ScaleLineControl.md) |
| SearchEngineControl | `src/components/map/SearchEngineControl.vue` | [SearchEngineControl.md](./SearchEngineControl.md) |
| mountSearchEngine | `src/lib/mountSearchEngine.ts` | [mountSearchEngine.md](./mountSearchEngine.md) |
| LocationSearchWidget | `src/components/search/LocationSearchWidget.vue` | [LocationSearchWidget.md](./LocationSearchWidget.md) |
| OverviewMapControl | `src/components/map/OverviewMapControl.vue` | [OverviewMapControl.md](./OverviewMapControl.md) |
| TerritoriesControl | `src/components/map/TerritoriesControl.vue` | [TerritoriesControl.md](./TerritoriesControl.md) |
| TabPanelsControl | `src/components/map/TabPanelsControl.vue` | [TabPanelsControl.md](./TabPanelsControl.md) |
| TileLayerSwitcher | `src/components/layers/TileLayerSwitcher.vue` | [TileLayerSwitcher.md](./TileLayerSwitcher.md) |
| TreeLayerSwitcher | `src/components/layers/TreeLayerSwitcher.vue` | [TreeLayerSwitcher.md](./TreeLayerSwitcher.md) |
| BaseLayerSwitcher | `src/components/map/BaseLayerSwitcher.vue` | [BaseLayerSwitcher.md](./BaseLayerSwitcher.md) |
| GeometryEditor (standalone) | `src/geometry-editor/` | [GeometryEditor.md](./GeometryEditor.md) |
