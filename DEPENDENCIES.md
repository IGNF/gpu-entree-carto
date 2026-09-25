# DEPENDENCIES (25/09/2026)

[![en](https://img.shields.io/badge/lang-en-red.svg)](DEPENDENCIES.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](DEPENDENCIES.fr.md)

**Direct dependencies** declared in `package.json` (sample versions after `npm install` in a development environment). Published bundles under `dist/` embed parts of the npm tree (OpenLayers, Vue, geopf, DSFR, etc.).

Regenerate locally:

```bash
npm ls --depth=0
```

## Runtime (`dependencies`)

| Package | Version (sample) | Role |
| ------- | ---------------- | ---- |
| `@gouvfr/dsfr` | 1.15.3 | French State design system (CSS, components) |
| `@gouvminint/vue-dsfr` | 8.20.0 | Vue 3 DSFR components |
| `@iconify/vue` | 5.0.x | Icons (UI) |
| `dompurify` | 3.4.x | HTML sanitization |
| `fast-xml-parser` | 5.8.0 | XML parsing (KML, metadata) |
| `geopf-extensions-openlayers` | 1.0.0-beta.14 | Géoplateforme extensions (SearchEngine, OL widgets) |
| `notivue` | 2.4.x | Toast notifications (demo) |
| `ol` | 10.10.x | OpenLayers |
| `remixicon` | 4.9.x | Icons (DSFR complement) |
| `vue` | 3.5.x | UI framework |
| `vue-router` | 5.0.3 | SPA routing (demo) |

## Development (`devDependencies`)

| Package | Version (sample) | Role |
| ------- | ---------------- | ---- |
| `@eslint/js`, `eslint`, `eslint-plugin-vue`, `typescript-eslint`, `eslint-config-prettier` | see `npm ls` | Lint |
| `@vitejs/plugin-vue` | 6.0.x | Vue build (Vite) |
| `@vue/eslint-config-typescript` | 14.x | ESLint rules for Vue + TypeScript |
| `@vue/test-utils` | 2.5.x | Component tests |
| `@types/dompurify`, `@types/node` | — | TypeScript types |
| `globals` | 17.x | ESLint flat config |
| `husky` | 9.x | Git hooks (pre-commit) |
| `jsdom` | 30.x | Vitest environment |
| `prettier` | 3.9.x | Formatting |
| `typescript` | 5.7.x | Static typing |
| `vite` | 6.4.x | Bundler / dev server |
| `vitest` | 4.1.x | Unit tests |
| `vue-tsc` | 3.3.x | Type-check Vue SFCs |

## Notable transitive dependencies

`geopf-extensions-openlayers` and `ol` pull in additional libraries (e.g. proj4). Inspect with:

```bash
npm ls ol geopf-extensions-openlayers
```

For a full licence audit of transitive packages:

```bash
npm ls --all --omit=dev
```

(or a dedicated tool such as `license-checker` if required by your release process).
