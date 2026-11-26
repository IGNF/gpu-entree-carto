# TODO

## Dep majeures en retard

[ ] Vite 6 → 8
[ ] Vitest 4 → 5
[ ] TypeScript 5.7 → 7
[ ] @gouvminint/vue-dsfr 8 → 9
[ ] vue-router bloqué en 5.0.7 par un overrides.

## dist/ versionné

Objectif : ne plus versionner `dist/` ; gpu-site (aujourd'hui `"entree-carto": "github:IGNF/gpu-entree-carto#main"`) se fixe sur une version publiée.

Choix : **tarball `npm pack` attaché à une release GitHub** (pas d'auth). GitHub Packages imposerait un nom scopé (`@ignf/…`) et un token même pour installer un paquet public, donc un secret à gérer dans la CI GitLab de gpu-site.

Côté entree-carto :

[ ] Workflow GitHub Actions sur tag `v*` : `npm ci` → `make build` → `npm run verify:dist` → `npm pack` → `gh release create $TAG entree-carto-*.tgz`.
[ ] Vérifier que `npm pack` embarque tout ce que gpu-site copie (`*.min.js`, `css/`, `assets/`, `img/`, `json-data/`) ; ajuster `files` si besoin.
[ ] Process de release : renommer `[Non publié]` du CHANGELOG en `[X.Y.Z]`, puis `npm version patch|minor` (bump + commit + tag `vX.Y.Z`) et `git push --follow-tags` ; la CI fait le reste.
[ ] Une fois gpu-site migré : `dist/` dans `.gitignore`, `git rm -r --cached dist`, retirer la consigne « dist versionné » de CLAUDE.md et de la doc.

Côté gpu-site :

[ ] `package.json` : `"entree-carto": "https://github.com/IGNF/gpu-entree-carto/releases/download/vX.Y.Z/entree-carto-X.Y.Z.tgz"`, puis `npm install` pour figer le lock (intégrité sha512).
[ ] Rien à changer dans `webpack.config.js` (toujours `node_modules/entree-carto/dist`).
[ ] Dev local : `npm link` ou `file:../gpu-entree-carto` (déjà prévu par le watch webpack).
[ ] Montée de version = changer l'URL + `npm install`, dans une MR dédiée.

## Performances carte

[ ] Regrouper les couches WMS GPU cochées en une seule requête (`LAYERS=a,b,c`, `cql_filter` séparés par `;`) : aujourd'hui une source par couche, donc N requêtes par tuile pour N couches cochées.
  - Gain mesuré (tuile 512 px, zoom 15) : couches par défaut 6 → 2 requêtes par tuile (`mec`, opaque, reste à part), environ 30 à 50 % de volume en moins ; SUP en mode détaillé 29 → 1 requête, 205 → 17 Ko. Comparaison : https://claude.ai/artifact/X1ekcena2T1yrg3BcRhqo9
  - Rendu quasi identique : au plus 0,09 % de pixels différents (écart max 26/255), l'opacité appliquée au groupe ne se voit pas car prescriptions et périmètres sont surtout des hachures.
  - Cocher le groupe SUP entier affiche déjà la couche GeoServer `sup` (une requête) : le gain SUP ne concerne que le mode détaillé ou des catégories cochées une à une.
  - Ne regrouper que des couches contiguës dans l'ordre d'affichage, de même URL, même opacité et même réglage noir et blanc ; recalculer les groupes au changement de sélection, d'opacité, de noir et blanc ou de plage de zoom.
  - Filtre CQL répété pour chaque sous-couche, `INCLUDE` quand il n'y en a pas, sinon GeoServer refuse la requête (« Layers and filters are mismatched »).
  - Prévoir un repli : une couche en erreur fait échouer tout le groupe (exception XML), risque surtout en prévisualisation (noms `_previsu`) ; vérifier aussi l'impression (copie `hidpi`).
