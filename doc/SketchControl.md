# SketchControl

Contrôle OpenLayers de **croquis** (dessin / édition de géométries) réutilisable par la carte principale et par `GeometryEditor`.

**Sources :**
- Classe : `src/geometry-editor/SketchControl.ts`
- Wrapper Vue : `src/components/map/SketchControl.vue`
- Standalone : `src/sketch/` (`mountSketch`, API `window.EntreeCartoSketch`)
- Moteur dessin : `DrawToolsBar` (+ `ModifyTransformController`)

**Bundles :**
- Déjà inclus dans `entree-carto-geometry-editor` (`EntreeCartoGeometryEditor.SketchControl`)
- Standalone : `dist/entree-carto-sketch[.min].js` + `dist/css/entree-carto-sketch[.min].css`  
  → `window.EntreeCartoSketch` (`mountSketch`, `attachGeometryTools`, `SketchControl`)

**CSS :** styles `ec-geometry-editor__*` (toolbar 48×48) + slot geopf `ec-sketch-control--geopf-slot`

## Description

- Couche vectorielle dédiée (`zIndex` défaut **500**, propriété `ec-sketch`)
- Outils : Point, LineString, Polygon, Rectangle, Disc (+ modifier / supprimer)  
  (`Circle` / `MultiCircle` en entrée → outil Disc ; picto = cercle)
- Option `toolsToggle` : bouton menu (picto outils) dans un coin
- Option `clearAll` : bouton « tout supprimer »
- Option `localStorageKey` : persistance session (GeoJSON EPSG:4326)
- Infobulles style geopf sur chaque bouton (`aria-label` → `::before`), comme zoom / territoire / minimap / plein écran ; appendice calé au bord du bouton via `left: 100%` (pas `translate(100%)`, qui varie avec la largeur du libellé) ; masquées si l’outil est actif (`aria-pressed`)

## Démo

Route `/sketch` (`SketchDemoView.vue`) : encart utilisation / options + carte via `mountSketch`.  
Nav démo : lien **Croquis**.

## Bundle standalone (`entree-carto-sketch`)

```bash
npm run build:sketch
# ou
make build-sketch
```

```html
<link rel="stylesheet" href="…/css/entree-carto-sketch.min.css" />
<script src="…/entree-carto-sketch.min.js"></script>

<div id="sketch-map"></div>
<script>
  const { map, sketch, destroy } = EntreeCartoSketch.mountSketch('#sketch-map', {
    toolsToggle: 'top-left',
    clearAll: true,
    localStorageKey: 'entree-carto-sketch',
    height: 480,
  })
  // sketch.getFeatures() / sketch.serialize() / sketch.load(raw)
  // destroy()
</script>
```

### `mountSketch(target, options)`

Crée une carte OL + `SketchControl` dans un élément (ou sélecteur).  
Retourne `{ map, sketch, destroy }`.

Options carte (en plus des options `SketchControl`) :

| Option | Défaut | Description |
|--------|--------|-------------|
| `width` / `height` | `'100%'` / `480` | Taille du conteneur |
| `lon` / `lat` / `zoom` | `2` / `46.5` / `5` | Vue initiale |
| `minZoom` / `maxZoom` | `4` / `19` | Limites zoom |
| `tileLayers` | Plan IGN WMTS | Fonds XYZ |
| `showZoom` | `true` | Contrôle +/- OL |
| `className` | — | Classe CSS additionnelle |

Défauts sketch côté `mountSketch` : `toolsToggle: 'top-left'`, `clearAll: true`, `localStorageKey: 'entree-carto-sketch'`.

## Options (classe TS)

| Option | Défaut | Description |
|--------|--------|-------------|
| `geometryType` | `'Geometry'` | Types d’outils (CSV accepté) |
| `toolsToggle` | `null` | `null` = barre toujours visible à gauche ; sinon coin du bouton menu |
| `position` | — | Coin geopf (`.position-container-*`) pour la carte principale |
| `source` / `layer` | créés | Réutiliser une source / couche existante (ex. GeometryEditor) |
| `style` | bleu France | Style OL des features / croquis |
| `zIndex` | `500` | zIndex si la couche est créée ici |
| `onChange` | — | Callback après dessin / modif / suppression |
| `localStorageKey` | `null` | Clé `localStorage` (charge au montage, sauve après changement) |
| `clearAll` | `false` | Bouton tout supprimer |
| `extraTools` | `[]` | Réservé (Text, Import, Export, Measure*) — pas encore branchés |

## Props Vue (`SketchControl.vue`)

| Prop | Défaut | Description |
|------|--------|-------------|
| `position` | `'bottom-left'` | Slot geopf |
| `toolsToggle` | = `position` | Coin du bouton menu |
| `geometryType` | `'Geometry'` | Types d’outils |
| `localStorageKey` | `'entree-carto-sketch'` | Persistance |
| `clearAll` | `true` | Bouton tout supprimer |
| `zIndex` | `500` | Couche croquis |
| `style` | `null` | Style OL |
| `extraTools` | `[]` | Réservé |

## Placement (carte principale)

Bas-gauche, **au-dessus** de la minimap (`order: -2` dans `map-controls.css`).  
Le contrôle se réinsère dans `.position-container-bottom-left` dès que le conteneur geopf existe.

L’élément racine porte un `id` au format geopf (`GPsketch-<timestamp>`) : le `PanelManager` geopf (ouvertures Territories, etc.) parse `id.match(/(\w+)-[0-9]+/)` sur chaque enfant du conteneur — sans id valide, le clic plante.

## GeometryEditor

`GeometryEditor` instancie `SketchControl` en interne avec :
- `source` / `layer` de l’éditeur
- `toolsToggle` issu des options formulaire
- **sans** `localStorageKey`, `clearAll`, ni `extraTools` → comportement historique inchangé

## API map-attachée

```js
const tools = EntreeCartoSketch.attachGeometryTools(map, {
  toolsToggle: 'bottom-left',
  position: 'bottom-left',
  clearAll: true,
  localStorageKey: 'entree-carto-sketch',
})
// tools.sketch, tools.drawBar, tools.load / serialize / destroy
```

(Également exposé via `EntreeCartoGeometryEditor.attachGeometryTools`.)

## Hors scope actuel (roadmap)

Text, Import / Export GeoJSON, MeasureDistance / MeasureArea, éditeur de style feature — voir `_local/TODO_LIST.txt`.
