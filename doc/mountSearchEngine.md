# mountSearchEngine

Monte le **même** contrôle que la carte (`SearchEngineAdvanced`) hors `MapShell` (accueil gpu-site).

**Source :** `src/lib/mountSearchEngine.ts`  
**Factory partagée :** `src/lib/search/createSearchEngineAdvanced.ts` (aussi utilisée par `SearchEngineControl.vue`)  
**API :** `gpu.mountSearchEngine(container, options)`

## Options

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `mode` | `'redirect' \| 'emit'` | `'redirect'` | Formulaire HTML vers la carte, ou callback seul (SPA) |
| `mapUrl` | `string` | `'/map/'` | URL cible (`redirect`) |
| `method` | `'GET' \| 'POST'` | `'POST'` | Méthode formulaire (`redirect`, gpu-site = POST) |
| `placeholder` | `string` | adresse / ville / lieu… | Placeholder barre |
| `serviceBaseUrl` | `string` | `https://data.geopf.fr` | Base services |
| `onSelect` | `(loc) => void` | — | Callback à la validation |

## Comportement

- UX identique à la carte : autocomplete, **Avancée** (INSEE, lieux, coords, parcelles), **Me géolocaliser**
- Carte OL minimale invisible (requis par geopf pour coords / géoloc / marqueurs)
- **`redirect`** : formulaire `municipality` / `position_x` / `position_y` / `type` (compat gpu-site)
- **`emit`** (démo SPA) : `onSelect` + `prepareLocationHandoff` / `router.push` — objet `StandardViewerSearch` en mémoire, sans query ni POST
- **Me géolocaliser** → `type: 'geolocate'`, coords EPSG:4326 ; sur la carte, [SearchEngineControl](./SearchEngineControl.md) repose le marker + ouvre la fiche (sans re-géocoder le libellé)
- Écoute : `select`, `search`, `searchengineadvanced:geolocation:click` + `search` des forms avancés
- Suggestions / panneau **Avancée** en `position: fixed`, ancrés à la barre (`attachStandalonePopoverSync`) — visibles malgré `overflow` des bannières gpu-site, suivent scroll / resize

## Exemple démo SPA

```js
import { prepareLocationHandoff } from '…/locationSearch'

gpu.mountSearchEngine(el, {
  mode: 'emit',
  onSelect: (location) => {
    prepareLocationHandoff(location)
    router.push({ name: 'map' })
  },
})
// Sur /map : takeLocationHandoff() → SearchEngineControl initialSearch
```

## Exemple gpu-site

```js
gpu.mountSearchEngine(document.getElementById('gpu-location-search'), {
  mode: 'redirect',
  mapUrl: '/map/',
  method: 'POST',
  placeholder: 'Rechercher une adresse, une ville, un lieu...',
});
```

## Fallback

[LocationSearchWidget](./LocationSearchWidget.md) / `mountLocationSearch` : autocomplete seul, plus léger.
