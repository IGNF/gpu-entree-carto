# CodeQL (CI GitHub)

Configuration **avancée** : [`.github/workflows/codeql.yml`](../workflows/codeql.yml) + [`codeql-config.yml`](./codeql-config.yml) + [`.codeqlignore`](../../.codeqlignore) (uniquement **`src/`**, pas `dist/`).

## 1. Erreur SARIF : « default setup is enabled »

Tant que le **setup CodeQL par défaut** GitHub est actif, l’upload du workflow avancé **échoue toujours** (même en `codeql-action@v4`).

**À faire une fois** (droits admin sur le dépôt) :

1. GitHub → dépôt **gpu-entree-carto** → **Settings**
2. **Advanced Security** (ou **Code security and analysis**)
3. Section **Code scanning** → ligne **CodeQL analysis**
4. Menu **⋯** ou **Set up** → **Switch to advanced**  
   (ou **Disable CodeQL** sur le setup par défaut, puis ne garder que le workflow du dépôt)
5. **Actions** → workflow **CodeQL** → **Re-run all jobs**

Doc GitHub : [Upload rejected – default setup enabled](https://docs.github.com/en/code-security/code-scanning/troubleshooting-code-scanning/sarif-uploads#upload-was-rejected-because-codeql-default-setup-is-enabled-for-code-scanning)

> Tant que le setup par défaut tourne en parallèle, vous pouvez voir **deux** analyses CodeQL et des alertes incohérentes.

## 2. Alerte « Bad HTML filtering regexp » dans `dist/*.js`

Souvent due au **setup par défaut**, qui analyse les bundles commités (`dist/entree-carto-sketch.js`, etc.) où **DOMPurify** est inclus par Vite.

Ce n’est **pas** un bug de `SanitizedHtml.vue` (`src/components/common/SanitizedHtml.vue` utilise `DOMPurify.sanitize`).

Après **Switch to advanced**, seul le workflow du dépôt s’exécute avec `paths: src` et `.codeqlignore` (sans `dist/`). L’alerte sur `dist/` doit disparaître.

## Analyse locale

`npm run codeql:install` puis `npm run verify:codeql` (périmètre `./src`).
