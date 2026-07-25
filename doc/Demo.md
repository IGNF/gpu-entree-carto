# Démonstration (Vite)

Pages de démo locale (`npm run dev`) pour valider les contrôles et le parcours accueil → carte.

## Routes

| Route | Vue | Rôle |
|-------|-----|------|
| `/` | `HomeView.vue` | Accueil type gpu-site : `mountSearchEngine` → `/map?…` |
| `/map` | `DemoView.vue` | Carte plein cadre + [TabPanelsControl](./TabPanelsControl.md) + [SketchControl](./SketchControl.md) ; centrage si query `municipality` / `position_*` / `type` |
| `/geometry-editor` | `GeometryEditorView.vue` | Démo [GeometryEditor](./GeometryEditor.md) standalone |
| `/sketch` | `SketchDemoView.vue` | Démo [SketchControl](./SketchControl.md) / bundle `entree-carto-sketch` (encart options + carte) |

## Navigation

`DemoHeader.vue` (DSFR) : liens **Accueil**, **Carte**, **Géométries**, **Croquis**.

## Flux localisation

1. Recherche validée sur `/` (`mountSearchEngine` en mode `emit`)
2. Navigation SPA vers `/map` avec query
3. `SearchEngineControl` + `initialSearch` rejoue le géocode geopf (cerise, emprise, popup) et ouvre l’onglet fiche du TabPanels
