# Changelog

[![en](https://img.shields.io/badge/lang-en-red.svg)](CHANGELOG.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](CHANGELOG.fr.md)

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Open source governance files (MARS-aligned README, CONTRIBUTING, CODING, CODE_OF_CONDUCT, CHANGELOG, ROADMAP).
- `useMinimified` support across demo routes (home, map, geometry-editor, sketch) loading `dist/` bundles.

### Changed

- README restructured per [IGN MARS README guide](https://mars.gitlab-pages.ign.fr/cadre-technique/gouvernance/opensource/structure-readme/); French overview in `README.fr.md`.
- French pairs (`*.fr.md`) for all root open source governance files; Cursor rule `mars-bilingual-docs`.
- Bilingual `doc/` documentation: English `*.md`, French `*.fr.md` (27 pages + index).

## [0.3.0] - 2026-09-25

### Added

- Standalone bundles: `entree-carto-search-engine`, `entree-carto-location-search`, `entree-carto-geometry-editor`, `entree-carto-sketch`.
- GPU home banner demo, SearchEngine / location search widgets, demo-config driven SPA.
- Tab panel, sketch tools, geometry editor, WMS layer registry integration paths.
- Vitest, ESLint, Prettier, Husky pre-commit, GitHub Actions CI and Pages demo.

### Changed

- Vue 3 + OpenLayers 10 + VueDSFR stack replacing gpu-client embedding model for new integrations.

[Unreleased]: https://github.com/IGNF/gpu-entree-carto/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/IGNF/gpu-entree-carto/releases/tag/v0.3.0
