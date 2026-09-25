[![en](https://img.shields.io/badge/lang-en-red.svg)](mountSearchEngine.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](mountSearchEngine.fr.md)

# mountSearchEngine

Mounts the **same** control as on the map (`SearchEngineAdvanced`) outside `MapShell` (gpu-site home page).

**Source:** `src/lib/mountSearchEngine.ts`  
**Shared factory:** `src/lib/search/createSearchEngineAdvanced.ts` (also used by `SearchEngineControl.vue`)  
**API:** `gpu.mountSearchEngine(container, options)`  
**CSS:** loaded via `entree-carto-search-engine` bundle (`css/entree-carto-search-engine.min.css`), no longer on the main map bundle JS path — see [LibCssBundles.md](./LibCssBundles.md).

## Options

| Option           | Type                   | Default                 | Description                                           |
| ---------------- | ---------------------- | ----------------------- | ----------------------------------------------------- |
| `mode`           | `'redirect' \| 'emit'` | `'redirect'`            | HTML form to map page, or callback only (SPA)         |
| `mapUrl`         | `string`               | `'/map/'`               | Target URL (`redirect`)                               |
| `method`         | `'GET' \| 'POST'`      | `'POST'`                | Form method (`redirect`, gpu-site = POST)             |
| `placeholder`    | `string`               | address / city / place… | Bar placeholder                                       |
| `serviceBaseUrl` | `string`               | `https://data.geopf.fr` | Service base                                          |
| `onSelect`       | `(loc) => void`        | —                       | Callback on validation                              |

## Behaviour

- Same UX as the map: autocomplete, **Advanced** (INSEE, places, coords, parcels), **Locate me**
- Minimal invisible OL map (required by geopf for coords / geoloc / markers)
- **`redirect`**: form fields `municipality` / `position_x` / `position_y` / `type` (gpu-site compatible)
- **`emit`** (SPA demo): `onSelect` + `prepareLocationHandoff` / `router.push` — `StandardViewerSearch` object in memory, no query or POST
- **Locate me** → `type: 'geolocate'`, EPSG:4326 coords; on the map, [SearchEngineControl](./SearchEngineControl.md) replaces the marker + opens the info tab (without re-geocoding the label)
- Listens: `select`, `search`, `searchengineadvanced:geolocation:click` + advanced forms `search`
- Suggestions use `position: fixed`; **Advanced** panel uses `position: absolute` (100% of widget) — `attachStandalonePopoverSync`, visible despite gpu-site banner `overflow`

## SPA demo example

```js
import { prepareLocationHandoff } from '…/locationSearch'

gpu.mountSearchEngine(el, {
  mode: 'emit',
  onSelect: (location) => {
    prepareLocationHandoff(location)
    router.push({ name: 'map' })
  },
})
// On /map: takeLocationHandoff() → SearchEngineControl initialSearch
```

## gpu-site example

```js
gpu.mountSearchEngine(document.getElementById('gpu-location-search'), {
  mode: 'redirect',
  mapUrl: '/map/',
  method: 'POST',
  placeholder: 'Rechercher une adresse, une ville, un lieu...',
})
```

## Fallback

[LocationSearchWidget](./LocationSearchWidget.md) / `mountLocationSearch`: autocomplete only, lighter weight.
