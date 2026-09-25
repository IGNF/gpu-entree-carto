[![en](https://img.shields.io/badge/lang-en-red.svg)](LibCssBundles.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](LibCssBundles.fr.md)

# CSS des bundles bibliothèque (`dist/css/`)

Les builds **lib** (intégration gpu-site) produisent un fichier CSS par bundle JS, sur le même modèle que les scripts.

## Fichiers

| CSS | JS associé | Usage gpu-site |
| --- | --- | --- |
| `entree-carto.css` / `.min.css` | `entree-carto.js` | Cartographie `/map/`, embed `createStandardViewer` |
| `entree-carto-location-search.css` / `.min.css` | `entree-carto-location-search.js` | Accueil **léger** — `gpu.mountLocationSearch` ([LocationSearchWidget](./LocationSearchWidget.fr.md)) |
| `entree-carto-search-engine.css` / `.min.css` | `entree-carto-search-engine.js` | Accueil **SearchEngine geopf** — `gpu.mountSearchEngine` ([mountSearchEngine](./mountSearchEngine.fr.md)) |
| `entree-carto-geometry-editor.css` / `.min.css` | `entree-carto-geometry-editor.js` | Formulaires géométrie |
| `entree-carto-sketch.css` / `.min.css` | `entree-carto-sketch.js` | Croquis standalone |

Build : `make build-lib`, `make build-location-search`, `make build-search-engine`, etc. (voir [INTEGRATION.md](./INTEGRATION.fr.md)).

## Accueil — CSS minimal

**Autocomplete seul** (pas de SearchEngine geopf) :

```html
<link rel="stylesheet" href="{{ asset('build/vendor/entree-carto/css/entree-carto-location-search.min.css') }}" />
<script src="{{ asset('build/vendor/entree-carto/entree-carto-location-search.min.js') }}"></script>
```

Le site doit déjà charger le **DSFR** (`dsfr.min.css`) : le widget réutilise `fr-search-bar`, `fr-input`, `fr-label`.

**SearchEngine complet** (bandeau accueil = même UX que la carte) :

```html
<link rel="stylesheet" href="{{ asset('build/vendor/entree-carto/css/entree-carto-search-engine.min.css') }}" />
<script src="{{ asset('build/vendor/entree-carto/entree-carto-search-engine.min.js') }}"></script>
```

Ou conserver `entree-carto.min.js` (API globale) + **uniquement** `entree-carto-search-engine.min.css` (styles retirés du chemin `mountSearchEngine` dans le bundle principal).

## Carte

```html
<link rel="stylesheet" href="{{ asset('build/vendor/entree-carto/css/entree-carto.min.css') }}" />
<script src="{{ asset('build/vendor/entree-carto/entree-carto.min.js') }}"></script>
```

Polices **Remix Icon** : référencées en `url(../assets/remixicon-*.woff2)` depuis `css/` — copier tout `dist/` (dossiers `css/` et `assets/`) dans `vendor/entree-carto/`.

## Erreurs SVGO (webpack gpu-site)

Symptôme lors de `npm run build` gpu-site :

```text
postcss-svgo: … Parsed entity count exceeds max entity count
… unicode='&#xEC03;' … remixicon …
```

**Cause :** les anciennes builds entree-carto intégraient la **police SVG** Remix en data-URI dans le CSS (des milliers de glyphes). Le **CssMinimizerPlugin** de webpack relançait SVGO sur ce CSS **déjà minifié** par Vite.

**Côté entree-carto (corrigé) :** plugin `vite/remixiconExternal.ts` — pas de police SVG inline, woff2 externe sous `dist/assets/`.

**Côté gpu-site (recommandé) :**

1. Utiliser les fichiers **`*.min.css`** livrés dans `vendor/entree-carto/css/` **sans** les repasser dans `CssMinimizerPlugin`, par ex. :

```js
new CssMinimizerPlugin({
  exclude: /vendor\/entree-carto\/css\//,
})
```

2. Ou désactiver SVGO pour ces fichiers :

```js
new CssMinimizerPlugin({
  minimizerOptions: {
    preset: ['default', { svgo: false }],
  },
  include: /vendor\/entree-carto\/css\//,
})
```

3. Mettre à jour le vendeur entree-carto après `make build` dans le dépôt (CSS ≈ 3 Mo carte, ≈ 1,6 Mo geometry-editor/sketch, ≈ 1 Ko location-search).

## Dépendances

- [INTEGRATION.md](./INTEGRATION.fr.md) — copie webpack, ordre des scripts
- [LocationSearchWidget.md](./LocationSearchWidget.fr.md)
- [mountSearchEngine.md](./mountSearchEngine.fr.md)
