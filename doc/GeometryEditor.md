# entree-carto-geometry-editor

Outil **standalone** d’édition de géométries (remplacement DSFR d’[ol-geometry-editor](https://github.com/IGNF/ol-geometry-editor)).  
Associe une mini-carte à un champ de formulaire ou un élément HTML pour produire / consommer du **GeoJSON** ou du **KML**.

**Sources :** `src/geometry-editor/`  
**Bundle :** `dist/entree-carto-geometry-editor[.min].js` + `dist/css/entree-carto-geometry-editor[.min].css`  
**API globale :** `window.EntreeCartoGeometryEditor`  
**Démo :** `/geometry-editor`

OpenLayers est **embarqué** dans le bundle (contrairement à ol-geometry-editor historique qui s’appuyait sur `ol.js` du site).

La barre d’outils est un **overlay vertical à gauche dans la carte** (pas sous la carte), boutons 48×48 style cartes.gouv / contrôles geopf.  
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
| `geometryType` | `'Geometry'` | `Point`, `LineString`, `Polygon`, `Multi*`, `Rectangle`, `Geometry` |
| `hide` | `true` | Masque l’élément source |
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
| `showSettings` | `false` | Bouton roue crantée (haut droite) : formulaire pour modifier les options à chaud ; décale le zoom en dessous |
| `showAttributions` | `false` | Affiche le contrôle d’attributions des couches de fond |
| `customStyle` | `null` | Style OL (`Style` / `Style[]` / `StyleFunction`) des features et du croquis ; défaut bleu France |

## Mise à jour à chaud

Après création, `editor.setOptions(patch)` (ou `handle.setOptions(patch)`) applique un sous-ensemble d’options sans recréer la carte :

- `blockView`, `showZoom`, `showSettings`, `showAttributions`, `editable`, `customStyle`, `geometryType`
- `tileLayers`, `width` / `height`, `className`, `hide`
- `lon` / `lat` / `zoom` / `minZoom` / `maxZoom`
- `outputFormat`, `precision`, `centerOnResults`

Seules les clés présentes dans `patch` sont modifiées. Un changement de `geometryType` / `outputFormat` / `precision` réécrit l’élément source.

## Comportement

- Si l’élément contient du GeoJSON (geometry / Feature / FeatureCollection), du **KML** ou une **bbox** `[minX,minY,maxX,maxY]` → géométries dessinées sur la carte.
- Écoute `input` / `change` sur l’élément → met à jour la carte.
- Dessin / modification / suppression → réécrit l’élément (GeoJSON geometry, FeatureCollection si plusieurs, bbox si `Rectangle`, ou KML).
- Événement carte `change:geometry` avec `{ geometry: string }` (compat).
- **Aucun outil actif** : navigation seule (pas de modification au clic).
- **Modification** : activer l’outil crayon (icône geopf edit) puis déplacer les sommets / la géométrie.
- **Suppression** : activer l’outil poubelle puis cliquer une géométrie.
- Les `Multi*` sont **éclatés** en géométries simples à l’édition, et **recombinés** en Multi* à l’écriture.
- Zoom OL placé en haut à droite pour laisser la colonne d’outils à gauche.

## Démo

Page `/geometry-editor` : un exemple par `geometryType` (`Point`, `LineString`, `Polygon`, `Multi*`, `Rectangle`, `Geometry`), avec **deux cartes côte à côte** (GeoJSON et KML) et un champ HTML associé à chacune.  
Un **encart rétractable** (accordéon DSFR) en tête de page décrit l’utilisation et liste toutes les options.  
Un exemple final active `showSettings` (roue crantée) et `showAttributions`.

## Build

```sh
make build-geometry-editor
# ou
npm run build:geometry-editor
```

## Intégration gpu-site

Remplacer progressivement `ol-geometry-editor` (webpack copie déjà un vendor). Exemple :

```js
// avant
$field.geometryEditor({ geometryType: 'Rectangle', height: 400, … });

// après
EntreeCartoGeometryEditor.mountGeometryEditor($field[0], {
  geometryType: 'Rectangle',
  height: 400,
  tileLayers: [{ url: layerSourceUrl, attribution: '…', maxZoom: 18 }],
});
```

Pages concernées (recherche `ol-geometry-editor` dans gpu-site) : métadonnées document, grille admin, territoire, etc.

## Limites actuelles

- Pas encore de `tileLayerSwitcher` / `allowCapture` (prévus si besoin).
