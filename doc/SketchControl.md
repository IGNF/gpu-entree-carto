[![en](https://img.shields.io/badge/lang-en-red.svg)](SketchControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](SketchControl.fr.md)

# SketchControl

OpenLayers **sketch** control (draw / edit geometries) reusable by the main map and `GeometryEditor`.

**Sources:**

- Class: `src/geometry-editor/SketchControl.ts`
- Modules: `src/geometry-editor/sketch/` (history, text, measures, I/O)
- Vue wrapper: `src/components/map/SketchControl.vue`
- Standalone: `src/sketch/` (`mountSketch`, API `window.EntreeCartoSketch`)
- Draw engine: `DrawToolsBar` (+ `ModifyTransformController`)

**Bundles:**

- Already included in `entree-carto-geometry-editor` (`EntreeCartoGeometryEditor.SketchControl`)
- Standalone: `dist/entree-carto-sketch[.min].js` + `dist/css/entree-carto-sketch[.min].css`  
  → `window.EntreeCartoSketch` (`mountSketch`, `attachGeometryTools`, `SketchControl`)

**CSS:** `ec-geometry-editor__*` styles (48×48 toolbar) + geopf slot `ec-sketch-control--geopf-slot`  
On main map: **48px** layout column (`--ec-sketch-column-width`), vertical scroll if needed; tooltips right of buttons (zone `--ec-geom-tooltip-space`, without widening geopf column); **click-through** on toolbar transparent area (`pointer-events: none` on `#ec-sketch-toolbar-*`, `auto` on buttons). Place search offset via `--ec-search-left-inset` (`map-controls.css`).

## Description

- Dedicated vector layer (`zIndex` default **500**, property `ec-sketch`)
- Tools: Point, LineString, Polygon, Rectangle, Disc (+ modify / delete)
- Option `toolsToggle`: menu button (tools icon) in a corner
- Toolbar **vertically scrollable** if taller than map (wheel / touch on button column or **modify sub-bar** when open). Sub-bar stays **visible** in modify mode; **max height** limited to main bar visible scrollport (internal scroll if needed).
- Option `clearAll`: “delete all” button
- Option `localStorageKey`: **Save** button → persists sketch + undo/redo history (`{key}` and `{key}:history`); on reload, restores **last save** only (unsaved edits lost)
- Option `history`: **Undo** / **Redo** in session; stacks restored after reload if Save was used
- Option `extraTools`: Text, Import, Export, MeasureDistance, MeasureArea
- Option `enableFeatureStyleEditor`: style popup on create (default **false**; enabled on map / demo)
- geopf-style tooltip on each button
- Bar order (separate groups): measures → save / undo / redo → draw + text → modify / delete → export / import

## `extraTools`

| Id                | Behaviour                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `Text`            | Label only; style popup (text, size, colour, outline, rotation) if `enableFeatureStyleEditor`; drag + rotation icon in modify mode       |
| `Import`          | `*.kml`, `*.json` or `*.geojson` file (picker filter) → sketch features; KML via safe parser, JSON/GeoJSON via `readSketchGeoJsonObject`  |
| `Export`          | Dialog (GeoJSON/KML select + Cancel / Export)                                                                                             |
| `MeasureDistance` | Dashed LineString on `measureLayer` + distance popup (location shape, Delete button only); Remix icon `ri-ruler-line`                    |
| `MeasureArea`     | Dashed Polygon on `measureLayer` + area popup (same); Remix icon `ri-custom-size`                                                         |

## Style popup (`enableFeatureStyleEditor`)

On feature create (classic draw or text), opens type-specific popup (OL Overlay `bottom-center`, like measures; closes on outside click, except map pan). In **modify** mode, palette icon reopens popup.

Colour pickers: click swatch → dialog (native picker, hex, **opacity** bar).

**Save** button: green dot (up to date) / orange (unsaved changes), including after undo/redo.

**Advanced options** button (collapsed by default): dashes, caps, joins, point shape, bold / italic, zIndex, etc. Irrelevant fields disabled (e.g. rotation on circular point, dash offset if solid line).

Style stored in feature property `ec-feature-style` (and `ec-sketch-text` for text) — used on **import** / **export** GeoJSON; KML serialises objects as JSON in ExtendedData.

**Discs / circles** (`ol/geom/Circle`) serialised in GeoJSON with custom geometry `{ "type": "Disc"|"Circle", "center": [lon, lat], "radius": m }` (property `ecKind`). KML: approximating polygon + `ecKind` in properties.

### gpu-client import compatibility

**gpu-client** GeoJSON exports (`properties.style` + `gpuGeometryType`) automatically converted to `ec-feature-style` / `ec-sketch-text` (including text). Module: `sketch/gpuClientSketchAdapter.ts`.

Colours (style popup): click **swatch** → browser native picker only (no second panel). Below swatch: **hex `#RRGGBBAA`** field and **opacity** slider.

Attributes popup: max height **265px** (internal scroll); open without map **auto-pan** or document page scroll. Map click: close on **button release** only if mouse **did not move** (map pan allowed, popup follows anchor). **Feature** click (down + drag): pan allowed; **singleclick** (no drag) opens / repositions popup on feature. On **create**, popup opens only when draw finishes (disc/circle: after 2nd click fixing radius, not centre alone).

In **modify**, **shape** / **move** sub-tools: no “pointer” cursor on feature body; **shape** → `pointer` near vertices (or rectangle / radius resize cursor); **move** → translation cursor when feature hovered (lines / labels: small hit tolerance). Default sub-tool when opening Modify: **shape edit**. In **move**, **rotation** (except point and disc) and **style** modes, and **Delete** mode, hovered feature (top if stacked) is **highlighted** (stronger outline); on **mousedown** (modify) original style restored. **Undo** closes attributes popup if edited feature was removed. **Save locally** button does not interrupt active draw tool.

| Type                          | Basic fields                              | Advanced (preview)                                                  |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| Text                          | text, size, colour, outline, rotation     | font, bold, italic, outline width, zIndex                          |
| Point                         | radius, fill, outline, width              | shape, symbol rotation (except circle), zIndex                      |
| Line                          | outline, width                            | dashes, caps, joins, offset, tip limit, zIndex                      |
| Polygon / Rectangle / Disc    | fill, outline, width                      | same as line                                                        |
| Circle                        | outline, width                            | same as line                                                        |

GeometryEditor does **not** enable `enableFeatureStyleEditor` (historical behaviour).

## Demo

Route `/sketch` (`SketchDemoView.vue`): usage / options panel + map via `mountSketch`.  
Demo nav: **Sketch** link.

## Standalone bundle (`entree-carto-sketch`)

```bash
npm run build:sketch
```

```js
const { map, sketch, destroy } = EntreeCartoSketch.mountSketch('#sketch-map', {
  toolsToggle: 'top-left',
  clearAll: true,
  history: true,
  localStorageKey: 'entree-carto-sketch',
  extraTools: ['Text', 'Import', 'Export', 'MeasureDistance', 'MeasureArea'],
  enableFeatureStyleEditor: true,
  height: 480,
})
```

## Options (TS class)

| Option                     | Default      | Description                                                    |
| -------------------------- | ------------ | -------------------------------------------------------------- |
| `geometryType`             | `'Geometry'` | Tool types (CSV accepted)                                      |
| `toolsToggle`              | `null`       | `null` = bar always visible; else menu button corner           |
| `position`                 | —            | geopf corner for main map                                      |
| `source` / `layer`         | created      | Reuse existing source / layer                                  |
| `style`                    | France blue  | OL style for features / sketch                                 |
| `zIndex`                   | `500`        | zIndex if layer created here                                   |
| `onChange`                 | —            | Callback after draw / edit / delete                              |
| `localStorageKey`          | `null`       | `localStorage` key (restore + Save button)                     |
| `clearAll`                 | `false`      | Delete-all button                                              |
| `history`                  | `false`      | Undo / Redo (persisted on Save, `{key}:history`)               |
| `extraTools`               | `[]`         | Text, Import, Export, Measure*                                 |
| `enableFeatureStyleEditor` | `false`      | Style popup on create (+ palette icon in modify)               |

## Vue props (`SketchControl.vue`)

Main map defaults: `history: true`, `clearAll: true`, `localStorageKey: 'entree-carto-sketch'`, all `extraTools`, `enableFeatureStyleEditor: true`.

## GeometryEditor

Without `localStorageKey`, `clearAll`, `history`, `extraTools`, or `enableFeatureStyleEditor` → unchanged historical behaviour.
