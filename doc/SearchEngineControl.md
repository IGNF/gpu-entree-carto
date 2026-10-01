[![en](https://img.shields.io/badge/lang-en-red.svg)](SearchEngineControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](SearchEngineControl.fr.md)

# SearchEngineControl

Full Géoplateforme search bar (`SearchEngineAdvanced`): places, geolocation, advanced search.

**Source:** `src/components/map/SearchEngineControl.vue`  
**Reference:** [cartes.gouv.fr](https://cartes.gouv.fr/explorer-les-cartes/) — `SearchEngine.vue` (clone `cartes.gouv.fr-entree-carto`)  
**Dependency:** `geopf-extensions-openlayers` (`SearchEngineAdvanced`, `InseeAdvancedSearch`, `LocationAdvancedSearch`, `CoordinateAdvancedSearch`, `ParcelAdvancedSearch`)

At build time, Vite plugin `patchGeopfSearchEval` (`vite.geopfPlugins.ts`) replaces `eval` in `Services/Search.js` (upstream) with a string assignment — our service URLs are fixed HTTPS endpoints.

## Props

| Prop             | Type                           | Default                   | Description                                                                  |
| ---------------- | ------------------------------ | ------------------------- | ---------------------------------------------------------------------------- |
| `placeholder`    | `string`                       | `'Rechercher un lieu...'` | Main field placeholder                                                       |
| `collapsed`      | `boolean`                      | `false`                   | Bar collapsed on load                                                        |
| `collapsible`    | `boolean`                      | `false`                   | Allow collapsing                                                             |
| `serviceBaseUrl` | `string`                       | `'https://data.geopf.fr'` | Geocoding / WFS base URL                                                     |
| `initialSearch`  | `StandardViewerSearch \| null` | `null`                    | Replay a search (home → map): same geocode as clicking a suggestion          |

## Behaviour

- IGN autocomplete / geocode (Géoplateforme services)
- **Advanced** button: INSEE code, places and toponyms, coordinates, cadastral parcels
- **Locate me** (browser) in autocomplete and advanced panel
- Markers / popup / extent (`returnTrueGeometry`) handled by geopf
- Advanced searches receive `searchOptions.serverUrl` (otherwise geopf passes `{}` → `url.split is not a function`)
- `initialSearch`: prefills the field and calls `baseSearchEngine.search({ location })` → cherry marker, extent, popup (no custom red marker)
- `initialSearch` with `type: 'geolocate'` (home **Locate me** → `/map`): `createMarker` + TabPanels info tab **without** text geocode (otherwise the service fails on “Ma localisation” and geopf clears the layer → no marker)
- When [TabPanelsControl](./TabPanelsControl.md) is mounted: opens the info tab **before** the marker, then recentres the view with **right padding** (= panel width) so marker + geopf popup stay visible (otherwise `view.fit` centres under the opaque panel); reattaches the pin if the layer was cleared and enforces a visible pin style
- Location search with coordinates updates the URL hash **`mlon` / `mlat`** (cherry position) via `setMapPermalinkMarker` — see [MapPermalink](./MapPermalink.md)
- Fiche tab content after each geopf `search` event (and `initialSearch`): `loadFicheForSearch` via [MapModeSelector](./MapModeSelector.md) mode — parcel or document at result coordinates (`ficheInfoService`, API or APICarto)
- **Animated** fly-to to the full result **extent** (cherry + `trueGeometry` dashed polygon), `maxZoom: 15` like geopf — instant geopf `fit` disabled via `SearchEngineAdvancedAnimated`; extra right padding when the fiche panel is open
- **Search submit (magnifying glass)** — if the main field still shows the last resolved place label, the autocomplete list is closed, and the map view has moved since that search, clicking submit recentres on the **stored place search extent** (geopf / cherry — not the red mode emprise), then refreshes mode emprise and fiche (`placeSearchSubmitReplay.ts`)
- **Advanced forms** do not emit geopf `search` by default — `SearchEngineAdvancedAnimated.onAdvancedSearchResult` dispatches it after `addResultToMap` so pin styling, animation, fiche, and `mlon`/`mlat` match autocomplete
- Fiche load from search (`loadFicheForSearch`) skips `createMarker` (`skipLocationMarker`) so cherry and extent stay visible while APICarto loads
- **No geopf map popup** (`SearchEngineAdvancedAnimated._setPopupInfo` + CSS) — details only in the fiche tab
- Keeps the geopf **place** dashed extent (`trueGeometry`) and animated fly-to; adds the same **mode emprise** as click-info (red parcel; Territoire: red commune, orange arrondissement + city commune in Paris/Lyon/Marseille) without changing the search zoom target
- Geoloc popup: geopf content format (`<strong>…</strong><br/>…`, no `<p>`) + CSS fix for append (line between bubble and pointer)
- Off-map home: [mountSearchEngine](./mountSearchEngine.md)
- Lightweight autocomplete fallback: [LocationSearchWidget](./LocationSearchWidget.md)

## Placement

**Top-left** via CSS (`.gpf-widget[id^='GPsearchEngine-Advanced']`), not geopf `position`.  
When **SketchControl** is mounted: horizontal offset `--ec-search-left-inset` (= sketch column width + gap) to avoid overlap with the toolbar and autocomplete / advanced panels.

## Dependencies

- Child of `MapShell`
- geopf CSS `Dsfr.css` + `map-controls.css`
- HTTPS / browser permission for geolocation
