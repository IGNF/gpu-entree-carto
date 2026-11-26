# entree-carto — consignes projet

Refonte de l’entrée cartographique GPU : Vue 3 + OpenLayers + VueDSFR. Guide développeur : `doc/CODING.md`.

Vérifications avant de rendre la main : `npm run verify` (lint + format + types sur tout le dépôt) et `make test`. Le pre-commit (lint-staged) ne vérifie que les fichiers indexés.

## Documentation

- **Français uniquement.** Pas de version anglaise, pas de suffixe `.fr.md`, pas de badges de langue.
- **À la racine : seulement `README.md` et `LICENCE.md`** ; toute autre doc va dans `doc/`.
- Pas de liens ou mentions vers des ressources internes (intranet, équipes, cadres internes) dans la doc versionnée : elle est publique.

### Contrôles carte

À chaque création ou modification d’un contrôle / composant cartographique :

1. Mettre à jour (ou créer) `doc/NomComposant.md` (nom aligné sur le composant, ex. `ScaleLineControl.md` pour `ScaleLineControl.vue`).
2. Y décrire au minimum : rôle, options / props / API, placement UI, dépendances OpenLayers, comportement, exemples.
3. Ajouter / mettre à jour l’entrée dans l’index `doc/README.md`.

### Icônes

L’UI mélange DSFR (`fr-icon-*`), Remix (`ri-*`), assets custom (`ec-icon-*`) et pictos geopf. À chaque ajout, remplacement ou suppression d’une classe d’icône dans `src/` :

1. Mettre à jour `doc/icone-references.md` (colonnes Aperçu, Libellé, Classe HTML, Catalogue, URL).
2. Lancer `node scripts/sync-doc-icon-previews.mjs` et versionner `doc/img/icon-previews/`.
3. Si seule la classe geopf change en amont : rebuild `dist/entree-carto-search-engine.js` si besoin, puis mettre à jour la section recherche Géoplateforme.

URLs catalogue :

- DSFR : `https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=` + nom sans `fr-icon-`
- Remix : `https://remixicon.com/icon/` + nom sans `ri-`

### CHANGELOG

`doc/CHANGELOG.md` (Keep a Changelog, section `[Non publié]`) : **une ligne courte par changement visible**, orientée utilisateur, sans détail d’implémentation (pas de noms de fonctions, fichiers ni explications techniques). Regrouper les corrections voisines.

## Build

- `vite.config.ts` (racine) : démo + Vitest. Les configs des bundles (`vite/*.config.ts`) et les plugins Vite sont dans `vite/`.
- `dist/` est versionné (consommé par gpu-site) : ne le regénérer (`make build`) que si demandé.

## Fichiers locaux (`_local/`, non versionné)

- `_local/references-projet.txt` : liste des projets de référence locaux à consulter si besoin.
- `_local/TODO_LIST.txt` : à chaque point ajouté, corriger orthographe et grammaire, détailler chaque idée en 1–2 phrases max, garder la structure cases à cocher + puces.
