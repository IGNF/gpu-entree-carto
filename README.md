# entree-carto

[![CI](https://github.com/IGNF/gpu-entree-carto/actions/workflows/ci.yml/badge.svg)](https://github.com/IGNF/gpu-entree-carto/actions/workflows/ci.yml)
[![Démo en ligne](https://img.shields.io/badge/démo-GitHub%20Pages-blue)](https://ignf.github.io/gpu-entree-carto/)

**entree-carto** est la refonte de l’entrée cartographique GPU (gpu-client), alignée sur la nouvelle maquette UX/UI et sur le [Système de Design de l’État (DSFR)](https://www.systeme-de-design.gouv.fr/version-courante/fr).

Objectif : proposer une carte interactive d’urbanisme (documents, couches, légende, outils…) avec une interface cohérente avec l’écosystème IGN / cartes.gouv.fr, en **Vue 3** + **OpenLayers**.

**Démo en ligne :** https://ignf.github.io/gpu-entree-carto/

## Démarrage rapide

```sh
make install
make dev       # http://localhost:5173/
```

Node **≥ 24.15** — **recommandé :** 24 LTS (`.nvmrc`, ex. 24.21.0) : `nvm use` / `fnm use` avant `npm install`.

| Commande | Effet |
| -------- | ----- |
| `make build` | Démo + bibliothèques `dist/` |
| `make preview` | Prévisualiser le build (pas de `file://` sur `dist/index.html`) |
| `make verify` | Lint, format, TypeScript + CodeQL local (`SKIP_CODEQL=1` pour l’ignorer) |
| `make test` | Vitest |

## Documentation

Toute la documentation est dans [doc/](doc/README.md) : [développement et build](doc/CODING.md), [intégration gpu-site](doc/INTEGRATION.md), [configuration démo](doc/DemoConfig.md), [journal des modifications](doc/CHANGELOG.md).

Maquette : [Figma GPU UX/UI](https://www.figma.com/design/ARSe9rthrHEp6UFJOh5rdn/GPU---UX-UI?node-id=310-7048&p=f&t=8oFaUS97xpJPgep7-0).

## Licence

CeCILL-B — voir [LICENCE.md](LICENCE.md).
