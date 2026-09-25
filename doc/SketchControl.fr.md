[![en](https://img.shields.io/badge/lang-en-red.svg)](SketchControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](SketchControl.fr.md)

# SketchControl

Contrôle OpenLayers de **croquis** (dessin / édition de géométries) réutilisable par la carte principale et par `GeometryEditor`.

**Sources :**

- Classe : `src/geometry-editor/SketchControl.ts`
- Modules : `src/geometry-editor/sketch/` (historique, texte, mesures, I/O)
- Wrapper Vue : `src/components/map/SketchControl.vue`
- Standalone : `src/sketch/` (`mountSketch`, API `window.EntreeCartoSketch`)
- Moteur dessin : `DrawToolsBar` (+ `ModifyTransformController`)

**Bundles :**

- Déjà inclus dans `entree-carto-geometry-editor` (`EntreeCartoGeometryEditor.SketchControl`)
- Standalone : `dist/entree-carto-sketch[.min].js` + `dist/css/entree-carto-sketch[.min].css`  
  → `window.EntreeCartoSketch` (`mountSketch`, `attachGeometryTools`, `SketchControl`)

**CSS :** styles `ec-geometry-editor__*` (toolbar 48×48) + slot geopf `ec-sketch-control--geopf-slot`  
Sur la carte principale : colonne layout **48px** (`--ec-sketch-column-width`), scroll vertical si besoin ; infobulles à droite des boutons (zone `--ec-geom-tooltip-space`, sans élargir la colonne geopf) ; **clics traversants** sur la zone transparente de la toolbar (`pointer-events: none` sur `#ec-sketch-toolbar-*`, `auto` sur les boutons). La recherche lieu est décalée via `--ec-search-left-inset` (`map-controls.css`).

## Description

- Couche vectorielle dédiée (`zIndex` défaut **500**, propriété `ec-sketch`)
- Outils : Point, LineString, Polygon, Rectangle, Disc (+ modifier / supprimer)
- Option `toolsToggle` : bouton menu (picto outils) dans un coin
- Barre d’outils **scrollable** verticalement si elle dépasse la hauteur carte (molette / touch sur la colonne boutons ou sur la **sous-barre modification** lorsqu’elle est ouverte). La sous-barre reste **visible** en mode modification ; sa **hauteur max.** est limitée au scrollport visible de la barre principale (scroll interne si besoin).
- Option `clearAll` : bouton « tout supprimer »
- Option `localStorageKey` : bouton **Enregistrer** → persiste croquis + historique undo/redo (`{clé}` et `{clé}:history`) ; au rechargement, restauration du **dernier enregistrement** uniquement (modifications non enregistrées perdues)
- Option `history` : **Annuler** / **Rétablir** en session ; piles restaurées après rechargement si un Enregistrer avait été fait
- Option `extraTools` : Text, Import, Export, MeasureDistance, MeasureArea
- Option `enableFeatureStyleEditor` : popup de style à la création (défaut **false** ; activé sur carte / démo)
- Infobulles style geopf sur chaque bouton
- Ordre barre (groupes séparés) : mesures → enregistrer / undo / redo → dessin + texte → modifier / supprimer → export / import

## Outils `extraTools`

| Id                | Comportement                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Text`            | Label seul ; popup style (texte, taille, couleur, contour, rotation) si `enableFeatureStyleEditor` ; drag + icône rotation en modification   |
| `Import`          | Fichier `*.kml`, `*.json` ou `*.geojson` (filtre du sélecteur) → features croquis ; KML via parseur sécurisé, JSON/GeoJSON via `readSketchGeoJsonObject` |
| `Export`          | Dialogue (select GeoJSON/KML + Annuler / Exporter)                                                                                           |
| `MeasureDistance` | LineString tirets sur couche `measureLayer` + popup distance (forme localisation, bouton Supprimer uniquement) ; picto Remix `ri-ruler-line` |
| `MeasureArea`     | Polygon tirets sur `measureLayer` + popup aire (idem) ; picto Remix `ri-custom-size`                                                         |

## Popup style (`enableFeatureStyleEditor`)

À la création d’une feature (dessin classique ou texte), ouvre une popup adaptée au type (Overlay OL `bottom-center`, comme les mesures ; fermeture au clic extérieur, sauf pan carte). En **modification**, une icône palette rouvre la popup.

Color pickers : clic sur la case → dialogue (sélecteur natif, hex, barre d’**opacité**).

Bouton **Enregistrer** : pastille verte (à jour) / orange (modifications non enregistrées), y compris après undo/redo.

Bouton **Options avancées** (repliées par défaut) : tirets, extrémités, jonctions, forme du point, gras / italique, zIndex, etc. Les champs non pertinents sont désactivés (ex. rotation d’un point circulaire, décalage tirets si trait plein).

Le style est stocké dans la propriété feature `ec-feature-style` (et `ec-sketch-text` pour le texte) — pris en compte à l’**import** / **export** GeoJSON ; en KML les objets sont sérialisés en JSON dans ExtendedData.

Les **disques / cercles** (`ol/geom/Circle`) sont sérialisés en GeoJSON avec une géométrie custom `{ "type": "Disc"|"Circle", "center": [lon, lat], "radius": m }` (propriété `ecKind`). En KML : polygone approximant + `ecKind` dans les propriétés.

### Compatibilité import gpu-client

Les exports GeoJSON de **gpu-client** (`properties.style` + `gpuGeometryType`) sont reconnus automatiquement et convertis en `ec-feature-style` / `ec-sketch-text` (textes inclus). Module : `sketch/gpuClientSketchAdapter.ts`.

Couleurs (popup style) : clic sur la **pastille** → sélecteur natif du navigateur uniquement (pas de second panneau). Sous la pastille : champ **hex `#RRGGBBAA`** et **curseur d’opacité**.

Popup attributs : hauteur max. **265px** (scroll interne) ; ouverture sans **auto-pan** carte ni scroll de la page document. Clic carte : fermeture au **relâchement** du bouton seulement si la souris n’a **pas bougé** (pan carte autorisé, popup suit l’ancre). Clic sur une **feature** (down + drag) : pan possible ; **singleclick** (sans drag) ouvre / repositionne la popup sur la feature. À la **création**, la popup ne s’ouvre qu’à la fin du dessin (disque/cercle : après le 2ᵉ clic fixant le rayon, pas au centre seul).

En **modification**, sous-outils **forme** / **déplacement** : pas de curseur « pointer » sur le corps de la feature ; **forme** → `pointer` près des sommets (ou curseur de redimensionnement rectangle / rayon) ; **déplacement** → curseur de translation dès qu’une feature est survolée (lignes / labels : petite tolérance de sélection). Sous-outil par défaut à l’ouverture de « Modifier » : **modification de forme**. En modes **déplacement**, **rotation** (sauf point et disque) et **style**, ainsi qu’en mode **Supprimer**, la feature survolée (feature du dessus si empilement) est **mise en valeur** (contour renforcé) ; au **mousedown** (modification) le style d’origine est rétabli. **Annuler** ferme la popup d’attributs si la feature éditée a été retirée. Le bouton **Enregistrer localement** n’interrompt pas l’outil de dessin actif.

| Type                          | Champs de base                            | Avancés (aperçu)                                                    |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| Texte                         | texte, taille, couleur, contour, rotation | police, gras, italique, épaisseur contour, zIndex                   |
| Point                         | rayon, remplissage, contour, épaisseur    | forme, rotation symbole (hors cercle), zIndex                       |
| Ligne                         | contour, épaisseur                        | tirets, extrémités, jonctions, décalage, limite des pointes, zIndex |
| Polygone / Rectangle / Disque | remplissage, contour, épaisseur           | idem ligne                                                          |
| Cercle                        | contour, épaisseur                        | idem ligne                                                          |

GeometryEditor **ne** active **pas** `enableFeatureStyleEditor` (comportement historique).

## Démo

Route `/sketch` (`SketchDemoView.vue`) : encart utilisation / options + carte via `mountSketch`.  
Nav démo : lien **Croquis**.

## Bundle standalone (`entree-carto-sketch`)

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

## Options (classe TS)

| Option                     | Défaut       | Description                                                    |
| -------------------------- | ------------ | -------------------------------------------------------------- |
| `geometryType`             | `'Geometry'` | Types d’outils (CSV accepté)                                   |
| `toolsToggle`              | `null`       | `null` = barre toujours visible ; sinon coin du bouton menu    |
| `position`                 | —            | Coin geopf pour la carte principale                            |
| `source` / `layer`         | créés        | Réutiliser une source / couche existante                       |
| `style`                    | bleu France  | Style OL des features / croquis                                |
| `zIndex`                   | `500`        | zIndex si la couche est créée ici                              |
| `onChange`                 | —            | Callback après dessin / modif / suppression                    |
| `localStorageKey`          | `null`       | Clé `localStorage` (restore + bouton Enregistrer)              |
| `clearAll`                 | `false`      | Bouton tout supprimer                                          |
| `history`                  | `false`      | Annuler / Rétablir (persisté au Enregistrer, `{clé}:history`)  |
| `extraTools`               | `[]`         | Text, Import, Export, Measure*                                 |
| `enableFeatureStyleEditor` | `false`      | Popup de style à la création (+ icône palette en modification) |

## Props Vue (`SketchControl.vue`)

Défauts carte principale : `history: true`, `clearAll: true`, `localStorageKey: 'entree-carto-sketch'`, tous les `extraTools`, `enableFeatureStyleEditor: true`.

## GeometryEditor

Sans `localStorageKey`, `clearAll`, `history`, `extraTools`, ni `enableFeatureStyleEditor` → comportement historique inchangé.
