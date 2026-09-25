[![en](https://img.shields.io/badge/lang-en-red.svg)](GeometryEditor.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](GeometryEditor.fr.md)

# entree-carto-geometry-editor

**Standalone** geometry editing tool (DSFR replacement for [ol-geometry-editor](https://github.com/IGNF/ol-geometry-editor)).  
Combines a mini-map with a form field or HTML element to produce / consume **GeoJSON** or **KML**.

**Sources:** `src/geometry-editor/`  
**Bundle:** `dist/entree-carto-geometry-editor[.min].js` + `dist/css/entree-carto-geometry-editor[.min].css`  
**Global API:** `window.EntreeCartoGeometryEditor`  
**Demo:** `/geometry-editor`

OpenLayers is **embedded** in the bundle (unlike historical ol-geometry-editor that relied on site `ol.js`).

Toolbar is a **vertical overlay on the left inside the map** (not below the map), 48×48 buttons cartes.gouv / geopf control style — unless `toolsToggle` is set: a **tools button** in the chosen corner then opens / closes the bar.  
Toolbar pictograms use **[Remix Icon](https://remixicon.com/)** (`remixicon.css`, loaded with bundle); **Line** tool keeps geopf picto via custom class `ri-draw-line` (`src/assets/custom-icons/draw-line.svg`). Class mapping: `src/geometry-editor/geometryToolIcons.ts`.  
Tooltips: same geopf style as zoom / territory (`aria-label` → `::before` on hover); hidden when button active.  
**48px** layout column: transparent area right of buttons (tooltip reserve) passes pan / zoom / draw on map (`targeted pointer-events` + negative margin on toolbar).

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
  })
  // editor.getMap()
  // editor.setOptions({ blockView: true, showZoom: false })
  // editor.destroy()
</script>
```

Class equivalent:

```js
const editor = new EntreeCartoGeometryEditor.GeometryEditor(document.getElementById('extent'), {
  geometryType: 'Polygon',
})
editor.setOptions({ editable: false, blockView: true })
```

## Options

Aligned with ol-geometry-editor (main ones):

| Option                 | Default        | Description                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `geometryType`         | `'Geometry'`   | Single type (`Point`, `LineString`, `Polygon`, `Multi*`, `Rectangle`, `Disc`, `MultiDisc`, `Geometry`) **or comma-separated** (`Point,Disc`): same tools as `Geometry`, filtered. `Circle` / `MultiCircle` still accepted (compat) and expose **Disc** tool.                                                                                               |
| `hide`                 | `true`         | Hide source element (`hidden` + classes `ec-geometry-editor-source--hidden` / `fr-hidden` — `display: none !important`, as DSFR `.fr-input` otherwise overrides `hidden`)                                                                                                                                                                                                      |
| `editable`             | `true`         | Show toolbar on left in map (otherwise viewer only)                                                                                                                                                                                                                                                                                                                    |
| `tileLayers`           | Plan IGN WMTS  | XYZ bases `{ url, attribution?, title?, maxZoom? }`                                                                                                                                                                                                                                                                                                                                     |
| `width` / `height`     | `100%` / `400` | Map container size                                                                                                                                                                                                                                                                                                                                                               |
| `lon` / `lat` / `zoom` | France         | Initial view                                                                                                                                                                                                                                                                                                                                                                            |
| `minZoom` / `maxZoom`  | `4` / `19`     | Limits                                                                                                                                                                                                                                                                                                                                                                                 |
| `centerOnResults`      | `true`         | Reframe after load / edit                                                                                                                                                                                                                                                                                                                                                      |
| `precision`            | `7`            | GeoJSON / bbox decimals                                                                                                                                                                                                                                                                                                                                                                |
| `outputFormat`         | `'geojson'`    | `'geojson'` \| `'kml'` (write)                                                                                                                                                                                                                                                                                                                                                       |
| `className`            | —              | Additional CSS class on container                                                                                                                                                                                                                                                                                                                                               |
| `blockView`            | `false`        | Block manual pan / zoom (wheel, drag, double-click, pinch, keyboard, +/- buttons). Programmatic `fit` still allowed.                                                                                                                                                                                                                                                            |
| `showZoom`             | `true`         | Show +/- zoom buttons (ignored if `blockView` is `true`)                                                                                                                                                                                                                                                                                                                      |
| `showSettings`         | `false`        | Cog button (top right): form to change options live; shifts zoom below. Current longitude / latitude / zoom **truncated** (7 / 1 decimals) for HTML validation, updated live when view changes (except focused field). **Reset** button: restores options from initial mount (`editor.resetOptions()`). |
| `showAttributions`     | `false`        | Show base layer attribution control                                                                                                                                                                                                                                                                                                                                  |
| `toolsToggle`          | `null`         | `null`: toolbar always visible on left. Else **menu button** corner (`top-left` \| `top-right` \| `bottom-left` \| `bottom-right`): click toggles tools (below button if `top-*`, above if `bottom-*`).                                                                                                                                                |
| `customStyle`          | `null`         | OL style (`Style` / `Style[]` / `StyleFunction`) for features and sketch; default France blue                                                                                                                                                                                                                                                                                        |

## Live updates

After creation, `editor.setOptions(patch)` (or `handle.setOptions(patch)`) applies a subset of options without recreating the map:

- `blockView`, `showZoom`, `showSettings`, `showAttributions`, `editable`, `customStyle`, `geometryType`, `toolsToggle`
- `tileLayers`, `width` / `height`, `className`, `hide`
- `lon` / `lat` / `zoom` / `minZoom` / `maxZoom`
- `outputFormat`, `precision`, `centerOnResults`

Only keys present in `patch` are changed. Changing `geometryType` / `outputFormat` / `precision` rewrites the source element.

`editor.resetOptions()` (or `handle.resetOptions()`, or **Reset** in panel) restores all options as at editor mount.

## Behaviour

- If element contains GeoJSON (geometry / Feature / FeatureCollection), **KML**, **bbox** `[minX,minY,maxX,maxY]`, or **circle / disc / multi** `{ type: "Circle"|"Disc"|"MultiCircle"|"MultiDisc", … }` → geometries drawn on map.
- **Incoming KML** (form field or sketch import): strict detection (`looksLikeKmlDocument`), reject active tags / attributes (`safeKmlParse.ts`), XML validation then read **without `DOMParser`** (fast-xml-parser → OpenLayers geometries; no HTML interpretation).
- Listen `input` / `change` on element → update map (native listen **and** jQuery bridge: `$el.trigger('change')` supported).
- Draw / modify / delete → rewrite element (GeoJSON geometry, FeatureCollection if several, bbox if `Rectangle`, Circle/Disc format, or KML).
- Map event `change:geometry` with `{ geometry: string }` (compat).
- **No active tool**: navigation only (no modify on click).
- **Modify**: enable pencil tool (edit icon) shows **separate toolbar**, adjacent to Modify button (toward map interior), with **shape edit** (default when offered), **move**, **rotation**, **style** (palette, if style editor enabled). Visible sub-tools depend on **`geometryType`**:
  - **Point** / **MultiPoint**: **move** only;
  - **Rectangle**: shape + move (+ style if enabled), **no rotation**;
  - **Disc** / **MultiDisc**: shape + move (+ style if enabled), **no rotation**;
  - other types: full subset (rotation for lines, polygons, text, etc.).
    Click active sub-tool again **deactivates** it (no map action until sub-tool selected). Click Modify again closes mode and hides sub-bar. Enabling Modify **closes** attributes popup if open. Wheel on sub-bar **scrolls** sub-bar first if overflow, else main toolbar; sub-bar max height = main bar scrolled visible zone.
  - **Move**: drag interior of polygon / rectangle / disc, line (“body” zone), filled circle, point or text label — without editing vertices or radius.
  - **Shape edit**: OpenLayers vertices (line, polygon, point), **rectangle** resize at handles, circle / disc radius on contour.
  - **Rotation**: click + drag on feature (line, polygon, text); rotation cursor on hover.
  - **Style**: click feature → attributes popup (colour, width, etc.) **anchored at click point**.
  - **Rectangle (bbox)**: no rotation; resize handles in **shape edit** only.
- **Delete**: enable trash then click geometry. For legacy **circle** (`ecKind` outline), click **outline** only (interior click does not delete). **Disc** also deletes on area click.
- `Multi*` **split** into simple geometries for edit, **recombined** to Multi* on write.
- OL zoom top-right to leave tool column on left; **48×48** buttons with +/- pictos (geopf masks `DSFRzoomStyle`), same look as main map zoom.

## Demo

Page `/geometry-editor`: one example per `geometryType` (`Point`, `LineString`, `Polygon`, `Multi*`, `Rectangle`, `Disc`, `MultiDisc`, CSV, `Geometry`), with **two side-by-side maps** (GeoJSON and KML) and associated HTML field each.

### Disc / MultiDisc format (and legacy Circle)

```json
{ "type": "Disc", "center": [2.4, 48.87], "radius": 3500 }
{
  "type": "MultiDisc",
  "geometries": [
    { "center": [2.32, 48.85], "radius": 2500 },
    { "center": [2.4, 48.88], "radius": 1800 }
  ]
}
```

- `center`: longitude / latitude (EPSG:4326)
- `radius`: metres in map projection (EPSG:3857)
- **KML** export: disc as approximating polygon (64 sides)
- `Circle` / `MultiCircle` formats still **read** (compat); draw exposes **Disc** tool only (circle picto).

### Multi-value `geometryType`

```js
mountGeometryEditor('#field', { geometryType: 'Point,Disc' })
```

Shows only listed tools (+ modify / delete), like `Geometry` but explicit. `MultiPoint` / `MultiDisc` / etc. in list expose corresponding draw tool (without replacing previous geometry).

## Build

```sh
make build-geometry-editor
# or
npm run build:geometry-editor
```

## gpu-site integration

Pages that used `ol-geometry-editor` call the global API directly (no jQuery bridge).

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
  })
  // editor.getMap()
  // editor.getGeometryLayer()
  // editor.destroy()
</script>
```

Same OpenLayers helpers as map (for overlays like `ShowGridOnMinimap`):

- `EntreeCartoGeometryEditor.featureFromWkt(wkt)`
- `EntreeCartoGeometryEditor.bboxStringFromWkt(wkt)`
- `EntreeCartoGeometryEditor.createSimpleStyle({ fill, stroke, strokeWidth })`

Pages: metadata (`/metadata/`), document sheet, territory, admin grid.

## Current limits

- No `tileLayerSwitcher` / `allowCapture` yet (if needed).
- Advanced sketch tools (text, import/export, measures, style popup): roadmap `_local/TODO_LIST.txt`; reserved types `FUTURE_GEOMETRY_TOOL_NAMES`.

## Main map (map-attached)

Sketch engine is **`SketchControl`** (OL control) — see [SketchControl.md](./SketchControl.md).

`GeometryEditor` instantiates it internally (without localStorage / clearAll / extraTools).  
On existing Map:

```js
const tools = EntreeCartoGeometryEditor.attachGeometryTools(map, {
  toolsToggle: 'bottom-left',
  position: 'bottom-left',
  geometryType: 'Point,LineString,Polygon',
  clearAll: true,
  localStorageKey: 'entree-carto-sketch',
  onChange: (features) => {
    /* … */
  },
})
// tools.sketch / tools.serialize() / tools.load(raw) / tools.destroy()
```

Direct equivalent: `new EntreeCartoGeometryEditor.SketchControl({…})` then `map.addControl(…)`.

`GeometryEditor` (form) remains gpu-site façade; main map uses Vue wrapper `SketchControl.vue`.
