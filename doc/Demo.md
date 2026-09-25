# Démonstration (Vite)

Pages de démo locale (`npm run dev`) pour valider les contrôles et le parcours accueil → carte.

## Configuration (`demo-config.js`)

Comme gpu-client `exemple-config.js` : éditer **`public/js/demo-config.js`** (`window.DEMO_CONFIG`) pour URL `gpu-client-config`, document, bbox, surcharges API, couches catalogue, etc. — sans rebuild. Voir [DemoConfig.md](./DemoConfig.md).

## Routes

| Route              | Vue                      | Rôle                                                                                                                                                                                                                |
| ------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                | `HomeView.vue`           | Accueil type gpu-site (`GpuHomeBanner` : titre, badge CONSULTER, décor DSFR) ; widget localisation ou `mountSearchEngine` selon `home.searchWidget` → `/map` (handoff SPA). Si `useMinimified: true` : bundles `dist/` au lieu des imports Vite. |
| `/map`             | `DemoView.vue`           | Carte plein cadre + [TabPanelsControl](./TabPanelsControl.md) + [SketchControl](./SketchControl.md) ; centrage via handoff mémoire ; bouton temporaire **Notif test** (notifications [Notivue](./Notifications.md)). Si `useMinimified: true` : `entree-carto[.min].js` + `#gpu-map-container` / `gpu.createStandardViewer`. |
| `/geometry-editor` | `GeometryEditorView.vue` | Démo [GeometryEditor](./GeometryEditor.md) standalone (`EntreeCartoGeometryEditor` si `useMinimified`)                                                                                                                                                               |
| `/sketch`          | `SketchDemoView.vue`     | Démo [SketchControl](./SketchControl.md) / `EntreeCartoSketch.mountSketch` si `useMinimified` (encart options + carte)                                                                                                                    |

## Navigation

`DemoHeader.vue` (DSFR) : liens **Accueil**, **Carte**, **Géométries**, **Croquis**.

## Flux localisation

1. Recherche validée sur `/` (`LocationSearchWidget` ou `mountSearchEngine` selon `demo-config`)
2. `prepareLocationHandoff` (objet `StandardViewerSearch` en mémoire) + `router.push({ name: 'map' })` — **pas** de query, POST ni `sessionStorage`
3. `DemoView` lit `takeLocationHandoff()` → `SearchEngineControl.initialSearch`

Sur **gpu-site** (pages distinctes) : `mode: 'redirect'` + formulaire POST (`municipality`, `position_x`, …) puis injection serveur de `params.search`.

## GitHub Pages

La démo est publiée par le workflow `pages.yml` (branche par défaut) :

1. `npm run build:demo:pages` (`base` dérivé de `GITHUB_REPOSITORY`, `configScriptUrl` → prod GPU)
2. Artefact `public/` (+ `404.html` = `index.html` pour le routage SPA)

Après le workflow vert : **Settings → Pages** (source _GitHub Actions_), URL typiquement du type
`https://ignf.github.io/entree-carto/`. Les GeoJSON limites admin sont servis sous
`{BASE_URL}json-data/` (pas à la racine du domaine `ignf.github.io/json-data/…`).

En local, simuler GitHub Pages (même `base` au **build** et au **preview**) :

```bash
npm run serve:pages
```

Puis ouvrir l’URL affichée par Vite (ex. `http://localhost:4173/gpu-entree-carto/`), pas la racine `http://localhost:4173/`.

Équivalent manuel (adapter `GITHUB_REPOSITORY` au dépôt) :

```bash
GITHUB_REPOSITORY=ignf/gpu-entree-carto npm run build:demo
GITHUB_REPOSITORY=ignf/gpu-entree-carto npm run preview
```

Si le build Pages a été fait avec `GITHUB_REPOSITORY` mais `npm run preview` sans, les assets renvoient du HTML → erreurs MIME en console.

### Build local (`make build`)

`vite` utilise `base: './'` (chemins relatifs) pour servir la démo via **`npm run preview`**.

**Ne pas** ouvrir `dist/index.html` en `file://` : Firefox et Chrome **bloquent les modules ES** (`type="module"`) en local fichier — erreurs CORS / « URI non autorisée », même avec des chemins `./assets/` corrects. Une page d’aide s’affiche si vous essayez quand même.

Après `make build` : **`npm run preview`** puis `http://localhost:4173/`.
