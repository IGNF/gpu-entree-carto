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

## Description

- Couche vectorielle dédiée (`zIndex` défaut **500**, propriété `ec-sketch`)
- Outils : Point, LineString, Polygon, Rectangle, Disc (+ modifier / supprimer)
- Option `toolsToggle` : bouton menu (picto outils) dans un coin
- Option `clearAll` : bouton « tout supprimer »
- Option `localStorageKey` : charge au montage + bouton **Enregistrer** (pas d’auto-save)
- Option `history` : **Annuler** / **Rétablir**
- Option `extraTools` : Text, Import, Export, MeasureDistance, MeasureArea
- Option `enableFeatureStyleEditor` : popup de style à la création (défaut **false** ; activé sur carte / démo)
- Infobulles style geopf sur chaque bouton
- Ordre barre (groupes séparés) : mesures → enregistrer / undo / redo → dessin + texte → modifier / supprimer → export / import

## Outils `extraTools`

| Id                | Comportement                                                                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Text`            | Label seul ; popup style (texte, taille, couleur, contour, rotation) si `enableFeatureStyleEditor` ; drag + icône rotation en modification                 |
| `Import`          | Fichier GeoJSON ou KML → features croquis                                                                                                                  |
| `Export`          | Dialogue (select GeoJSON/KML + Annuler / Exporter)                                                                                                         |
| `MeasureDistance` | LineString tirets sur couche `measureLayer` + popup distance (forme localisation, bouton Supprimer uniquement) ; picto Remix `ruler-line` (hors pack DSFR) |
| `MeasureArea`     | Polygon tirets sur `measureLayer` + popup aire (idem) ; picto Tabler `dimensions` (flèches largeur/hauteur — pas Remix `aspect-ratio-line`)                |

## Popup style (`enableFeatureStyleEditor`)

À la création d’une feature (dessin classique ou texte), ouvre une popup adaptée au type (position `fixed` sur le document — peut dépasser le cadre carte ; fermeture au clic extérieur, sauf pan carte). En **modification**, une icône palette rouvre la popup.

Color pickers : clic sur la case → dialogue (sélecteur natif, hex, barre d’**opacité**).

Bouton **Enregistrer** : pastille verte (à jour) / orange (modifications non enregistrées), y compris après undo/redo.

Bouton **Options avancées** (repliées par défaut) : tirets, extrémités, jonctions, forme du point, gras / italique, zIndex, etc. Les champs non pertinents sont désactivés (ex. rotation d’un point circulaire, décalage tirets si trait plein).

Le style est stocké dans la propriété feature `ec-feature-style` (et `ec-sketch-text` pour le texte) — pris en compte à l’**import** / **export** GeoJSON ; en KML les objets sont sérialisés en JSON dans ExtendedData.

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
| `history`                  | `false`      | Annuler / Rétablir                                             |
| `extraTools`               | `[]`         | Text, Import, Export, Measure*                                 |
| `enableFeatureStyleEditor` | `false`      | Popup de style à la création (+ icône palette en modification) |

## Props Vue (`SketchControl.vue`)

Défauts carte principale : `history: true`, `clearAll: true`, `localStorageKey: 'entree-carto-sketch'`, tous les `extraTools`, `enableFeatureStyleEditor: true`.

## GeometryEditor

Sans `localStorageKey`, `clearAll`, `history`, `extraTools`, ni `enableFeatureStyleEditor` → comportement historique inchangé.
