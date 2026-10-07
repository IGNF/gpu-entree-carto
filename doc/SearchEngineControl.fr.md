[![en](https://img.shields.io/badge/lang-en-red.svg)](SearchEngineControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](SearchEngineControl.fr.md)

# SearchEngineControl

Barre de recherche Géoplateforme complète (`SearchEngineAdvanced`) : lieux, géolocalisation, recherche avancée.

**Source :** `src/components/map/SearchEngineControl.vue`  
**Référence :** [cartes.gouv.fr](https://cartes.gouv.fr/explorer-les-cartes/) — `SearchEngine.vue` (clone `cartes.gouv.fr-entree-carto`)  
**Dépendance :** `geopf-extensions-openlayers` (`SearchEngineAdvanced`, `InseeAdvancedSearch`, `LocationAdvancedSearch`, `CoordinateAdvancedSearch`, `ParcelAdvancedSearch`)

Au build, le plugin Vite `patchGeopfSearchEval` (`vite.geopfPlugins.ts`) remplace l’`eval` de `Services/Search.js` (upstream) par une affectation de chaîne — nos URLs de service sont des HTTPS fixes.

## Props

| Prop             | Type                           | Défaut                    | Description                                                                  |
| ---------------- | ------------------------------ | ------------------------- | ---------------------------------------------------------------------------- |
| `placeholder`    | `string`                       | `'Rechercher un lieu...'` | Placeholder du champ principal                                               |
| `collapsed`      | `boolean`                      | `false`                   | Barre repliée au chargement                                                  |
| `collapsible`    | `boolean`                      | `false`                   | Autorise le repli                                                            |
| `serviceBaseUrl` | `string`                       | `'https://data.geopf.fr'` | Base URL géocodage / WFS Géoplateforme                                       |
| `initialSearch`  | `StandardViewerSearch \| null` | `null`                    | Rejoue une recherche (accueil → carte) : même géocode que le clic suggestion |

## Comportement

- Autocomplétion / géocode IGN (services Géoplateforme)
- Bouton **Avancée** : Code INSEE, Lieux et toponymes, Coordonnées, Parcelles cadastrales
- **Me géolocaliser** (navigateur) dans l’autocomplete et le panneau avancé
- Marqueurs / popup / emprise (`returnTrueGeometry`) gérés par geopf
- Les recherches avancées reçoivent `searchOptions.serverUrl` (sinon geopf passe `{}` → `url.split is not a function`)
- `initialSearch` : préremplit le champ et appelle `baseSearchEngine.search({ location })` → **cerise**, emprise, popup (pas de marqueur rouge custom)
- `initialSearch` avec `type: 'geolocate'` (accueil **Me géolocaliser** → `/map`) : `createMarker` + fiche TabPanels **sans** géocode texte (sinon le service échoue sur « Ma localisation » et geopf vide la couche → plus de marker)
- Si un [TabPanelsControl](./TabPanelsControl.fr.md) est monté : ouvre l’onglet fiche **avant** le marker, puis recentre la vue avec un **padding à droite** (= largeur du panneau) pour que marker + popup geopf restent visibles (sinon `view.fit` centre sous le panneau opaque) ; réattache le pin si la couche a été vidée et impose un style pin visible
- Recherche par localisation avec coordonnées : mise à jour du fragment **`mlon` / `mlat`** (cerise) via `setMapPermalinkMarker` — voir [MapPermalink](./MapPermalink.fr.md)
- Contenu de l’onglet fiche après chaque événement geopf `search` (et `initialSearch`) : `loadFicheForSearch` selon le mode [MapModeSelector](./MapModeSelector.fr.md) — parcelle ou document aux coordonnées du résultat (`ficheInfoService`, API ou APICarto)
- Recentrage **animé** sur l’**emprise complète** du résultat (cerise + polygone `trueGeometry` / pointillés), `maxZoom: 15` comme geopf — geopf ne fait plus de `fit` instantané (`SearchEngineAdvancedAnimated`) ; padding à droite si le panneau fiche est ouvert
- **Bouton Rechercher (loupe)** — si le champ affiche encore le libellé du dernier lieu trouvé, l’autocomplétion est fermée et la vue a bougé depuis cette recherche, un clic sur la loupe recentre l’**emprise mémorisée de la recherche lieu** (geopf / cerise — pas l’emprise rouge du mode), puis met à jour emprise mode et fiche (`placeSearchSubmitReplay.ts`)
- Les **formulaires avancés** n’émettent pas l’événement geopf `search` — `SearchEngineAdvancedAnimated.onAdvancedSearchResult` le redispatche après `addResultToMap` pour aligner cerise, animation, fiche et `mlon`/`mlat` sur l’autocomplete
- La fiche depuis la recherche (`loadFicheForSearch`) **ne rappelle pas** `createMarker` (`skipLocationMarker`) afin de conserver cerise et emprise pendant le chargement APICarto
- **Pas de popup** geopf sur la carte (`SearchEngineAdvancedAnimated._setPopupInfo` + CSS) — informations dans l’onglet fiche uniquement
- Conserve l’emprise **lieu** geopf (`trueGeometry`) et le vol animé ; ajoute la même **emprise mode** qu’au clic (parcelle rouge ; Territoire : commune rouge, arrondissement orange + commune ville à Paris/Lyon/Marseille) sans modifier la cible de zoom de la recherche
- Popup géoloc : contenu au format geopf (`<strong>…</strong><br/>…`, sans `<p>`) + correctif CSS appendice (trait entre bulle et pointe)
- Accueil hors carte : [mountSearchEngine](./mountSearchEngine.fr.md)
- Fallback autocomplete seul : [LocationSearchWidget](./LocationSearchWidget.fr.md)

## Placement

**Haut-gauche** via CSS (`.gpf-widget[id^='GPsearchEngine-Advanced']`), pas via `position` geopf.  
Si **SketchControl** est monté : décalage horizontal `--ec-search-left-inset` (= largeur colonne croquis + gap) pour éviter le chevauchement avec la barre d’outils et les panneaux autocomplete / avancée.

## Dépendances

- Enfant de `MapShell`
- CSS geopf `Dsfr.css` + `map-controls.css`
- HTTPS / permission navigateur pour la géoloc
