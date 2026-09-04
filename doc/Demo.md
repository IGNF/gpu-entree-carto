# Démonstration (Vite)

Pages de démo locale (`npm run dev`) pour valider les contrôles et le parcours accueil → carte.

## Routes

| Route | Vue | Rôle |
|-------|-----|------|
| `/` | `HomeView.vue` | Accueil type gpu-site : `mountSearchEngine` → `/map` (handoff SPA) |
| `/map` | `DemoView.vue` | Carte plein cadre + [TabPanelsControl](./TabPanelsControl.md) + [SketchControl](./SketchControl.md) ; centrage via handoff mémoire |
| `/geometry-editor` | `GeometryEditorView.vue` | Démo [GeometryEditor](./GeometryEditor.md) standalone |
| `/sketch` | `SketchDemoView.vue` | Démo [SketchControl](./SketchControl.md) / bundle `entree-carto-sketch` (encart options + carte) |

## Navigation

`DemoHeader.vue` (DSFR) : liens **Accueil**, **Carte**, **Géométries**, **Croquis**.

## Flux localisation

1. Recherche validée sur `/` (`mountSearchEngine` en mode `emit`)
2. `prepareLocationHandoff` (objet `StandardViewerSearch` en mémoire) + `router.push({ name: 'map' })` — **pas** de query, POST ni `sessionStorage`
3. `DemoView` lit `takeLocationHandoff()` → `SearchEngineControl.initialSearch`

Sur **gpu-site** (pages distinctes) : `mode: 'redirect'` + formulaire POST (`municipality`, `position_x`, …) puis injection serveur de `params.search`.

## GitHub Pages

La démo est publiée par le workflow `pages.yml` (branche par défaut) :

1. `npm run build:demo` avec `base` dérivé de `GITHUB_REPOSITORY`
2. Artefact `public/` (+ `404.html` = `index.html` pour le routage SPA)

Après le workflow vert : **Settings → Pages** (source *GitHub Actions*), URL typiquement du type
`https://ignf.github.io/entree-carto/`.

En local, simuler le sous-chemin :

```bash
GITHUB_REPOSITORY=ignf/entree-carto npm run build:demo
npm run preview
```
