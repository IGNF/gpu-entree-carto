[![en](https://img.shields.io/badge/lang-en-red.svg)](DemoExternal.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](DemoExternal.fr.md)

# Assets externes démo (`public/external/`)

Répond au point d’audit gpu-site **4.2** (icônes DSFR dupliquées dans le CSS entree-carto sur `/map/`).

## Rôles

| Contexte | DSFR + icônes + Remix | CSS `dist/css/*.css` entree-carto |
| -------- | --------------------- | --------------------------------- |
| **Démo Vite** (`npm run dev`, `build:demo`) | Chargés depuis `public/external/` (`index.html`) | Chunks appli sans `icons.min.css` |
| **Intégration gpu-site** | Déjà sur la page (`dsfr.min.css`, `utility.main.min.css`, …) | Bundles avec `stubDsfrIconsCss` (pas de feuille icônes embarquée) |
| **Embed sans icônes hôte** | `ensureEmbedSharedStylesheets()` charge `external/…/icons.min.css` + Remix si besoin | Mêmes bundles allégés |

## Arborescence

```
public/external/
  dsfr/dsfr.min.css
  dsfr/dsfr.module.min.js
  dsfr/fonts/          (Marianne + Spectral, référencées par dsfr.min.css)
  dsfr/icons/          (SVG masques des `fr-icon-*`, référencés par icons.min.css)
  dsfr/utility/icons/icons.min.css
  remixicon/remixicon.css
  remixicon/remixicon.woff2
```

Synchronisation depuis `node_modules` (versions DSFR / Remix du `package.json`) :

```bash
npm run sync:demo-external
```

Exécuté automatiquement par `npm run dev` et `npm run build:demo`.

## Intégration

- Ne pas importer `@gouvfr/dsfr/dist/utility/icons/icons.min.css` dans les entrées **lib** ; le plugin Vite `stubDsfrIconsCss` neutralise cet import au build `dist/`.
- gpu-site doit continuer à charger l’utility DSFR (icônes) avant le CSS entree-carto — voir [INTEGRATION.fr.md](./INTEGRATION.fr.md).
- Démo GitHub Pages : `external/` est copié avec `public/` dans `dist/`.

Voir aussi [DemoConfig.fr.md](./DemoConfig.fr.md), [LibCssBundles.fr.md](./LibCssBundles.fr.md).
