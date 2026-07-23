# entree-carto

**entree-carto** est la refonte de l’entrée cartographique GPU ([gpu-client](https://gitlab.gpf-tech.ign.fr/gpu/gpu-client)), alignée sur la nouvelle maquette UX/UI et sur le [Système de Design de l’État (DSFR)](https://www.systeme-de-design.gouv.fr/version-courante/fr).

Objectif : proposer une carte interactive d’urbanisme (documents, couches, légende, outils…) avec une interface cohérente avec les autres projets de l’écosystème, en Vue 3 + OpenLayers.

---

## En bref

| Question | Réponse |
|----------|---------|
| C’est quoi ? | Nouvelle entrée cartographique GPU, compatible DSFR |
| Remplace quoi ? | [gpu-client](https://gitlab.gpf-tech.ign.fr/gpu/gpu-client) (jQuery / stack historique) |
| Stack cible | **Vue 3**, **OpenLayers** (≥ [v9.2.4](https://github.com/openlayers/openlayers/releases/tag/v9.2.4)), **VueDSFR** |
| Design | [DSFR](https://www.systeme-de-design.gouv.fr/version-courante/fr) via [vue-dsfr](https://vue-ds.fr/) |

---

## Contexte

Le dépôt historique **gpu-client** affiche une carte interactive pour les sites d’urbanisme (GPU). Cette refonte reprend ses responsabilités fonctionnelles tout en :

- passant l’interface au **DSFR** ;
- modernisant la stack (**Vue.js**, OpenLayers récent) ;
- s’alignant sur les pratiques des projets IGN / cartes.gouv.fr.

La maquette de référence :

- [Figma — GPU UX/UI](https://www.figma.com/design/ARSe9rthrHEp6UFJOh5rdn/GPU---UX-UI?node-id=310-7048&p=f&t=8oFaUS97xpJPgep7-0)

---

## Stack technique

| Composant | Choix |
|-----------|--------|
| Framework UI | [Vue.js](https://vuejs.org/guide/introduction.html) |
| Design system | [DSFR](https://www.systeme-de-design.gouv.fr/version-courante/fr) + [VueDSFR / vue-dsfr](https://github.com/dnum-mi/vue-dsfr) ([doc](https://vue-ds.fr/)) |
| Carte | [OpenLayers](https://github.com/openlayers/openlayers) (cible ≥ v9.2.4) |

---

## Références et sources d’inspiration

| Dépôt | Rôle |
|-------|------|
| [IGNF/cartes.gouv.fr-entree-carto](https://github.com/IGNF/cartes.gouv.fr-entree-carto) | Entrée cartographique de cartes.gouv.fr |
| [IGNF/cartes.gouv.fr-vue-components](https://github.com/IGNF/cartes.gouv.fr-vue-components) | Composants Vue 3 réutilisables (basés sur VueDSFR) |
| [IGNF/geopf-extensions-openlayers](https://github.com/IGNF/geopf-extensions-openlayers) | Extensions Géoplateforme OpenLayers (au besoin) |
| [gpu-client](https://gitlab.gpf-tech.ign.fr/gpu/gpu-client) | Comportement métier et fonctionnalités à reprendre |

---

## État du projet

Projet en démarrage. Le code applicatif n’est pas encore en place.

Prochaines étapes prévues :

- initialiser l’application Vue 3 + VueDSFR ;
- intégrer OpenLayers et les besoins cartographiques GPU ;
- s’appuyer sur les dépôts de référence ci-dessus ;
- mettre en place des tests au fur et à mesure.

---

## Licence

À définir (alignement attendu avec les projets GPU / IGN associés).
