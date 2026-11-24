---
name: vue-openlayers
description: Conventions et pièges pour coder des outils cartographiques avec Vue 3 (Composition API, <script setup>, TypeScript) et OpenLayers (paquet `ol`). À utiliser dès que la tâche mentionne carte, cartographie, map, OpenLayers, `ol`, couches, GeoJSON, WMS/WMTS, projections (EPSG:2154, 3857, 4326), dessin/édition de géométries, sélection d'entités, popup sur carte, ou un composant Vue qui affiche ou manipule une carte, même si OpenLayers n'est pas nommé explicitement. Couvre l'intégration (réactivité, cycle de vie, composables), les couches, les interactions, les projections et la performance.
---

# Vue 3 + OpenLayers

Objectif : produire du code Vue idiomatique qui n'entre pas en conflit avec le modèle objet d'OpenLayers (OL).

## Avant de coder

1. Lire `package.json` : version de `ol`, présence de TypeScript, Pinia, Nuxt, Vitest. S'y conformer, ne rien ajouter sans raison.
2. Si `ol` n'est pas installé : `npm i ol`. Ne jamais installer `@types/ol` (les versions récentes embarquent leurs types).
3. Les API WebGL et certains imports ont évolué entre versions majeures : en cas de doute, vérifier la doc de la version installée (https://openlayers.org/en/latest/apidoc/) plutôt que se fier à la mémoire.
4. Imports modulaires uniquement (`import Map from 'ol/Map'`), jamais le bundle global `ol`. Importer `ol/ol.css` une seule fois.

## Règles d'or (à ne jamais enfreindre)

1. **Ne jamais rendre les objets OL réactifs en profondeur.** `Map`, `View`, `Layer`, `Source`, `Feature`, `Interaction` doivent vivre dans un `shallowRef`, une variable non réactive, ou être enveloppés par `markRaw`. Un `ref(new Map())` ou un `reactive({ map })` crée des proxys profonds : lenteurs, identités cassées, erreurs obscures.
2. **Le conteneur doit avoir une hauteur explicite** (`height: 100%` avec parents dimensionnés, ou `100vh`). Sans cela la carte est invisible.
3. **Créer la carte dans `onMounted`, la détruire dans `onBeforeUnmount`** : `map.setTarget(undefined)`, retrait des écouteurs (`unByKey`), `map.dispose()`.
4. **Redimensionnement** : OL ne suit que la fenêtre. Pour un conteneur qui change de taille (panneau, onglet, `v-show`, split pane), brancher un `ResizeObserver` qui appelle `map.updateSize()`.
5. **Ne jamais recréer une couche/source quand une prop change** : mettre à jour l'existant (`setVisible`, `setOpacity`, `setZIndex`, `source.setUrl`, `source.refresh()`, `layer.setSource`).
6. **Nommer l'import `Map` en `OlMap`** pour ne pas masquer le `Map` natif de JavaScript.

## Architecture recommandée

```
src/
  composables/useOlMap.ts        # création/destruction de la carte
  components/map/MapView.vue     # conteneur + provide(map)
  components/map/MapLayer*.vue   # une couche = un composant sans rendu
  components/map/MapDraw.vue     # une interaction = un composant sans rendu
  lib/map/                       # styles, projections, helpers purs (testables)
```

Logique OL pure (styles, conversions, formats) dans `lib/map/`, sans dépendance à Vue. Composants fins qui orchestrent.

### Composable de carte

```ts
// composables/useOlMap.ts
import { onBeforeUnmount, onMounted, shallowRef, type Ref } from 'vue'
import OlMap from 'ol/Map'
import View, { type ViewOptions } from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import 'ol/ol.css'

export function useOlMap(target: Ref<HTMLElement | null>, view: ViewOptions = {}) {
  const map = shallowRef<OlMap | null>(null)
  let observer: ResizeObserver | undefined

  onMounted(() => {
    if (!target.value) return
    map.value = new OlMap({
      target: target.value,
      layers: [new TileLayer({ source: new OSM() })],
      view: new View({ center: [0, 0], zoom: 2, ...view }),
    })
    observer = new ResizeObserver(() => map.value?.updateSize())
    observer.observe(target.value)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    map.value?.setTarget(undefined)
    map.value?.dispose()
    map.value = null
  })

  return { map }
}
```

### Partage de la carte avec les enfants

```ts
// composables/mapContext.ts
import { inject, provide, type InjectionKey, type ShallowRef } from 'vue'
import type OlMap from 'ol/Map'

export const MAP_KEY: InjectionKey<ShallowRef<OlMap | null>> = Symbol('ol-map')
export const provideMap = (m: ShallowRef<OlMap | null>) => provide(MAP_KEY, m)
export function useInjectedMap() {
  const m = inject(MAP_KEY)
  if (!m) throw new Error('useInjectedMap doit être appelé sous <MapView>')
  return m
}
```

`MapView.vue` appelle `useOlMap` puis `provideMap(map)` et rend `<div ref="el" class="map" /><slot />`.

### Couche déclarative (composant sans rendu)

La carte est `null` au premier rendu des enfants (créée dans `onMounted` du parent) : toujours passer par un `watch` sur la carte.

```ts
// MapGeoJsonLayer.vue (script setup)
const props = defineProps<{ url: string; visible?: boolean; opacity?: number }>()
const map = useInjectedMap()

const source = new VectorSource({ url: props.url, format: new GeoJSON() })
const layer = new VectorLayer({ source, style: featureStyle }) // style défini hors composant

watch(map, (m, _old, onCleanup) => {
  if (!m) return
  m.addLayer(layer)
  onCleanup(() => m.removeLayer(layer))
}, { immediate: true })

watch(() => props.visible, v => layer.setVisible(v ?? true), { immediate: true })
watch(() => props.opacity, o => layer.setOpacity(o ?? 1), { immediate: true })
watch(() => props.url, u => { source.setUrl(u); source.refresh() })
onBeforeUnmount(() => layer.dispose())
```

Même schéma pour les interactions (`map.addInteraction` / `removeInteraction`) et les overlays.

## Synchronisation état Vue ↔ vue de la carte

- Écrire dans l'état (Pinia, URL, props) sur `moveend`, pas sur `pointermove`, et avec arrondi (`center` à 5 décimales en 4326).
- Pour appliquer un état entrant, comparer avant d'écrire (`view.getZoom() !== zoom`) afin d'éviter les boucles Vue → OL → Vue.
- Pour déplacer : `view.animate({ center, zoom, duration: 300 })` ou `view.fit(extent, { padding: [20, 20, 20, 20], maxZoom: 18 })`.
- Toujours conserver la clé retournée par `map.on(...)` / `source.on(...)` et la libérer avec `unByKey` au démontage.

## Projections

- Vue de la carte en EPSG:3857 par défaut. Les données GeoJSON sont en EPSG:4326 (lon, lat) : lire avec
  `new GeoJSON().readFeatures(data, { dataProjection: 'EPSG:4326', featureProjection: map.getView().getProjection() })`.
- Écrire (export) avec la projection inverse : `writeFeatures(features, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' })`.
- Si toute l'app travaille en lon/lat : `useGeographic()` (`ol/proj`) en tout début d'application, avant de créer la carte.
- Projections françaises (Lambert-93 EPSG:2154, CC48, etc.) : `proj4` + enregistrement explicite.

```ts
import proj4 from 'proj4'
import { register } from 'ol/proj/proj4'
proj4.defs('EPSG:2154', '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs')
register(proj4) // une seule fois, avant toute utilisation
```

- Ordre des axes : OL utilise toujours (x, y) = (lon, lat). Attention aux services WMS 1.3.0 qui inversent pour 4326.

## Couches et sources

| Besoin | Outil |
|---|---|
| Fond de plan XYZ/OSM | `ol/layer/Tile` + `ol/source/XYZ` / `OSM` |
| WMS | `TileLayer` + `ol/source/TileWMS` (ou `ImageWMS` pour une image unique) |
| WMTS | `ol/source/WMTS` + `optionsFromCapabilities` (`ol/format/WMTSCapabilities`) |
| GeoJSON / KML / GPX | `VectorLayer` + `VectorSource` + format |
| Tuiles vectorielles | `ol/layer/VectorTile` + `ol/source/VectorTile` + `MVT` |
| Beaucoup de points | `Cluster` (`ol/source/Cluster`) ou couche WebGL (vérifier le nom dans la version installée) |

- `crossOrigin: 'anonymous'` sur les sources tuilées si export canvas/PNG nécessaire.
- Gérer les erreurs réseau : écouter `tileloaderror` / `featuresloaderror` et exposer un état d'erreur au composant.
- Ordre d'affichage : `zIndex` explicite plutôt que l'ordre d'ajout.

## Styles et performance

- **Un style = un objet créé une seule fois**, hors des fonctions de style. Une fonction de style appelée par feature et par rendu ne doit pas instancier `Style`, `Fill`, `Stroke` à chaque appel : mettre en cache par clé (état, catégorie, zoom).
- Éviter `feature.set()` en rafale sur de gros jeux : regrouper, puis `source.changed()` une fois.
- `source.addFeatures([...])` plutôt que `addFeature` en boucle.
- Gros volumes : clustering, simplification côté serveur, tuiles vectorielles, ou rendu WebGL.
- `declutter: true` sur la couche pour les étiquettes, avec parcimonie.

## Interactions

- **Ordre d'ajout** : `Select`/`Draw` d'abord, `Modify` ensuite, **`Snap` en dernier**.
- Une seule interaction d'édition active à la fois ; désactiver proprement les autres (`setActive(false)`) ou les retirer.
- Identification au clic : `map.forEachFeatureAtPixel(pixel, cb, { layerFilter, hitTolerance: 4 })`. Utiliser `singleclick` pour la sélection (pas `click`, qui se déclenche aussi sur double-clic).
- Popup/infobulle : composant Vue + `ol/Overlay` pointant sur un élément du DOM géré par Vue ; ne pas rendre la popup dans le style OL.
- Curseur : changer `map.getTargetElement().style.cursor` sur `pointermove` (avec `map.hasFeatureAtPixel`).
- Annulation/rétablissement d'édition : écouter `drawend`, `modifyend`, mémoriser un état sérialisé (GeoJSON), ne pas stocker les objets `Feature` dans l'historique.

## Nuxt / SSR

- Aucun accès DOM au setup. Envelopper le composant carte dans `<ClientOnly>` ou nommer le fichier `*.client.vue`.
- Importer `ol` seulement côté client si une dépendance casse au build serveur (`defineAsyncComponent` ou import dynamique dans `onMounted`).

## Tests (Vitest)

- Tester la logique pure de `lib/map/` (conversion de projection, styles, filtres) sans monter de carte.
- jsdom n'a pas de canvas : pour monter un composant, mocker `ol/Map` (ou ne tester que les props, émissions et appels de méthodes).
- Les rendus réels se vérifient en e2e (Playwright) avec une capture.

## Pièges fréquents (à vérifier en revue)

- `ref(map)` / `reactive` sur des objets OL.
- Carte vide : hauteur nulle, CSS `ol/ol.css` absent, ou `target` introuvable.
- Carte décalée ou grisée après affichage d'un onglet : `updateSize()` manquant.
- Données mal placées (au large de l'Afrique, 0,0) : lon/lat inversés ou projection non déclarée.
- Fuites mémoire : écouteurs non libérés, `Map` non disposée, `Overlay` non retiré.
- Doublons d'interactions après hot reload : toujours retirer à la destruction.
- `Snap` ajouté avant `Modify`, donc accrochage sans effet.
- Mise à jour d'une prop qui recrée tout au lieu de muter la couche.

## Checklist de fin de tâche

- [ ] Aucun objet OL dans un `ref`/`reactive`.
- [ ] Création dans `onMounted`, nettoyage complet dans `onBeforeUnmount`.
- [ ] Conteneur dimensionné, `updateSize` géré.
- [ ] Projections explicites à la lecture et à l'écriture des données.
- [ ] Styles mis en cache, pas de recréation par rendu.
- [ ] Types TypeScript propres (`strict`), pas de `any` sur les objets OL.
- [ ] Lint et tests du projet exécutés.
