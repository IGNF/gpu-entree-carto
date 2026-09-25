# Coding guide — entree-carto

[![en](https://img.shields.io/badge/lang-en-red.svg)](CODING.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](CODING.fr.md)

Developer documentation: conventions, tests, documentation, and releases.  
For installing and building the project, see **[COMPILE.md](COMPILE.md)**.

IGN repository structure: [MARS — repository layout](https://mars.gitlab-pages.ign.fr/cadre-technique/gouvernance/opensource/structure-depot/).

## Stack

- **Vue 3** (Composition API, `<script setup>` in views and components)
- **TypeScript** (strict checking via `vue-tsc`)
- **Vite 6** (demo app + multiple library configs under `vite.*.config.ts`)
- **OpenLayers 10** + **geopf-extensions-openlayers**
- **Vitest** + **jsdom** for unit tests
- **ESLint 10** (flat config) + **Prettier**

## Repository layout

```
src/
  components/     # Vue UI (map/, layers/, search/, …)
  composables/    # Shared Vue composables
  embed/          # EmbedMapViewer (createStandardViewer)
  geometry-editor/  # Standalone geometry editor + sketch internals
  lib/            # Public API, mount helpers, demo config
  ol/             # Layer presets, GPU base layers
  sketch/         # Standalone sketch bundle entry
  views/          # Demo routes
doc/              # Control & integration docs (EN/FR pairs: *.md + *.fr.md)
dist/             # Build output (published npm `files`)
```

Library IIFE builds: `vite.lib.config.ts`, `vite.search-engine.config.ts`, `vite.location-search.config.ts`, `vite.geometry-editor.config.ts`, `vite.sketch.config.ts`.

## Code style

- **ESLint:** `npm run lint` — scope `src/` (`eslint.config.js`).
- **Prettier:** `npm run format:check` / `npm run format` — scope `src/`.
- **Auto-fix:** `make fix` (`lint:fix` + `format`).

**Husky** runs `npm run verify` on pre-commit (lint + format check + typecheck). Use `SKIP_CODEQL=1` only when CodeQL is not installed locally and you run full `make verify` separately.

### Vue / TypeScript

- Prefer typed props and explicit imports; avoid `any` unless justified.
- Map-related OpenLayers controls: use `useOlControl` where the project already does.
- Keep bundle entry files under `src/lib/entries/` thin (re-export mount APIs + side effects for IIFE globals).

### Commits and branches

See **[CONTRIBUTING.md](CONTRIBUTING.md)** (branch naming, Conventional Commits).

## Tests

```bash
make test              # vitest run
npm run test:watch     # watch mode
```

- Place tests next to sources or as `*.spec.ts` under `src/`.
- Run tests when fixing bugs or changing logic in `src/lib/`, composables, or non-trivial components.

## Documentation

### Map controls and cartographic components

Any **new or modified map control** (or associated cartographic component) must have:

1. **EN/FR pair** in **`doc/`** (e.g. `ScaleLineControl.md` + `ScaleLineControl.fr.md`), name aligned with the component; English is the reference body in `.md`.
2. Entries in **`doc/README.md`** and **`doc/README.fr.md`** (same structure; link to `.md` / `.fr.md` respectively).

Minimum content: description, options/props/API, placement, dependencies, behaviour, examples. Language badges at the top of each page; internal doc links use `./Other.md` (EN) or `./Other.fr.md` (FR).

### Other docs

- Integration: `doc/INTEGRATION.md`, `doc/LibCssBundles.md` (+ `.fr.md` pairs)
- Demo: `doc/Demo.md`, `doc/DemoConfig.md` (+ `.fr.md` pairs)
- Root governance and **`doc/`** both use **EN/FR pairs** (`*.md` / `*.fr.md`) per [MARS](https://mars.gitlab-pages.ign.fr/cadre-technique/gouvernance/opensource/structure-readme/) — keep both languages in sync when editing (Cursor rule `mars-bilingual-docs`).

## Quality gates

| Command | Purpose |
| ------- | ------- |
| `npm run verify` | Lint + Prettier check + `vue-tsc` (pre-commit) |
| `make verify` | Above + optional local CodeQL (`npm run codeql:install`) |
| `make build` | Full production build (demo + all lib bundles) |

CI: `.github/workflows/ci.yml` (see badge in README).

## Releases and versioning

- Version is declared in **`package.json`** (currently `0.x` — public API still evolving with gpu-site integration).
- Record user-visible changes in **[CHANGELOG.md](CHANGELOG.md)** and **[CHANGELOG.fr.md](CHANGELOG.fr.md)** ([Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format).
- Release process (maintainers):
  1. Move `Unreleased` entries to a new version section with date.
  2. Bump `package.json` version.
  3. Tag `vX.Y.Z` on `main` after merge.
  4. Publish `dist/` artifacts per gpu-site / npm policy (package `files`: `dist` only).

## Security

- Optional local CodeQL: `.github/codeql/README.md`, `npm run verify:codeql`.
- Do not commit secrets (`.env`, credentials). Dependabot: `.github/dependabot.yml`.

## Dependencies

Direct and dev dependencies: **[DEPENDENCIES.md](DEPENDENCIES.md)**. Regenerate the version column after major upgrades:

```bash
npm ls --depth=0
```
