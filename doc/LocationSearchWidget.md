# LocationSearchWidget

Widget de **recherche de lieu hors carte** (page d’accueil gpu-site), même contrat de données que l’ancien formulaire gazetteer.

**Source :** `src/components/search/LocationSearchWidget.vue`  
**Montage lib :** `gpu.mountLocationSearch(container, options)` — `src/lib/mountLocationSearch.ts`  
**Remplace :** `#searchForm` / `callGazetteerService.js` (typeahead jQuery)

## Props / options

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `label` | `string` | `'Rechercher par lieu:'` | Label accessible |
| `placeholder` | `string` | `'Rechercher une adresse…'` | Placeholder champ |
| `mode` | `'redirect' \| 'emit'` | `'redirect'` | Redirection carte ou callback seul |
| `mapUrl` | `string` | `'/map/'` | URL cible (route `gpu_map`) |
| `method` | `'GET' \| 'POST'` | `'POST'` | Méthode de navigation (gpu-site = POST) |
| `maximumResponses` | `number` | `10` | Max suggestions |
| `initialQuery` | `string` | `''` | Texte initial |
| `onSelect` | `(loc) => void` | — | Callback à la sélection (toujours appelé) |

## Comportement

- Autocomplétion via `gpu.services.Geocode` (Gp si chargé, sinon `https://data.geopf.fr/geocodage/completion`)
- Filtrage / libellés via `LocateControl` (comme l’ancien gazetteer)
- À la sélection en mode `redirect` : envoie `municipality`, `position_x`, `position_y`, `type` vers `mapUrl`
- La page carte consomme ces params via `createStandardViewer({ search })` → centrage + marqueur (`SearchAtInit`)

## Exemple gpu-site (banner)

```html
<div id="gpu-location-search"></div>
<link rel="stylesheet" href="…/entree-carto/css/entree-carto.min.css" />
<script src="…/entree-carto/entree-carto.min.js"></script>
<script>
  gpu.mountLocationSearch(document.getElementById('gpu-location-search'), {
    mode: 'redirect',
    mapUrl: '/map/',
    method: 'POST',
    label: 'Rechercher par lieu:',
    placeholder: 'Rechercher une adresse, une ville, un lieu...',
  });
</script>
```

## Placement

Indépendant de `MapShell` — n’importe quel conteneur DOM (bandeau accueil, header, etc.).
