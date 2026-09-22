# CodeQL (CI GitHub)

Ce dépôt utilise une **configuration avancée** : workflow [`.github/workflows/codeql.yml`](../workflows/codeql.yml) + [`codeql-config.yml`](./codeql-config.yml) (analyse limitée à `src/`).

## Erreur après push : « default setup is enabled »

GitHub n’accepte **pas** les deux modes en parallèle (setup par défaut + workflow avancé / upload SARIF).

1. Ouvrir **Settings** du dépôt sur GitHub.
2. **Advanced Security** (ou **Code security and analysis**).
3. Section **Code scanning** → ligne **CodeQL analysis**.
4. Choisir **Switch to advanced** (ou **Disable CodeQL** sur le setup par défaut, puis laisser uniquement ce workflow).

Relancer le workflow **CodeQL** (onglet Actions).

Référence : [Troubleshoot SARIF uploads – default setup enabled](https://docs.github.com/en/code-security/code-scanning/troubleshooting-code-scanning/sarif-uploads#upload-was-rejected-because-codeql-default-setup-is-enabled-for-code-scanning).

## Analyse locale

Voir le README racine : `npm run codeql:install`, puis `npm run verify:codeql` (périmètre `./src`).
