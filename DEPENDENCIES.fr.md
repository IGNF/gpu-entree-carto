# DÉPENDANCES (25/09/2026)

[![en](https://img.shields.io/badge/lang-en-red.svg)](DEPENDENCIES.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](DEPENDENCIES.fr.md)

**Dépendances directes** déclarées dans `package.json` (versions indicatives après `npm install` en développement). Les bundles publiés dans `dist/` embarquent une partie de l’arbre npm (OpenLayers, Vue, geopf, DSFR, etc.).

Régénération locale :

```bash
npm ls --depth=0
```

## Exécution (`dependencies`)

| Paquet | Version (exemple) | Rôle |
| ------ | ----------------- | ---- |
| `@gouvfr/dsfr` | 1.15.3 | Système de design de l’État (CSS, composants) |
| `@gouvminint/vue-dsfr` | 8.20.0 | Composants Vue 3 DSFR |
| `@iconify/vue` | 5.0.x | Icônes (UI) |
| `dompurify` | 3.4.x | Assainissement HTML |
| `fast-xml-parser` | 5.8.0 | Parsing XML (KML, métadonnées) |
| `geopf-extensions-openlayers` | 1.0.0-beta.14 | Extensions Géoplateforme (SearchEngine, widgets OL) |
| `notivue` | 2.4.x | Notifications toast (démo) |
| `ol` | 10.10.x | OpenLayers |
| `remixicon` | 4.9.x | Pictogrammes (complément DSFR) |
| `vue` | 3.5.x | Framework UI |
| `vue-router` | 5.0.3 | Routage SPA (démo) |

## Développement (`devDependencies`)

| Paquet | Version (exemple) | Rôle |
| ------ | ----------------- | ---- |
| `@eslint/js`, `eslint`, `eslint-plugin-vue`, `typescript-eslint`, `eslint-config-prettier` | voir `npm ls` | Lint |
| `@vitejs/plugin-vue` | 6.0.x | Build Vue (Vite) |
| `@vue/eslint-config-typescript` | 14.x | Règles ESLint Vue + TypeScript |
| `@vue/test-utils` | 2.5.x | Tests composants |
| `@types/dompurify`, `@types/node` | — | Types TypeScript |
| `globals` | 17.x | ESLint flat config |
| `husky` | 9.x | Hooks Git (pre-commit) |
| `jsdom` | 30.x | Environnement Vitest |
| `prettier` | 3.9.x | Formatage |
| `typescript` | 5.7.x | Typage statique |
| `vite` | 6.4.x | Bundler / serveur de dev |
| `vitest` | 4.1.x | Tests unitaires |
| `vue-tsc` | 3.3.x | Vérification TS des SFC Vue |

## Transitives notables

`geopf-extensions-openlayers` et `ol` entraînent des bibliothèques additionnelles (ex. proj4). Inspection :

```bash
npm ls ol geopf-extensions-openlayers
```

Pour un audit licence complet des transitive :

```bash
npm ls --all --omit=dev
```

(ou un outil dédié type `license-checker` si requis par votre processus de publication.)
