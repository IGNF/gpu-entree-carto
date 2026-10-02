[![en](https://img.shields.io/badge/lang-en-red.svg)](icone-references.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](icone-references.fr.md)

# Icon reference

Inventory of pictograms used in **entree-carto** (`src/` and bundled geopf controls).  
Columns: **preview** (SVG under `doc/img/icon-previews/`), **label**, **HTML class**, **catalog**, **documentation URL**.

Previews: `npm run doc:icon-previews` (from `@gouvfr/dsfr`, `remixicon`, project assets). Some DSFR-only font glyphs use a Remix SVG proxy; commit updated previews with doc changes.

## URL patterns

| Catalog | Class prefix | URL |
| ------- | ------------ | --- |
| **DSFR** | `fr-icon-*` | `https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=` + name **without** `fr-icon-` (e.g. `fr-icon-arrow-left-line` → `query=arrow-left-line`) |
| **Remix Icon** | `ri-*` | `https://remixicon.com/icon/` + name **without** `ri-` (e.g. `ri-arrow-left-line` → `…/arrow-left-line`) |
| **Custom** | `ri-*` (project) | Local asset or private glyph — no public catalog page (see below) |
| **Inline SVG** | — | Embedded in Vue — no DSFR/Remix class |

Stylesheets: DSFR `icons.min.css` (`main.ts`, demo); Remix `remixicon.css` + `src/assets/custom-icons/custom-remix-icons.css` (sketch / geometry editor). geopf buttons may combine DSFR classes with `gpf-btn` (see [INTEGRATION.md](./INTEGRATION.md)).

---

## Tab panels (`TabPanelsControl.vue`)

| Preview | Label | HTML class | Catalog | URL |
| ------- | ----- | ---------- | ------- | --- |
| <img src="./img/icon-previews/dsfr/map-pin-2-line.svg" width="24" height="24" alt="" /> | Info tab | `fr-icon-map-pin-2-line` | DSFR | [map-pin-2-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=map-pin-2-line) |
| <img src="./img/icon-previews/remix/map-2-line.svg" width="24" height="24" alt="" /> | Catalogue tab | `ri-map-2-line` | Remix | [map-2-line](https://remixicon.com/icon/map-2-line) |
| <img src="./img/icon-previews/remix/stack-line.svg" width="24" height="24" alt="" /> | Data layers tab | `ri-stack-line` | Remix | [stack-line](https://remixicon.com/icon/stack-line) |
| <img src="./img/icon-previews/remix/list-indefinite.svg" width="24" height="24" alt="" /> | Legends tab | `ri-list-indefinite` | Remix | [list-indefinite](https://remixicon.com/icon/list-indefinite) |
| <img src="./img/icon-previews/remix/fullscreen-line.svg" width="24" height="24" alt="" /> | Mobile map bar — enter full screen | `ri-fullscreen-line` | Remix | [fullscreen-line](https://remixicon.com/icon/fullscreen-line) |
| — | Mobile map bar — exit full screen | `ri-fullscreen-exit-line` | Remix | [fullscreen-exit-line](https://remixicon.com/icon/fullscreen-exit-line) |

---

## Fiche info (`FicheInfoPanel.vue`, `FicheCadastreReferencesModal.vue`, `ficheInfoHtml.ts`)

| Preview | Label | HTML class | Catalog | URL |
| ------- | ----- | ---------- | ------- | --- |
| <img src="./img/icon-previews/remix/information-line.svg" width="24" height="24" alt="" /> | Section title (info) | `ri-information-line` | Remix | [information-line](https://remixicon.com/icon/information-line) |
| <img src="./img/icon-previews/remix/arrow-right-line.svg" width="24" height="24" alt="" /> | Open cadastre references | `ri-arrow-right-line` | Remix | [arrow-right-line](https://remixicon.com/icon/arrow-right-line) |
| <img src="./img/icon-previews/remix/arrow-left-line.svg" width="24" height="24" alt="" /> | Back to parcel | `ri-arrow-left-line` | Remix | [arrow-left-line](https://remixicon.com/icon/arrow-left-line) |
| <img src="./img/icon-previews/remix/refresh-line.svg" width="24" height="24" alt="" /> | Reload tab content | `ri-refresh-line` | Remix | [refresh-line](https://remixicon.com/icon/refresh-line) |
| <img src="./img/icon-previews/remix/printer-line.svg" width="24" height="24" alt="" /> | Print (territory) | `ri-printer-line` | Remix | [printer-line](https://remixicon.com/icon/printer-line) |
| <img src="./img/icon-previews/dsfr/refresh-line.svg" width="24" height="24" alt="" /> | Loading spinner (HTML fragment) | `fr-icon-refresh-line` | DSFR | [refresh-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=refresh-line) |
| <img src="./img/icon-previews/dsfr/information-line.svg" width="24" height="24" alt="" /> | Modal — info callout | `fr-icon-information-line` | DSFR | [information-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=information-line) |
| <img src="./img/icon-previews/dsfr/close-line.svg" width="24" height="24" alt="" /> | Modal — close | `fr-icon-close-line` | DSFR | [close-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=close-line) |
| <img src="./img/icon-previews/remix/file-copy-line.svg" width="24" height="24" alt="" /> | Copy references | `ri-file-copy-line` | Remix | [file-copy-line](https://remixicon.com/icon/file-copy-line) |

---

## Layer catalogue & legends (`LayerCataloguePanel.vue`, `LayerLegendsPanel.vue`)

| Preview | Label | HTML class | Catalog | URL |
| ------- | ----- | ---------- | ------- | --- |
| <img src="./img/icon-previews/remix/map-2-line.svg" width="24" height="24" alt="" /> | Catalogue panel title | `ri-map-2-line` | Remix | [map-2-line](https://remixicon.com/icon/map-2-line) |
| <img src="./img/icon-previews/remix/loader-4-line.svg" width="24" height="24" alt="" /> | Catalogue loading | `ri-loader-4-line` | Remix | [loader-4-line](https://remixicon.com/icon/loader-4-line) |
| <img src="./img/icon-previews/remix/list-indefinite.svg" width="24" height="24" alt="" /> | Legends panel title | `ri-list-indefinite` | Remix | [list-indefinite](https://remixicon.com/icon/list-indefinite) |

---

## Data layers manager (`DataLayersManagerPanel.vue`)

| Preview | Label | HTML class | Catalog | URL |
| ------- | ----- | ---------- | ------- | --- |
| <img src="./img/icon-previews/remix/stack-line.svg" width="24" height="24" alt="" /> | Panel title | `ri-stack-line` | Remix | [stack-line](https://remixicon.com/icon/stack-line) |
| <img src="./img/icon-previews/remix/separator.svg" width="24" height="24" alt="" /> | Layer separator | `ri-separator` | Remix | [separator](https://remixicon.com/icon/separator) |
| <img src="./img/icon-previews/remix/list-unordered.svg" width="24" height="24" alt="" /> | Layer list style | `ri-list-unordered` | Remix | [list-unordered](https://remixicon.com/icon/list-unordered) |
| <img src="./img/icon-previews/remix/list-indefinite.svg" width="24" height="24" alt="" /> | Open legend | `ri-list-indefinite` | Remix | [list-indefinite](https://remixicon.com/icon/list-indefinite) |
| <img src="./img/icon-previews/remix/drag-move-2-fill.svg" width="24" height="24" alt="" /> | Drag handle | `ri-drag-move-2-fill` | Remix | [drag-move-2-fill](https://remixicon.com/icon/drag-move-2-fill) |
| <img src="./img/icon-previews/remix/eye-line.svg" width="24" height="24" alt="" /> | Visible | `ri-eye-line` | Remix | [eye-line](https://remixicon.com/icon/eye-line) |
| <img src="./img/icon-previews/remix/eye-off-line.svg" width="24" height="24" alt="" /> | Hidden | `ri-eye-off-line` | Remix | [eye-off-line](https://remixicon.com/icon/eye-off-line) |
| <img src="./img/icon-previews/remix/delete-bin-line.svg" width="24" height="24" alt="" /> | Remove layer | `ri-delete-bin-line` | Remix | [delete-bin-line](https://remixicon.com/icon/delete-bin-line) |
| <img src="./img/icon-previews/remix/contrast-fill.svg" width="24" height="24" alt="" /> | Opacity | `ri-contrast-fill` | Remix | [contrast-fill](https://remixicon.com/icon/contrast-fill) |

---

## Catalogue tree & base layers (`CatalogLayerTree.vue`, `BaseLayerRadioList.vue`)

| Preview | Label | HTML class | Catalog | URL |
| ------- | ----- | ---------- | ------- | --- |
| <img src="./img/icon-previews/dsfr/arrow-right-s-line.svg" width="24" height="24" alt="" /> | Expand group | `fr-icon-arrow-right-s-line` | DSFR | [arrow-right-s-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=arrow-right-s-line) |
| <img src="./img/icon-previews/dsfr/arrow-down-s-line.svg" width="24" height="24" alt="" /> | Collapse group | `fr-icon-arrow-down-s-line` | DSFR | [arrow-down-s-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=arrow-down-s-line) |
| <img src="./img/icon-previews/dsfr/arrow-down-s-line.svg" width="24" height="24" alt="" /> | Show description | `fr-icon-arrow-down-s-line` | DSFR | [arrow-down-s-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=arrow-down-s-line) |
| <img src="./img/icon-previews/dsfr/arrow-up-s-line.svg" width="24" height="24" alt="" /> | Hide description | `fr-icon-arrow-up-s-line` | DSFR | [arrow-up-s-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=arrow-up-s-line) |

---

## Map mode (`MapModeSelector.vue`)

| Preview | Label | HTML class | Catalog | URL |
| ------- | ----- | ---------- | ------- | --- |
| <img src="./img/icon-previews/custom/parcelle.svg" width="24" height="24" alt="" /> | Parcel | `ec-icon-parcelle` | Custom | `src/assets/custom-icons/parcelle.svg` (`custom-remix-icons.css`) |
| <img src="./img/icon-previews/dsfr/france-fill.svg" width="24" height="24" alt="" /> | Territory | `fr-icon-france-fill` | DSFR | [france-fill](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=france-fill) |

---

## Territories overlay (`TerritoriesControl.vue`)

| Preview | Label | HTML class | Catalog | URL |
| ------- | ----- | ---------- | ------- | --- |
| <img src="./img/icon-previews/dsfr/close-line.svg" width="24" height="24" alt="" /> | Close panel | `fr-icon-close-line` (+ `gpf-btn-icon-close`) | DSFR | [close-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=close-line) |

---

## Sketch / geometry editor (`geometryToolIcons.ts`, `SketchFeatureStylePopup.ts`, `SketchMeasureController.ts`)

Mapping toolbar BEM modifier → Remix class is defined in `src/geometry-editor/geometryToolIcons.ts`.

| Preview | Label | HTML class | Catalog | URL |
| ------- | ----- | ---------- | ------- | --- |
| <img src="./img/icon-previews/remix/tools-fill.svg" width="24" height="24" alt="" /> | Tools menu | `ri-tools-fill` | Remix | [tools-fill](https://remixicon.com/icon/tools-fill) |
| <img src="./img/icon-previews/remix/ruler-line.svg" width="24" height="24" alt="" /> | Measure distance | `ri-ruler-line` | Remix | [ruler-line](https://remixicon.com/icon/ruler-line) |
| <img src="./img/icon-previews/remix/custom-size.svg" width="24" height="24" alt="" /> | Measure area | `ri-custom-size` | Remix | [custom-size](https://remixicon.com/icon/custom-size) |
| <img src="./img/icon-previews/remix/save-line.svg" width="24" height="24" alt="" /> | Save | `ri-save-line` | Remix | [save-line](https://remixicon.com/icon/save-line) |
| <img src="./img/icon-previews/remix/corner-up-left-line.svg" width="24" height="24" alt="" /> | Undo | `ri-corner-up-left-line` | Remix | [corner-up-left-line](https://remixicon.com/icon/corner-up-left-line) |
| <img src="./img/icon-previews/remix/corner-up-right-line.svg" width="24" height="24" alt="" /> | Redo | `ri-corner-up-right-line` | Remix | [corner-up-right-line](https://remixicon.com/icon/corner-up-right-line) |
| <img src="./img/icon-previews/remix/map-pin-5-line.svg" width="24" height="24" alt="" /> | Point | `ri-map-pin-5-line` | Remix | [map-pin-5-line](https://remixicon.com/icon/map-pin-5-line) |
| <img src="./img/icon-previews/custom/draw-line.svg" width="24" height="24" alt="" /> | Line | `ri-draw-line` | Custom | `src/assets/custom-icons/draw-line.svg` (CSS mask in `custom-remix-icons.css`) |
| <img src="./img/icon-previews/remix/pentagon-line.svg" width="24" height="24" alt="" /> | Polygon | `ri-pentagon-line` | Remix | [pentagon-line](https://remixicon.com/icon/pentagon-line) |
| <img src="./img/icon-previews/remix/rectangle-line.svg" width="24" height="24" alt="" /> | Rectangle | `ri-rectangle-line` | Remix | [rectangle-line](https://remixicon.com/icon/rectangle-line) |
| <img src="./img/icon-previews/remix/circle-line.svg" width="24" height="24" alt="" /> | Circle / disc | `ri-circle-line` | Remix | [circle-line](https://remixicon.com/icon/circle-line) |
| <img src="./img/icon-previews/remix/text.svg" width="24" height="24" alt="" /> | Text | `ri-text` | Remix | [text](https://remixicon.com/icon/text) |
| <img src="./img/icon-previews/remix/edit-line.svg" width="24" height="24" alt="" /> | Modify | `ri-edit-line` | Remix | [edit-line](https://remixicon.com/icon/edit-line) |
| <img src="./img/icon-previews/remix/shape-line.svg" width="24" height="24" alt="" /> | Modify shape | `ri-shape-line` | Remix | [shape-line](https://remixicon.com/icon/shape-line) |
| <img src="./img/icon-previews/remix/drag-move-2-line.svg" width="24" height="24" alt="" /> | Move | `ri-drag-move-2-line` | Remix | [drag-move-2-line](https://remixicon.com/icon/drag-move-2-line) |
| <img src="./img/icon-previews/remix/restart-line.svg" width="24" height="24" alt="" /> | Rotate | `ri-restart-line` | Remix | [restart-line](https://remixicon.com/icon/restart-line) |
| <img src="./img/icon-previews/remix/palette-line.svg" width="24" height="24" alt="" /> | Style | `ri-palette-line` | Remix | [palette-line](https://remixicon.com/icon/palette-line) |
| <img src="./img/icon-previews/remix/close-circle-line.svg" width="24" height="24" alt="" /> | Remove feature | `ri-close-circle-line` | Remix | [close-circle-line](https://remixicon.com/icon/close-circle-line) |
| <img src="./img/icon-previews/remix/delete-bin-6-fill.svg" width="24" height="24" alt="" /> | Clear all | `ri-delete-bin-6-fill` | Remix | [delete-bin-6-fill](https://remixicon.com/icon/delete-bin-6-fill) |
| <img src="./img/icon-previews/remix/upload-line.svg" width="24" height="24" alt="" /> | Export | `ri-upload-line` | Remix | [upload-line](https://remixicon.com/icon/upload-line) |
| <img src="./img/icon-previews/remix/download-line.svg" width="24" height="24" alt="" /> | Import | `ri-download-line` | Remix | [download-line](https://remixicon.com/icon/download-line) |
| <img src="./img/icon-previews/remix/settings-3-line.svg" width="24" height="24" alt="" /> | Settings | `ri-settings-3-line` | Remix | [settings-3-line](https://remixicon.com/icon/settings-3-line) |
| <img src="./img/icon-previews/remix/alert-line.svg" width="24" height="24" alt="" /> | Save badge — unsaved | `ri-alert-line` | Remix | [alert-line](https://remixicon.com/icon/alert-line) |
| <img src="./img/icon-previews/remix/checkbox-circle-fill.svg" width="24" height="24" alt="" /> | Save badge — saved | `ri-checkbox-circle-fill` | Remix | [checkbox-circle-fill](https://remixicon.com/icon/checkbox-circle-fill) |
| <img src="./img/icon-previews/remix/corner-up-left-line.svg" width="24" height="24" alt="" /> <img src="./img/icon-previews/remix/corner-up-right-line.svg" width="24" height="24" alt="" /> <img src="./img/icon-previews/remix/delete-bin-6-line.svg" width="24" height="24" alt="" /> | Style popup — undo / redo / delete | `ri-corner-up-left-line`, `ri-corner-up-right-line`, `ri-delete-bin-6-line` | Remix | [corner-up-left-line](https://remixicon.com/icon/corner-up-left-line), [corner-up-right-line](https://remixicon.com/icon/corner-up-right-line), [delete-bin-6-line](https://remixicon.com/icon/delete-bin-6-line) |
| <img src="./img/icon-previews/dsfr/delete-line.svg" width="24" height="24" alt="" /> | Measure popup — remove | `fr-icon-delete-line` | DSFR | [delete-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=delete-line) |

---

## Géoplateforme search (`geopf-extensions-openlayers` — bundled)

Not maintained in `src/`; classes appear in `dist/entree-carto-search-engine.js`. Documented here because [SearchEngineControl](./SearchEngineControl.md) ships them.

| Preview | Label | HTML class | Catalog | URL |
| ------- | ----- | ---------- | ------- | --- |
| <img src="./img/icon-previews/dsfr/search-line.svg" width="24" height="24" alt="" /> | Open search / submit | `fr-icon-search-line` | DSFR | [search-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=search-line) |
| <img src="./img/icon-previews/dsfr/map-pin-2-line.svg" width="24" height="24" alt="" /> | Default result / address | `fr-icon-map-pin-2-line` | DSFR | [map-pin-2-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=map-pin-2-line) |
| <img src="./img/icon-previews/dsfr/history-line.svg" width="24" height="24" alt="" /> | History entry | `fr-icon-history-line` | DSFR | [history-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=history-line) |
| <img src="./img/icon-previews/dsfr/france-line.svg" width="24" height="24" alt="" /> | Administrative result | `fr-icon-france-line` | DSFR | [france-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=france-line) |
| — | Hydrography | `fr-icon-ign-mer` | DSFR | [ign-mer](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=ign-mer) |
| <img src="./img/icon-previews/dsfr/subway-line.svg" width="24" height="24" alt="" /> | Transit / station | `fr-icon-subway-line` | DSFR | [subway-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=subway-line) |
| <img src="./img/icon-previews/dsfr/plane-line.svg" width="24" height="24" alt="" /> | Air | `fr-icon-plane-line` | DSFR | [plane-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=plane-line) |
| <img src="./img/icon-previews/dsfr/ship-2-line.svg" width="24" height="24" alt="" /> | Sea / port | `fr-icon-ship-2-line` | DSFR | [ship-2-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=ship-2-line) |
| <img src="./img/icon-previews/dsfr/parking-box-line.svg" width="24" height="24" alt="" /> | Parking | `fr-icon-parking-box-line` | DSFR | [parking-box-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=parking-box-line) |
| <img src="./img/icon-previews/dsfr/bike-line.svg" width="24" height="24" alt="" /> | Cycling | `fr-icon-bike-line` | DSFR | [bike-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=bike-line) |
| <img src="./img/icon-previews/dsfr/arrow-up-s-line.svg" width="24" height="24" alt="" /> | Advanced panel toggle | `fr-icon-arrow-up-s-line` | DSFR | [arrow-up-s-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=arrow-up-s-line) |
| <img src="./img/icon-previews/dsfr/close-circle-fill.svg" width="24" height="24" alt="" /> | Clear field | `fr-icon-close-circle-fill` | DSFR | [close-circle-fill](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=close-circle-fill) |
| <img src="./img/icon-previews/dsfr/crosshair-2-line.svg" width="24" height="24" alt="" /> | Geolocate | `fr-icon-crosshair-2-line` | DSFR | [crosshair-2-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=crosshair-2-line) |
| <img src="./img/icon-previews/dsfr/close-line.svg" width="24" height="24" alt="" /> | Popup / panel close | `fr-icon-close-line` | DSFR | [close-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=close-line) |
| <img src="./img/icon-previews/dsfr/delete-line.svg" width="24" height="24" alt="" /> | Remove marker / measure | `fr-icon-delete-line` | DSFR | [delete-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=delete-line) |

**Zoom**, **full screen**, **overview map**: geopf `gpf-btn` pictograms via CSS `::after` (no `fr-icon-*` / `ri-*` in entree-carto sources).

---

## Maintenance

When adding or changing a pictogram in `src/`:

1. Prefer an existing DSFR or Remix name from this page.
2. Update this file and [icone-references.fr.md](./icone-references.fr.md) in the same change.
3. Run `npm run doc:icon-previews` and commit `doc/img/icon-previews/` (Preview column).
4. For geopf-only updates, refresh the **Géoplateforme search** section after rebuilding `dist/entree-carto-search-engine.js` if classes changed upstream.
