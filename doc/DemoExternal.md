[![en](https://img.shields.io/badge/lang-en-red.svg)](DemoExternal.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](DemoExternal.fr.md)

# Demo external assets (`public/external/`)

Addresses gpu-site audit item **4.2** (DSFR icons duplicated in entree-carto CSS on `/map/`).

## Roles

| Context | DSFR base + icons + Remix | entree-carto `dist/css/*.css` |
| ------- | ------------------------- | ------------------------------ |
| **Vite demo** (`npm run dev`, `build:demo`) | Loaded from `public/external/` via `index.html` | App chunks without `icons.min.css` |
| **gpu-site embed** | Already on the page (`dsfr.min.css`, `utility.main.min.css`, …) | Bundles built with `stubDsfrIconsCss` (no embedded icon font sheet) |
| **Embed without site icons** | `ensureEmbedSharedStylesheets()` loads `external/…/icons.min.css` + Remix if missing | Same slim bundles |

## Layout

```
public/external/
  dsfr/dsfr.min.css
  dsfr/dsfr.module.min.js
  dsfr/fonts/          (Marianne + Spectral, referenced by dsfr.min.css)
  dsfr/icons/          (SVG masks for `fr-icon-*`, referenced by icons.min.css)
  dsfr/utility/icons/icons.min.css
  remixicon/remixicon.css
  remixicon/remixicon.woff2
```

Sync from `node_modules` (pinned DSFR / Remix versions):

```bash
npm run sync:demo-external
```

`npm run dev` and `npm run build:demo` run this automatically.

## Integration notes

- Do **not** import `@gouvfr/dsfr/dist/utility/icons/icons.min.css` in library entry points; use the Vite plugin `stubDsfrIconsCss` on lib builds.
- gpu-site must keep loading DSFR utility (icons) before entree-carto CSS — see [INTEGRATION.md](./INTEGRATION.md).
- Demo on GitHub Pages: `external/` is copied with `public/` into `dist/`.

See also [DemoConfig.md](./DemoConfig.md), [LibCssBundles.md](./LibCssBundles.md).
