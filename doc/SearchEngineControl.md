# SearchEngineControl

Barre de recherche Géoplateforme complète (`SearchEngineAdvanced`) : lieux, géolocalisation, recherche avancée.

**Source :** `src/components/map/SearchEngineControl.vue`  
**Référence :** [cartes.gouv.fr](https://cartes.gouv.fr/explorer-les-cartes/) — `SearchEngine.vue` (clone `cartes.gouv.fr-entree-carto`)  
**Dépendance :** `geopf-extensions-openlayers` (`SearchEngineAdvanced`, `InseeAdvancedSearch`, `LocationAdvancedSearch`, `CoordinateAdvancedSearch`, `ParcelAdvancedSearch`)

## Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `placeholder` | `string` | `'Rechercher un lieu...'` | Placeholder du champ principal |
| `collapsed` | `boolean` | `false` | Barre repliée au chargement |
| `collapsible` | `boolean` | `false` | Autorise le repli |
| `serviceBaseUrl` | `string` | `'https://data.geopf.fr'` | Base URL géocodage / WFS Géoplateforme |

## Comportement

- Autocomplétion / géocode IGN (services Géoplateforme)
- Bouton **Avancée** : Code INSEE, Lieux et toponymes, Coordonnées, Parcelles cadastrales
- **Me géolocaliser** (navigateur) dans l’autocomplete et le panneau avancé
- Marqueurs / popup de résultat gérés par geopf
- Les recherches avancées reçoivent `searchOptions.serverUrl` (sinon geopf passe `{}` → `url.split is not a function`)
- Recherche initiale depuis l’accueil : voir `SearchAtInit` + `params.search` (`createStandardViewer`) ; widget hors carte : [LocationSearchWidget](./LocationSearchWidget.md)

## Placement

**Haut-gauche** via CSS (`.gpf-widget[id^='GPsearchEngine-Advanced']`), pas via `position` geopf.

## Dépendances

- Enfant de `MapShell`
- CSS geopf `Dsfr.css` + `map-controls.css`
- HTTPS / permission navigateur pour la géoloc
