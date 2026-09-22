# CodeQL

## Sur GitHub (sans droits admin)

Ce dépôt est soumis au **setup CodeQL par défaut** de l’organisation (configuré par un admin).  
Un workflow « avancé » dans le dépôt **ne peut pas** coexister : l’upload SARIF échoue tant que le défaut est actif.

**Conséquence :** pas de workflow CodeQL dans `.github/workflows/` — l’analyse GitHub est pilotée par la plateforme.

### Demande type pour un admin du dépôt / de l’org

Copier-coller (Issues ou ticket interne) :

> **CodeQL – gpu-entree-carto**
>
> 1. **Option A (recommandée pour nous)** : *Code scanning → CodeQL analysis → Switch to advanced*, puis réactiver le workflow du dépôt (fichier `codeql.yml` sur branche `dev` / tag documenté dans l’historique git) ou recréer un workflow qui utilise [`.github/codeql/codeql-config.yml`](./codeql-config.yml) et [`.codeqlignore`](../../.codeqlignore) (analyse **`src/`** uniquement, pas `dist/`).
>
> 2. **Option B (rester en default setup)** : dans la config par défaut, **exclure `dist/`** (bundles Vite avec DOMPurify) et limiter l’analyse à **`src/`** si l’UI le permet.  
>    Les alertes « Bad HTML filtering regexp » sur `dist/entree-carto-*.js` viennent de DOMPurify bundlé, pas d’un filtre maison dans `src/components/common/SanitizedHtml.vue`.

Référence GitHub : [default setup vs advanced](https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning#about-setup-types-for-code-scanning).

## Analyse locale (tous les développeurs)

Indépendant de GitHub :

```bash
npm run codeql:install   # une fois
npm run verify:codeql    # ou make verify (avec CodeQL)
```

Périmètre : `./src` uniquement (`scripts/codeql-verify.sh`).

Fichiers de référence pour une future config avancée : [`codeql-config.yml`](./codeql-config.yml), [`.codeqlignore`](../../.codeqlignore).
