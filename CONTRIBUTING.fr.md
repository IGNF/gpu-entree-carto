# Contribuer à entree-carto

[![en](https://img.shields.io/badge/lang-en-red.svg)](CONTRIBUTING.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](CONTRIBUTING.fr.md)

Merci de votre intérêt pour **entree-carto** ! Les contributions sous forme de code, documentation ou signalements de bugs sont les bienvenues.

Lisez le [README.fr.md](README.fr.md) (ou [README.md](README.md)) pour comprendre le projet, et notre [charte de conduite](CODE_OF_CONDUCT.fr.md) avant de continuer.

## Signaler un bug

1. Recherchez dans les [issues](https://github.com/IGNF/gpu-entree-carto/issues) existantes. Si une issue correspond, complétez-la.
2. Sinon, [ouvrez une nouvelle issue](https://github.com/IGNF/gpu-entree-carto/issues/new) en indiquant :
   - **Étapes de reproduction** (route démo, réglages `demo-config.js`, navigateur)
   - **Environnement** (OS, version Node, branche ou tag)
   - **Comportement attendu vs observé** (captures, erreurs console si utile)
   - Si le problème apparaît en **dev source** (`make dev`) et/ou avec les **bundles** (`useMinimified: true`, `make build`)

## Proposer une fonctionnalité

Ouvrez une issue pour **discuter** de l’idée avant un gros développement, afin de l’aligner sur [ROADMAP.fr.md](ROADMAP.fr.md) et les priorités des mainteneurs. Décrivez le besoin utilisateur, le comportement proposé et l’impact sur l’intégration gpu-site le cas échéant.

## Se préparer à contribuer

1. [Forkez le dépôt](https://docs.github.com/fr/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo) sur GitHub.
2. Clonez votre fork et ajoutez `upstream` :

   ```bash
   git clone https://github.com/<your-username>/gpu-entree-carto.git
   cd gpu-entree-carto
   git remote add upstream https://github.com/IGNF/gpu-entree-carto.git
   ```

3. Synchronisez-vous régulièrement avec `upstream`, branche **`main`** : [Synchroniser un fork](https://docs.github.com/fr/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork).
4. Installez les dépendances et lancez la démo :

   ```bash
   make install
   make dev
   ```

5. Suivez **[CODING.fr.md](CODING.fr.md)** (conventions, tests, releases). Compilation : **[COMPILE.fr.md](COMPILE.fr.md)**.

## Soumettre une modification

### Nommage des branches

Préfixe court + description, par exemple :

- `feature/<description-courte>`
- `fix/<description-courte>`
- `doc/<description-courte>`

### Conventions de commit

Messages clairs et ciblés. [Conventional Commits](https://www.conventionalcommits.org/fr/v1.0.0/) encouragés :

| Type | Usage |
| ---- | ----- |
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `refactor` | Refactorisation sans changement de comportement |
| `test` | Tests uniquement |
| `doc` | Documentation |
| `chore` | Outillage, dépendances, CI |

Référencez les issues si pertinent (`Fixes #123`).

### Processus de pull request

- Branche cible : **`main`** sur `IGNF/gpu-entree-carto`.
- Avant d’ouvrir la PR :
  - Exécutez **`npm run verify`** (ou `make verify` sans CodeQL si non installé).
  - Exécutez **`make test`** si le comportement change.
  - Mettez à jour **`doc/`** pour tout contrôle carte nouveau ou modifié (page + index `doc/README.md`).
  - Mettez à jour **[CHANGELOG.md](CHANGELOG.md)** et **[CHANGELOG.fr.md](CHANGELOG.fr.md)** sous `Non publié` / `Unreleased` pour les changements visibles.
  - Ajoutez-vous à **[CONTRIBUTORS.fr.md](CONTRIBUTORS.fr.md)** si première contribution.
- Décrivez le changement, les tests effectués et liez les issues.
- Les retours de revue se traitent par de nouveaux commits sur la même branche.
- Fusion après revue par les mainteneurs.

## Licence

En contribuant, vous acceptez que vos apports soient placés sous la **[licence CeCILL-B](LICENCE.fr.md)** du projet.

Vérifiez que vous disposez des droits nécessaires (pas de code tiers sous licence incompatible). Respectez la politique de propriété intellectuelle de votre employeur le cas échéant.
