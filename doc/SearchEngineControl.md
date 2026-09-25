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
