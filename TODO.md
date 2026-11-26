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

