# Intégration dans un site tiers (gpu-site)

Guide pour remplacer **gpu-client** par **entree-carto** dans [gpu-site](https://gitlab.gpf-tech.ign.fr/gpu/gpu-site) (branche `dsfr`).

---

## Objectif

gpu-site charge aujourd’hui gpu-client comme bibliothèque JS (`window.gpu`) via npm + webpack.  
entree-carto fournit le même point d’entrée global **`window.gpu`** et un dossier **`dist/`** prêt à copier dans `public/build/vendor/`.

---

## Contenu de `dist/` (bibliothèque)

Après `make build-lib` et `make build-geometry-editor` :

```
dist/
  entree-carto.js / .min.js
  entree-carto-geometry-editor.js / .min.js   # mini-carte formulaires (remplace ol-geometry-editor)
  css/
    entree-carto.css / .min.css
    entree-carto-geometry-editor.css / .min.css
```

Vue 3, OpenLayers ≥ 9 et les styles carte sont **inclus dans le bundle** (plus besoin d’OpenLayers v4 côté site pour la carte).  
Le geometry-editor embarque aussi OpenLayers (bundle autonome pour les pages formulaire).

---

## API exposée (`window.gpu`)

| Membre | Statut | Usage gpu-site |
|--------|--------|----------------|
| `gpu.config` | Compatible | Enrichi par `gpu_client_config.js.twig` |
| `gpu.createStandardViewer(params)` | Partiel | `/map/` — carte + centrage si `params.search` |
| `gpu.mountSearchEngine(el, opts)` | Oui | Accueil — même SearchEngine que la carte → redirect `/map/` |
| `gpu.mountLocationSearch(el, opts)` | Fallback | Accueil — autocomplete seul |
| `gpu.ParcelViewer` | Stub | `/map/parcel-info/` — carte seule, pas de fiche parcelle |
| `gpu.services.Geocode` | Partiel | Accueil — autocomplétion (Gp ou fetch Géoplateforme) |
| `gpu.control.LocateControl` | Compatible | Filtres d’autocomplétion accueil |

### Limites actuelles (à prévoir côté gpu-site)

Les pages suivantes **ne sont pas totalement fonctionnelles** tant que les fonctionnalités ne sont pas portées depuis gpu-client :

| Page gpu-site | Route | Manques principaux |
|---------------|-------|-------------------|
| Cartographie | `/map/` | Couches métier, légende, fiche info, outils, document, recherche |
| Fiche parcelle | `/map/parcel-info/{id}/` | Fiche info parcelle, légende parcelle, échelle dédiée |
| Accueil (géoloc) | `/` | OK si `Gp` chargé ; pas de carte |

---

## Étapes d’intégration dans gpu-site

### 1. Dépendance npm

Dans `package.json` de gpu-site, remplacer gpu-client. En local (clones voisins) :

```json
"entree-carto": "file:../entree-carto"
```

En CI / après publication de `main` avec `dist/` à jour :

```json
"entree-carto": "git+https://gitlab.gpf-tech.ign.fr/gpu/entree-carto.git#main"
```

Puis `npm install` (et `make build-lib` dans entree-carto si dépendance `file:`).

### 2. Webpack — copie des assets

Dans `webpack.config.js`, remplacer la copie gpu-client :

```js
{ from: "node_modules/gpu-client/dist", to: "vendor/gpu-client" },
```

par :

```js
{ from: "node_modules/entree-carto/dist", to: "vendor/entree-carto" },
```

### 3. Templates Twig — cartographie (`templates/map/index.html.twig`)

**Retirer** (OpenLayers v4 — bundlé dans entree-carto) :

```twig
<link rel="stylesheet" href="{{ asset('build/gpu/css/ol.css') }}" />
<script src="{{ asset('build/gpu/js/openlayers/ol.js') }}"></script>
```

**Remplacer** gpu-client par entree-carto :

```twig
<link rel="stylesheet" href="{{ asset('build/vendor/entree-carto/css/entree-carto.css') }}" />
<script src="{{ asset('build/vendor/entree-carto/entree-carto.js') }}"></script>
```

Conserver :

- `GpServices.js` (géocodage accueil / services Géoplateforme)
- `gpu_map_client_config_js` (config dynamique)
- `cartographie.js` (appelle `gpu.createStandardViewer`)

### 4. Template fiche parcelle (`templates/map/parcel.html.twig`)

Même remplacement CSS/JS que ci-dessus.  
`parcel.js` reste inchangé ; `ParcelViewer` affiche une carte minimale et logue un avertissement.

### 5. Page d’accueil (`templates/default/index.html.twig` + banner)

```twig
<link rel="stylesheet" href="{{ asset('build/vendor/entree-carto/css/entree-carto.min.css') }}" />
<script src="{{ asset('build/vendor/entree-carto/entree-carto.min.js') }}"></script>
```

**Remplacer** le formulaire gazetteer (`#searchForm` / `callGazetteerService.js`) par le **même** SearchEngine que sur la carte :

```twig
{# banner_part.html.twig #}
<div
  id="gpu-location-search"
  data-map-url="{{ path('gpu_map') }}"
  data-placeholder="{{ 'home.search_place'|trans({}) }}"
></div>
```

```js
// assets/js/mountLocationSearchHome.js
gpu.mountSearchEngine(document.getElementById('gpu-location-search'), {
  mode: 'redirect',
  mapUrl: el.getAttribute('data-map-url') || '/map/',
  method: 'POST',
  placeholder: el.getAttribute('data-placeholder') || '…',
});
```

Voir [mountSearchEngine.md](./mountSearchEngine.md).  
Fallback léger : `gpu.mountLocationSearch` ([LocationSearchWidget.md](./LocationSearchWidget.md)).

### 6. Config JavaScript

Le fichier `templates/map/gpu_client_config.js.twig` peut rester tel quel : il fait `Object.assign(gpu.config, { … })`.  
Renommage optionnel ultérieur en `map_config.js.twig`.

### 7. CSS site

`assets/css/gpu-map.css` cible `#gpu-map` : entree-carto pose `id="gpu-map"` sur le conteneur carte pour conserver la hauteur (726 px).

Adapter au fil de l’eau les sélecteurs liés aux anciens contrôles gpu-client (`.ol-control`, panneaux, etc.).

**Icônes :** gpu-site charge déjà le DSFR (`dsfr.min.css` + `utility/utility.min.css`). Le bundle entree-carto inclut aussi geopf DSFR + `icons.min.css`. Les boutons geopf avec `fr-icon-*` (fermer, supprimer…) peignaient l’icône deux fois (`::before` DSFR + `::after` geopf à 100 % du bouton). Corrigé dans `map-controls.css` (neutralisation de `::after` si `fr-icon-*` est présent).

---

## Ordre de chargement des scripts (cartographie)

```html
<script src="…/geoportal-access-lib/GpServices.js"></script>
<script src="…/entree-carto/entree-carto.js"></script>
<script src="/map/gpu-client-config.js"></script>  {# gpu.config + LAYER_CONFIG… #}
<script src="…/gpu/js/map/cartographie.js"></script>
```

**Ne plus charger** `ol.js` v4 sur ces pages.

---

## Build entree-carto avant publication

```sh
cd entree-carto
make install
make build-lib   # ou make build (démo + lib)
```

Vérifier la présence de `dist/entree-carto.js` et `dist/entree-carto.min.js` avant tag / merge sur `main`.

---

## Développement local couplé

```sh
# Terminal 1 — entree-carto
cd ../entree-carto && make dev

# Terminal 2 — gpu-site (branche dsfr, après intégration npm link ou path)
cd ../gpu-site && npm install && npm run watch
```

Pour tester sans publier : dans gpu-site `package.json` :

```json
"entree-carto": "file:../entree-carto"
```

Puis `npm install` et `make build-lib` dans entree-carto.

---

## Feuille de route fonctionnelle

- [ ] `createStandardViewer` : couches WMS/WFS, légende, fiche info, outils
- [x] Recherche lieu accueil → `/map/` (`mountSearchEngine` + `params.search` → `SearchEngineControl.initialSearch`)
- [ ] `ParcelViewer` complet
- [x] Shell panneau latéral 4 onglets (`TabPanelsControl`) + switchers stubs
- [ ] Brancher `layerConfig` / légendes depuis gpu-client-config
- [ ] GetFeatureInfo → fiche + raw
- [ ] Éviter le double chargement DSFR / `icons` (site `utility.min.css` + bundle) si nécessaire
- [x] Doublon d’icônes geopf `::after` + DSFR `fr-icon-*` (fixé dans `map-controls.css`)
- [ ] Tests d’intégration gpu-site (parcours carte, parcelle, accueil)

---

## Voir aussi

- [README projet](../README.md)
- [Contrôles carte](./README.md)
- Référence historique : [gpu-client](https://gitlab.gpf-tech.ign.fr/gpu/gpu-client)
