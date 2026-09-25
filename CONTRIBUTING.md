# Contributing to entree-carto

[![en](https://img.shields.io/badge/lang-en-red.svg)](CONTRIBUTING.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](CONTRIBUTING.fr.md)

Thank you for your interest in contributing to **entree-carto**! Contributions are welcome in the form of code, documentation, and bug reports.

Please read the [README](README.md) to understand the project, and our [Code of Conduct](CODE_OF_CONDUCT.md) before continuing.

IGN open source framework: [MARS governance](https://mars.gitlab-pages.ign.fr/cadre-technique/gouvernance/opensource/) — [CONTRIBUTING structure guide](https://mars.gitlab-pages.ign.fr/cadre-technique/gouvernance/opensource/structure-contributing/).

## Reporting a bug

1. Search existing [issues](https://github.com/IGNF/gpu-entree-carto/issues). If one matches, add details there.
2. Otherwise, [open a new issue](https://github.com/IGNF/gpu-entree-carto/issues/new) and include:
   - **Steps to reproduce** (demo route, `demo-config.js` settings, browser)
   - **Environment** (OS, Node version, branch or release tag)
   - **Expected vs actual behaviour** (screenshots or console errors if relevant)
   - Whether the problem appears with **source dev** (`make dev`) and/or **bundles** (`useMinimified: true`, `make build`)

## Suggesting a feature

Open an issue to discuss your idea **before** large implementations, so it can be aligned with [ROADMAP.md](ROADMAP.md) and maintainers’ priorities. Describe the user need, proposed behaviour, and impact on gpu-site integration if applicable.

## Getting started

1. [Fork the repository](https://docs.github.com/en/pull-requests/working-with-forks/fork-a-repo) on GitHub.
2. Clone your fork and add upstream:

   ```bash
   git clone https://github.com/<your-username>/gpu-entree-carto.git
   cd gpu-entree-carto
   git remote add upstream https://github.com/IGNF/gpu-entree-carto.git
   ```

3. Sync with `upstream` **`main`** regularly: [Syncing a fork](https://docs.github.com/en/pull-requests/working-with-forks/syncing-a-fork).
4. Install dependencies and run the demo:

   ```bash
   make install
   make dev
   ```

5. Follow **[CODING.md](CODING.md)** for conventions, tests, and release notes. Build details: **[COMPILE.md](COMPILE.md)**.

## Submitting a change

### Branch naming

Use a short prefix and description, for example:

- `feature/<short-description>`
- `fix/<short-description>`
- `doc/<short-description>`

### Commit conventions

Prefer clear, scoped commit messages. [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) are encouraged:

| Type | Use |
| ---- | --- |
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change without behaviour change |
| `test` | Tests only |
| `doc` | Documentation |
| `chore` | Tooling, dependencies, CI |

Reference issues when relevant (`Fixes #123`).

### Pull request process

- Target branch: **`main`** on `IGNF/gpu-entree-carto`.
- Before opening the PR:
  - Run **`npm run verify`** (or `make verify` without CodeQL if not installed).
  - Run **`make test`** when behaviour changes.
  - Update **`doc/`** for new or changed map controls (page + `doc/README.md` index).
  - Update **[CHANGELOG.md](CHANGELOG.md)** and **[CHANGELOG.fr.md](CHANGELOG.fr.md)** under `Unreleased` for user-visible changes.
  - Add yourself to **[CONTRIBUTORS.md](CONTRIBUTORS.md)** if this is your first contribution.
- Describe the change, how you tested it, and link related issues.
- Address review feedback with new commits on the same branch; the PR updates automatically.
- Maintainers merge after review (approval policy depends on repository settings).

## License

By contributing, you agree that your contributions will be licensed under the project’s **[CeCILL-B licence](LICENCE.md)**.

Ensure you have the rights to submit your work (no incompatible third-party code, no undisclosed encumbrances). If your employer has IP policies, comply with them before contributing.
