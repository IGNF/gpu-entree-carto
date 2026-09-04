# entree-carto

[![CI](https://github.com/IGNF/gpu-entree-carto/actions/workflows/ci.yml/badge.svg)](https://github.com/IGNF/gpu-entree-carto/actions/workflows/ci.yml)
[![Démo en ligne](https://img.shields.io/badge/démo-GitHub%20Pages-blue)](https://ignf.github.io/gpu-entree-carto/)

[![Vue.js](https://img.shields.io/badge/Vue.js-3-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![OpenLayers](https://img.shields.io/badge/OpenLayers-10-1F6B75)](https://openlayers.org/)
[![DSFR](https://img.shields.io/badge/DSFR-VueDSFR-000091)](https://vue-ds.fr/)
[![Vitest](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Node](https://img.shields.io/badge/node-22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

**entree-carto** est la refonte de l’entrée cartographique GPU (gpu-client), alignée sur la nouvelle maquette UX/UI et sur le [Système de Design de l’État (DSFR)](https://www.systeme-de-design.gouv.fr/version-courante/fr).

Objectif : proposer une carte interactive d’urbanisme (documents, couches, légende, outils…) avec une interface cohérente avec les autres projets de l’écosystème, en Vue 3 + OpenLayers.

**➡️ [Voir la démo en ligne](https://ignf.github.io/gpu-entree-carto/)**

---

## En bref

Nouvelle entrée cartographique GPU, compatible DSFR, qui remplace **gpu-client** (jQuery / stack historique). Stack : **Vue 3**, **OpenLayers** (≥ 9.2.4), **VueDSFR** / DSFR.

En local : `make dev` puis ouvrir l’URL Vite. En ligne : [ignf.github.io/gpu-entree-carto](https://ignf.github.io/gpu-entree-carto/) (workflow `pages.yml`, branche par défaut) — voir [doc/Demo.md](./doc/Demo.md).

---

## Démarrage rapide

```sh
make install   # npm install
make dev       # serveur de développement (Vite)
```

Autres cibles :

| Commande         | Effet                                       |
| ---------------- | ------------------------------------------- |
| `make build`     | Build démo + bibliothèque (`dist/`)         |
| `make build-lib` | Bibliothèque seule (`entree-carto.js`, CSS) |
| `make test`      | Tests Vitest                                |
| `make preview`   | Prévisualiser le build                      |
| `make typecheck` | Vérification TypeScript                     |

---

## Stack technique

| Composant        | Choix                                                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework UI     | [Vue.js](https://vuejs.org/guide/introduction.html) 3                                                                                                           |
| Design system    | [DSFR](https://www.systeme-de-design.gouv.fr/version-courante/fr) + [VueDSFR](https://vue-ds.fr/) ([@gouvminint/vue-dsfr](https://github.com/dnum-mi/vue-dsfr)) |
| Carte            | [OpenLayers](https://github.com/openlayers/openlayers) ≥ 10 (geopf)                                                                                             |
| Extensions carte | [geopf-extensions-openlayers](https://github.com/IGNF/geopf-extensions-openlayers)                                                                              |
| Build / tests    | Vite, Vitest, TypeScript                                                                                                                                        |

---

## Structure

```
src/
  components/
    map/          # MapShell, Zoom, ScaleLine, fonds de plan
    legend/       # Légende (stub)
    layers/       # Arbre de couches (stub)
  composables/    # useOlMap
  ol/             # Factories de couches
  views/          # Démonstration
```

Composants de base inspirés de `gpu-client` (`Viewer`, contrôles zoom/échelle, switcher de fonds, légende / couches en stub).

**Intégration gpu-site :** voir [doc/INTEGRATION.md](./doc/INTEGRATION.md) — build bibliothèque `dist/`, API `window.gpu`, limites actuelles.

---

## Contexte

Le dépôt historique **gpu-client** affiche une carte interactive pour les sites d’urbanisme (GPU). Cette refonte reprend ses responsabilités fonctionnelles tout en :

- passant l’interface au **DSFR** ;
- modernisant la stack (**Vue.js**, OpenLayers récent) ;
- s’alignant sur les pratiques des projets IGN / cartes.gouv.fr.

Maquette : [Figma — GPU UX/UI](https://www.figma.com/design/ARSe9rthrHEp6UFJOh5rdn/GPU---UX-UI?node-id=310-7048&p=f&t=8oFaUS97xpJPgep7-0)

---

## Références

| Dépôt                                                                                       | Rôle                                    |
| ------------------------------------------------------------------------------------------- | --------------------------------------- |
| [IGNF/cartes.gouv.fr-entree-carto](https://github.com/IGNF/cartes.gouv.fr-entree-carto)     | Entrée cartographique de cartes.gouv.fr |
| [IGNF/cartes.gouv.fr-vue-components](https://github.com/IGNF/cartes.gouv.fr-vue-components) | Composants Vue 3 (VueDSFR)              |
| [IGNF/geopf-extensions-openlayers](https://github.com/IGNF/geopf-extensions-openlayers)     | Extensions Géoplateforme OpenLayers     |
| gpu-client                                                                                  | Comportement métier à reprendre         |

---

## Licence

À définir (alignement attendu avec les projets GPU / IGN associés).
