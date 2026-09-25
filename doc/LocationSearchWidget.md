[![en](https://img.shields.io/badge/lang-en-red.svg)](LocationSearchWidget.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](LocationSearchWidget.fr.md)

# LocationSearchWidget

**Off-map place search** widget (autocomplete only) — lightweight **fallback**.

For gpu-site home with the **same UX as the map**, prefer [`gpu.mountSearchEngine`](./mountSearchEngine.md).

**Source:** `src/components/search/LocationSearchWidget.vue`  
**Lib mount:** `gpu.mountLocationSearch(container, options)` — `src/lib/mountLocationSearch.ts`  
**Dedicated bundle:** `entree-carto-location-search.js` + `css/entree-carto-location-search.min.css` ([LibCssBundles.md](./LibCssBundles.md))

## Props / options

| Option             | Type                   | Default                     | Description                               |
| ------------------ | ---------------------- | --------------------------- | ----------------------------------------- |
| `label`            | `string`               | `'Rechercher par lieu:'`    | Accessible label                          |
| `placeholder`      | `string`               | `'Rechercher une adresse…'` | Field placeholder                         |
| `mode`             | `'redirect' \| 'emit'` | `'redirect'`                | Map redirect or callback only             |
| `mapUrl`           | `string`               | `'/map/'`                   | Target URL (`gpu_map` route)              |
| `method`           | `'GET' \| 'POST'`      | `'POST'`                    | Navigation method (gpu-site = POST)       |
| `maximumResponses` | `number`               | `10`                        | Max suggestions                           |
| `initialQuery`     | `string`               | `''`                        | Initial text                              |
| `onSelect`         | `(loc) => void`        | —                           | Callback on selection (always called)     |

## Behaviour

- Autocomplete via `gpu.services.Geocode` (Gp if loaded, otherwise Géoplateforme API)
- Filtering / labels via `LocateControl`
- On selection in `redirect` mode: `municipality`, `position_x`, `position_y`, `type` to `mapUrl`
- No Advanced panel / geopf geoloc (see `mountSearchEngine`)
