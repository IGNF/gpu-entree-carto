# mountSearchEngine

Monte le **même** contrôle que la carte (`SearchEngineAdvanced`) hors `MapShell` (accueil gpu-site).

**Source :** `src/lib/mountSearchEngine.ts`  
**Factory partagée :** `src/lib/search/createSearchEngineAdvanced.ts` (aussi utilisée par `SearchEngineControl.vue`)  
**API :** `gpu.mountSearchEngine(container, options)`

## Options

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `mode` | `'redirect' \| 'emit'` | `'redirect'` | Redirection carte ou callback seul |
| `mapUrl` | `string` | `'/map/'` | URL cible |
| `method` | `'GET' \| 'POST'` | `'POST'` | Méthode (gpu-site = POST) |
| `placeholder` | `string` | adresse / ville / lieu… | Placeholder barre |
| `serviceBaseUrl` | `string` | `https://data.geopf.fr` | Base services |
| `onSelect` | `(loc) => void` | — | Callback à la validation |

## Comportement

- UX identique à la carte : autocomplete, **Avancée** (INSEE, lieux, coords, parcelles), **Me géolocaliser**
- Carte OL minimale invisible (requis par geopf pour coords / géoloc / marqueurs)
- À la validation → `municipality`, `position_x`, `position_y`, `type` vers `mapUrl`
- Écoute : `select`, `search`, `searchengineadvanced:geolocation:click` + `search` des forms avancés
- Suggestions / panneau **Avancée** en `position: fixed`, ancrés à la barre (`attachStandalonePopoverSync`) — visibles malgré `overflow` des bannières gpu-site, suivent scroll / resize

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
