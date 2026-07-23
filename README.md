# entree-carto

**entree-carto** est la refonte de l’entrée cartographique GPU ([gpu-client](https://gitlab.gpf-tech.ign.fr/gpu/gpu-client)), alignée sur la nouvelle maquette UX/UI et sur le [Système de Design de l’État (DSFR)](https://www.systeme-de-design.gouv.fr/version-courante/fr).

Objectif : proposer une carte interactive d’urbanisme (documents, couches, légende, outils…) avec une interface cohérente avec les autres projets de l’écosystème, en Vue 3 + OpenLayers.

---

## En bref

| Question | Réponse |
|----------|---------|
| C’est quoi ? | Nouvelle entrée cartographique GPU, compatible DSFR |
| Remplace quoi ? | [gpu-client](https://gitlab.gpf-tech.ign.fr/gpu/gpu-client) (jQuery / stack historique) |
| Stack | **Vue 3**, **OpenLayers** (≥ 9.2.4), **VueDSFR** / DSFR |
| Démo locale | `make dev` puis ouvrir l’URL Vite |

---

## Démarrage rapide

```sh
make install   # npm install
make dev       # serveur de développement (Vite)
```

Autres cibles :

| Commande | Effet |
|----------|--------|
| `make build` | Build de production (`dist/`) |
| `make test` | Tests Vitest |
| `make preview` | Prévisualiser le build |
| `make typecheck` | Vérification TypeScript |

---

## Stack technique

| Composant | Choix |
|-----------|--------|
| Framework UI | [Vue.js](https://vuejs.org/guide/introduction.html) 3 |
| Design system | [DSFR](https://www.systeme-de-design.gouv.fr/version-courante/fr) + [VueDSFR](https://vue-ds.fr/) ([@gouvminint/vue-dsfr](https://github.com/dnum-mi/vue-dsfr)) |
| Carte | [OpenLayers](https://github.com/openlayers/openlayers) ≥ 9.2.4 |
| Build / tests | Vite, Vitest, TypeScript |

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

---

## Contexte

Le dépôt historique **gpu-client** affiche une carte interactive pour les sites d’urbanisme (GPU). Cette refonte reprend ses responsabilités fonctionnelles tout en :

- passant l’interface au **DSFR** ;
- modernisant la stack (**Vue.js**, OpenLayers récent) ;
- s’alignant sur les pratiques des projets IGN / cartes.gouv.fr.

Maquette : [Figma — GPU UX/UI](https://www.figma.com/design/ARSe9rthrHEp6UFJOh5rdn/GPU---UX-UI?node-id=310-7048&p=f&t=8oFaUS97xpJPgep7-0)

---

## Références

| Dépôt | Rôle |
|-------|------|
| [IGNF/cartes.gouv.fr-entree-carto](https://github.com/IGNF/cartes.gouv.fr-entree-carto) | Entrée cartographique de cartes.gouv.fr |
| [IGNF/cartes.gouv.fr-vue-components](https://github.com/IGNF/cartes.gouv.fr-vue-components) | Composants Vue 3 (VueDSFR) |
| [IGNF/geopf-extensions-openlayers](https://github.com/IGNF/geopf-extensions-openlayers) | Extensions Géoplateforme OpenLayers |
| [gpu-client](https://gitlab.gpf-tech.ign.fr/gpu/gpu-client) | Comportement métier à reprendre |

---

## Licence

À définir (alignement attendu avec les projets GPU / IGN associés).
