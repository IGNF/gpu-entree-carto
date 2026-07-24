# entree-carto-geometry-editor

Outil **standalone** d’édition de géométries (remplacement DSFR d’[ol-geometry-editor](https://github.com/IGNF/ol-geometry-editor)).  
Associe une mini-carte à un champ de formulaire ou un élément HTML pour produire / consommer du **GeoJSON** ou du **KML**.

**Sources :** `src/geometry-editor/`  
**Bundle :** `dist/entree-carto-geometry-editor[.min].js` + `dist/css/entree-carto-geometry-editor[.min].css`  
**API globale :** `window.EntreeCartoGeometryEditor`  
**Démo :** `/geometry-editor`

OpenLayers est **embarqué** dans le bundle (contrairement à ol-geometry-editor historique qui s’appuyait sur `ol.js` du site).

La barre d’outils est un **overlay vertical à gauche dans la carte** (pas sous la carte), boutons 48×48 style cartes.gouv / contrôles geopf — sauf si `toolsToggle` est défini : un **bouton outils** (`fr-icon-tools-fill`) dans le coin choisi ouvre / ferme alors la barre.  
Les pictos (point, ligne, polygone, **modifier**, suppression) reprennent les masques SVG de **geopf-extensions-openlayers** (`Drawing` / `DSFRdrawingStyle.css`) — pas besoin du CSS icônes DSFR pour la toolbar.

## Usage

```html
<link rel="stylesheet" href="…/css/entree-carto-geometry-editor.min.css" />
<textarea id="extent" class="fr-input">{…}</textarea>
<script src="…/entree-carto-geometry-editor.min.js"></script>
<script>
  const { editor } = EntreeCartoGeometryEditor.mountGeometryEditor('#extent', {
    geometryType: 'Rectangle',
    height: 400,
    editable: true,
    hide: true,
  });
  // editor.getMap()
  // editor.setOptions({ blockView: true, showZoom: false })
  // editor.destroy()
</script>
```

Équivalent classe :

```js
const editor = new EntreeCartoGeometryEditor.GeometryEditor(
  document.getElementById('extent'),
  { geometryType: 'Polygon' },
);
editor.setOptions({ editable: false, blockView: true });
```

## Options

Alignées sur ol-geometry-editor (principales) :

| Option | Défaut | Description |
|--------|--------|-------------|
| `geometryType` | `'Geometry'` | Un type (`Point`, `LineString`, `Polygon`, `Multi*`, `Rectangle`, `Circle`, `Disc`, `MultiCircle`, `MultiDisc`, `Geometry`) **ou plusieurs séparés par des virgules** (`Point,Circle,Disc`) : mêmes outils que `Geometry`, mais filtrés. |
| `hide` | `true` | Masque l’élément source (`hidden` + classes `ec-geometry-editor-source--hidden` / `fr-hidden` — `display: none !important`, car DSFR `.fr-input` écrase sinon l’attribut `hidden`) |
| `editable` | `true` | Affiche la barre d’outils à gauche dans la carte (sinon viewer seul) |
| `tileLayers` | Plan IGN WMTS | Fonds XYZ `{ url, attribution?, title?, maxZoom? }` |
| `width` / `height` | `100%` / `400` | Taille du conteneur carte |
| `lon` / `lat` / `zoom` | France | Vue initiale |
| `minZoom` / `maxZoom` | `4` / `19` | Limites |
| `centerOnResults` | `true` | Recadre après chargement / édition |
| `precision` | `7` | Décimales GeoJSON / bbox |
| `outputFormat` | `'geojson'` | `'geojson'` \| `'kml'` (écriture) |
| `className` | — | Classe CSS additionnelle sur le conteneur |
| `blockView` | `false` | Bloque pan / zoom manuels (molette, drag, double-clic, pinch, clavier, boutons +/-). Le `fit` programmatique reste possible. |
| `showZoom` | `true` | Affiche les boutons +/- de zoom (ignoré si `blockView` est `true`) |
| `showSettings` | `false` | Bouton roue crantée (haut droite) : formulaire pour modifier les options à chaud ; décale le zoom en dessous. Longitude / latitude / zoom **courants** sont tronqués (7 / 1 décimales) pour la validation HTML, et se mettent à jour en direct quand la vue change (sauf champ en focus). Bouton **Réinitialiser** : remet les options du chargement initial (`editor.resetOptions()`). |
| `showAttributions` | `false` | Affiche le contrôle d’attributions des couches de fond |
| `toolsToggle` | `null` | `null` : barre d’outils toujours visible à gauche. Sinon coin du **bouton menu** (`top-left` \| `top-right` \| `bottom-left` \| `bottom-right`) : un clic ouvre / ferme les outils (sous le bouton si `top-*`, au-dessus si `bottom-*`). |
| `customStyle` | `null` | Style OL (`Style` / `Style[]` / `StyleFunction`) des features et du croquis ; défaut bleu France |

## Mise à jour à chaud

Après création, `editor.setOptions(patch)` (ou `handle.setOptions(patch)`) applique un sous-ensemble d’options sans recréer la carte :

- `blockView`, `showZoom`, `showSettings`, `showAttributions`, `editable`, `customStyle`, `geometryType`, `toolsToggle`
- `tileLayers`, `width` / `height`, `className`, `hide`
- `lon` / `lat` / `zoom` / `minZoom` / `maxZoom`
- `outputFormat`, `precision`, `centerOnResults`

Seules les clés présentes dans `patch` sont modifiées. Un changement de `geometryType` / `outputFormat` / `precision` réécrit l’élément source.

`editor.resetOptions()` (ou `handle.resetOptions()`, ou le bouton **Réinitialiser** du panneau) restaure l’ensemble des options telles qu’au montage de l’éditeur.

## Comportement

- Si l’élément contient du GeoJSON (geometry / Feature / FeatureCollection), du **KML**, une **bbox** `[minX,minY,maxX,maxY]`, ou un **cercle / disque / multi** `{ type: "Circle"|"Disc"|"MultiCircle"|"MultiDisc", … }` → géométries dessinées sur la carte.
- Écoute `input` / `change` sur l’élément → met à jour la carte.
- Dessin / modification / suppression → réécrit l’élément (GeoJSON geometry, FeatureCollection si plusieurs, bbox si `Rectangle`, format Circle/Disc, ou KML).
- Événement carte `change:geometry` avec `{ geometry: string }` (compat).
- **Aucun outil actif** : navigation seule (pas de modification au clic).
- **Modification** : activer l’outil crayon (icône geopf edit).
  - **Ligne** : au survol, poignées **bleues** (croix + flèche courbe) **collées sur le côté** de la ligne ; translation / rotation via ces poignées.
  - **Polygone** et **Rectangle (bbox)** : **translation** en glissant l’**intérieur** (marge depuis les bords) — pas d’icône de translation.
  - **Polygone** : poignée **rotation** (bleue) au survol.
  - Pendant le drag de rotation, l’icône **suit le curseur**.
  - **Rectangle (bbox)** : carrés coins / arêtes pour redimensionner (axis-aligné, **sans rotation**).
  - **Cercle** : contour seul ; **translation** via poignée latérale (comme une ligne) ; **rayon** en glissant le contour ; **pas de rotation**.
  - **Disque** : rempli ; **translation** en glissant l’intérieur (comme un polygone) ; **rayon** en glissant le contour ; **pas de rotation**.
  - **Point** : déplacement du sommet.
- **Suppression** : activer l’outil poubelle puis cliquer une géométrie.
- Les `Multi*` sont **éclatés** en géométries simples à l’édition, et **recombinés** en Multi* à l’écriture.
- Zoom OL placé en haut à droite pour laisser la colonne d’outils à gauche ; boutons **48×48** avec pictos +/− (masques geopf `DSFRzoomStyle`), même look que le zoom de la carte principale.

## Démo

Page `/geometry-editor` : un exemple par `geometryType` (`Point`, `LineString`, `Polygon`, `Multi*`, `Rectangle`, `Circle`, `Disc`, `MultiCircle`, `MultiDisc`, CSV, `Geometry`), avec **deux cartes côte à côte** (GeoJSON et KML) et un champ HTML associé à chacune.  
Un **encart rétractable** (accordéon DSFR) en tête de page décrit l’utilisation et liste toutes les options.  
Un exemple final active `showSettings` (roue crantée) et `showAttributions`.

### Format Circle / Disc / MultiCircle / MultiDisc

```json
{ "type": "Circle", "center": [2.35, 48.85], "radius": 4500 }
{ "type": "Disc", "center": [2.4, 48.87], "radius": 3500 }
{
  "type": "MultiCircle",
  "geometries": [
    { "center": [2.32, 48.85], "radius": 2500 },
    { "center": [2.4, 48.88], "radius": 1800 }
  ]
}
```

- `center` : longitude / latitude (EPSG:4326)
- `radius` : mètres dans la projection carte (EPSG:3857)
- En **KML**, le cercle / disque est exporté comme polygone approximant (64 côtés)

### `geometryType` multi-valeurs

```js
mountGeometryEditor('#field', { geometryType: 'Point,Circle,Disc' })
```

Affiche uniquement les outils listés (+ modifier / supprimer), comme `Geometry` mais de façon explicite. `MultiPoint` / `MultiCircle` / etc. dans la liste exposent l’outil de dessin correspondant (sans remplacer la géométrie précédente).

## Build

```sh
make build-geometry-editor
# ou
npm run build:geometry-editor
```

## Intégration gpu-site

Les pages qui utilisaient `ol-geometry-editor` appellent directement l’API globale (pas de pont jQuery).

```html
<link rel="stylesheet" href="…/vendor/entree-carto/css/entree-carto-geometry-editor.min.css" />
<script src="…/vendor/entree-carto/entree-carto-geometry-editor.min.js"></script>
<script>
  const { editor } = EntreeCartoGeometryEditor.mountGeometryEditor(fieldEl, {
    geometryType: 'Rectangle',
    editable: true,
    showZoom: true,
    height: 400,
    tileLayers: [{ url: layerSourceUrl, attribution: '…', maxZoom: 18 }],
  });
  // editor.getMap()
  // editor.getGeometryLayer()
  // editor.destroy()
</script>
```

Helpers du même OpenLayers que la carte (pour overlays type `ShowGridOnMinimap`) :

- `EntreeCartoGeometryEditor.featureFromWkt(wkt)`
- `EntreeCartoGeometryEditor.bboxStringFromWkt(wkt)`
- `EntreeCartoGeometryEditor.createSimpleStyle({ fill, stroke, strokeWidth })`

Pages : métadonnées (`/metadata/`), fiche document, territoire, admin grille.

## Limites actuelles

- Pas encore de `tileLayerSwitcher` / `allowCapture` (prévus si besoin).
