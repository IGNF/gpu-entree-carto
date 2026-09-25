# entree-carto

[![en](https://img.shields.io/badge/lang-en-red.svg)](README.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](README.fr.md)

[![CI](https://github.com/IGNF/gpu-entree-carto/actions/workflows/ci.yml/badge.svg)](https://github.com/IGNF/gpu-entree-carto/actions/workflows/ci.yml)
[![Démo en ligne](https://img.shields.io/badge/démo-GitHub%20Pages-blue)](https://ignf.github.io/gpu-entree-carto/)

**entree-carto** est la refonte de l’entrée cartographique GPU (gpu-client), alignée sur la nouvelle maquette UX/UI et sur le [Système de Design de l’État (DSFR)](https://www.systeme-de-design.gouv.fr/version-courante/fr).

Objectif : proposer une carte interactive d’urbanisme (documents, couches, légende, outils…) avec une interface cohérente avec l’écosystème IGN / cartes.gouv.fr, en **Vue 3** + **OpenLayers**.

**Démo en ligne :** https://ignf.github.io/gpu-entree-carto/

Documentation technique détaillée (build, contribution, API) : voir **[README.md](README.md)** (anglais).

## Démarrage rapide

```sh
make install
make dev       # http://localhost:5173/
```

Node **24 LTS** (≥ 24.15, `.nvmrc`) — `nvm use` / `fnm use` avant `npm install`.

| Commande | Effet |
| -------- | ----- |
| `make build` | Démo + bibliothèques `dist/` |
| `make preview` | Prévisualiser le build (pas de `file://` sur `dist/index.html`) |
| `make verify` | Lint, format, TypeScript (+ CodeQL local optionnel) |
| `make test` | Vitest |

## Intégration gpu-site

Index documentation technique : [doc/README.fr.md](doc/README.fr.md) (français) · [doc/README.md](doc/README.md) (English).

Intégration gpu-site : [doc/INTEGRATION.fr.md](doc/INTEGRATION.fr.md). Configuration démo : [doc/DemoConfig.fr.md](doc/DemoConfig.fr.md).

## Contexte

Refonte de **gpu-client** (jQuery / stack historique) vers DSFR et stack moderne. Maquette : [Figma GPU UX/UI](https://www.figma.com/design/ARSe9rthrHEp6UFJOh5rdn/GPU---UX-UI?node-id=310-7048&p=f&t=8oFaUS97xpJPgep7-0).

## Documentation open source

| Sujet | Français | English |
| ----- | -------- | ------- |
| Contribution | [CONTRIBUTING.fr.md](CONTRIBUTING.fr.md) | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Développement | [CODING.fr.md](CODING.fr.md) | [CODING.md](CODING.md) |
| Compilation | [COMPILE.fr.md](COMPILE.fr.md) | [COMPILE.md](COMPILE.md) |
| Journal des versions | [CHANGELOG.fr.md](CHANGELOG.fr.md) | [CHANGELOG.md](CHANGELOG.md) |
| Feuille de route | [ROADMAP.fr.md](ROADMAP.fr.md) | [ROADMAP.md](ROADMAP.md) |
| Dépendances | [DEPENDENCIES.fr.md](DEPENDENCIES.fr.md) | [DEPENDENCIES.md](DEPENDENCIES.md) |
| Charte | [CODE_OF_CONDUCT.fr.md](CODE_OF_CONDUCT.fr.md) | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) |
| Contributeurs | [CONTRIBUTORS.fr.md](CONTRIBUTORS.fr.md) | [CONTRIBUTORS.md](CONTRIBUTORS.md) |

## Licence

Logiciel sous licence **CeCILL-B** : [LICENCE.fr.md](LICENCE.fr.md) · [LICENCE.md](LICENCE.md).
