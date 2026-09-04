# LocationSearchWidget

Widget de **recherche de lieu hors carte** (autocomplete seul) — **fallback** léger.

Pour l’accueil gpu-site avec la **même UX que la carte**, préférer [`gpu.mountSearchEngine`](./mountSearchEngine.md).

**Source :** `src/components/search/LocationSearchWidget.vue`  
**Montage lib :** `gpu.mountLocationSearch(container, options)` — `src/lib/mountLocationSearch.ts`

## Props / options

| Option             | Type                   | Défaut                      | Description                               |
| ------------------ | ---------------------- | --------------------------- | ----------------------------------------- |
| `label`            | `string`               | `'Rechercher par lieu:'`    | Label accessible                          |
| `placeholder`      | `string`               | `'Rechercher une adresse…'` | Placeholder champ                         |
| `mode`             | `'redirect' \| 'emit'` | `'redirect'`                | Redirection carte ou callback seul        |
| `mapUrl`           | `string`               | `'/map/'`                   | URL cible (route `gpu_map`)               |
| `method`           | `'GET' \| 'POST'`      | `'POST'`                    | Méthode de navigation (gpu-site = POST)   |
| `maximumResponses` | `number`               | `10`                        | Max suggestions                           |
| `initialQuery`     | `string`               | `''`                        | Texte initial                             |
| `onSelect`         | `(loc) => void`        | —                           | Callback à la sélection (toujours appelé) |

## Comportement

- Autocomplétion via `gpu.services.Geocode` (Gp si chargé, sinon API Géoplateforme)
- Filtrage / libellés via `LocateControl`
- À la sélection en mode `redirect` : `municipality`, `position_x`, `position_y`, `type` vers `mapUrl`
- Pas de panneau Avancée / géoloc geopf (voir `mountSearchEngine`)
