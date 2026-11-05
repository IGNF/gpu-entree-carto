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
> 2. **Option B (rester en default setup)** : dans la config par défaut, **exclure `dist/`** et limiter l’analyse à **`src/`** si l’UI le permet.  
>    Les alertes sur **`dist/`** viennent du **code tiers minifié** (pas de la logique métier dans `src/`) :
>    - **jsPDF** (`js/double-escaping`, échappement chaînes PDF) — worker `printExport.worker-*.js`, anciennement aussi `entree-carto.js` ;
>    - **html2canvas** (`js/redos`, regex commentaires CSS) — chunks `index.es-*.js` ;
>    - **DOMPurify** (filtre HTML) — bundles lib historiques.
>    Tant que la PR **modifie `dist/`**, le default setup peut remonter ces alertes comme « nouvelles » sur le diff.

Référence GitHub : [default setup vs advanced](https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning#about-setup-types-for-code-scanning).

## Analyse locale (tous les développeurs)

Indépendant de GitHub :

```bash
npm run codeql:install      # une fois
npm run verify:codeql       # src/ (défaut ; make verify)
npm run verify:codeql:dist  # dist/ — repro alertes GitHub sur bundles (après npm run build)
npm run verify:codeql:all   # src/ + dist/
```

`verify:codeql:dist` analyse surtout les **bundles non minifiés** : l’extracteur JS ignore les fichiers « minified » (`Skipping file … File appears to be minified`), d’où un petit nombre de fichiers (~13) malgré tout `dist/`. Les alertes typiques (code **tiers** bundlé) :

| Règle | Fichier(s) | Origine |
| ----- | ---------- | ------- |
| `js/redos` | `assets/index.es-*.js` (obsolète) | canvg, ex-dépendance jsPDF |
| `js/double-escaping` | anciens `printExport.worker-*.js` | jsPDF (remplacé par **pdf-lib**) |

Après `npm run build:lib`, exécuter `node scripts/prune-dist-orphans.mjs` (ou `npm run verify:codeql:dist`) pour retirer les chunks hashés non référencés (`emptyOutDir: false`).

Code de sortie **1** = alertes présentes (comportement voulu). Ce n’est pas un échec du script d’installation CodeQL.

Périmètre : variable `CODEQL_SCOPE` (`src` | `dist` | `all`), voir `scripts/codeql-verify.sh`.  
Référence config « avec dist » : [`codeql-config-with-dist.yml`](./codeql-config-with-dist.yml).

Fichiers de référence pour une future config avancée : [`codeql-config.yml`](./codeql-config.yml), [`.codeqlignore`](../../.codeqlignore).
