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
| `/fiche-info`      | `FicheDemoView.vue`      | Démo fiche info (voir [Démo fiche info](#démo-fiche-info)) |

## Navigation

`DemoHeader.vue` (DSFR, même schéma que gpu-site) : liens **Accueil**, **Carte**, **Géométries**, **Croquis**, **Fiche info**. En dessous du breakpoint **`lg`**, la barre est masquée ; le bouton **Menu** (`fr-btn--menu`) ouvre la navigation dans la modale `fr-header__menu fr-modal`. Le JavaScript DSFR tourne en mode **Vue** (`window.dsfr` dans `index.html`, `startDsfrForVueApp()` après `app.mount` dans `main.ts`).

## Démo fiche info

Vue `FicheDemoView.vue` (route `/fiche-info`).

- **Carte** : [TabPanelsControl](./TabPanelsControl.md) (même catalogue gpu-site que `/map`, via `useDemoLayerCatalog`) avec les onglets **Informations**, **Catalogue** et **Données brutes** (`hiddenTabs` / `extraTab`) ; [SearchEngineControl](./SearchEngineControl.md) ; [MapModeSelector](./MapModeSelector.md) (Parcelle au départ) ; [ClickInfoControl](./ClickInfoControl.md) `toggleable` (actif au départ, bouton sous la recherche) ; zoom et échelle. Pas d’impression : les boutons « Imprimer » de la fiche sont masqués.
- **Entrées** : clic sur la carte, recherche de lieu et champ **identifiant de parcelle** au-dessus de la carte (`34_301_000_000_AS_0136` ou `34301000000AS0136`) — la parcelle est localisée par le géocodage Géoplateforme (index `parcel`), la carte passe en mode Parcelle puis le point est interrogé comme un clic.
- **Résultat** : cerise, emprise rouge (parcelle) ou rouge pointillé (commune), **vue recentrée sur l’emprise** (`useFitOnModeEmprise`), fiche dans l’onglet Informations (filtrée par le catalogue).
- **Onglet Données brutes** : réponse `/api/fiche-info` (`RawFicheData`) en arbre repliable. Les champs non lus par la fiche sont grisés, les objets partiellement lus sont signalés ; la liste des champs lus (`src/lib/demo/ficheUsedFields.ts`) est vérifiée par un test sur des réponses réelles.
- **Sans permalien** : à l’ouverture, l’état du permalien (cerise, couches) est vidé et l’adresse n’est plus écrite ; l’écriture reprend en quittant la page.

## Flux localisation

1. Recherche validée sur `/` (`LocationSearchWidget` ou `mountSearchEngine` selon `demo-config`)
2. `prepareLocationHandoff` (`{ search, mapMode }` en mémoire ; `mapMode` dérivé du sous-type lieu et de la couche geopf, ex. `StreetAddress` → parcelle) + `router.push({ name: 'map' })` — **pas** de query, POST ni `sessionStorage`
3. `DemoView` lit `takeLocationHandoff()` → `provideMapMode` + `SearchEngineControl.initialSearch` (`search` ; le mode permalink reste prioritaire)

Sur **gpu-site** (pages distinctes) : `mode: 'redirect'` + formulaire POST (`municipality`, `position_x`, …) puis injection serveur de `params.search`.

## GitHub Pages

La démo est publiée par le workflow `pages.yml` (branche par défaut) :

1. `npm run build:demo:pages` (`base` dérivé de `GITHUB_REPOSITORY`, `configScriptUrl` → prod GPU)
2. Artefact `public/` (+ `404.html` = `index.html` pour le routage SPA)

Après le workflow vert : **Settings → Pages** (source _GitHub Actions_), URL typiquement du type
`https://ignf.github.io/entree-carto/`. Les GeoJSON limites admin sont servis sous
`{BASE_URL}json-data/` (pas à la racine du domaine `ignf.github.io/json-data/…` sur GitHub Pages ; gpu-site sert les mêmes chemins depuis `public/json-data/`).

En local, simuler GitHub Pages (même `base` au **build** et au **preview**) :

```bash
npm run serve:pages
```

Puis ouvrir l’URL affichée par Vite (ex. `http://localhost:4173/gpu-entree-carto/`), pas la racine `http://localhost:4173/`.

Équivalent manuel (adapter `GITHUB_REPOSITORY` au dépôt) :

```bash
GITHUB_REPOSITORY=ignf/gpu-entree-carto npx vite build
GITHUB_REPOSITORY=ignf/gpu-entree-carto npx vite preview
```

Si le build Pages a été fait avec `GITHUB_REPOSITORY` mais `vite preview` sans, les assets renvoient du HTML → erreurs MIME en console.

### Build local (`make build`)

`vite` utilise `base: './'` (chemins relatifs) pour servir la démo via **`make preview`**.

**Ne pas** ouvrir `dist/index.html` en `file://` : Firefox et Chrome **bloquent les modules ES** (`type="module"`) en local fichier — erreurs CORS / « URI non autorisée », même avec des chemins `./assets/` corrects. Une page d’aide s’affiche si vous essayez quand même.

Après `make build` : **`make preview`** puis `http://localhost:4173/`.
