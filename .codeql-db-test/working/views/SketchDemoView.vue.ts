/**
 * Démo standalone — entree-carto-sketch
 * Carte + SketchControl, encart utilisation / options.
 */
import { onMounted, onUnmounted, ref } from 'vue'
import { mountSketch, type MountSketchHandle } from '@/sketch/mountSketch'
import 'ol/ol.css'
import '@/geometry-editor/styles/geometry-editor.css'

/** Index ouvert dans DsfrAccordionsGroup (-1 = fermé). */
const docsAccordionOpen = ref(-1)

interface OptionDoc {
  name: string
  def: string
  description: string
}

const optionDocs: OptionDoc[] = [
  {
    name: 'geometryType',
    def: "'Geometry'",
    description:
      'Types d’outils : Geometry (Point, ligne, polygone, disque) ou CSV (ex. Point,Disc)',
  },
  {
    name: 'toolsToggle',
    def: "'top-left'",
    description:
      'null = barre toujours visible ; sinon coin du bouton menu (top-left|top-right|bottom-left|bottom-right)',
  },
  {
    name: 'clearAll',
    def: 'true',
    description: 'Bouton « tout supprimer » dans la barre',
  },
  {
    name: 'localStorageKey',
    def: "'entree-carto-sketch'",
    description:
      'Clé localStorage (restore au chargement + bouton Enregistrer manuel). null pour désactiver',
  },
  {
    name: 'history',
    def: 'true',
    description: 'Boutons Annuler / Rétablir',
  },
  {
    name: 'extraTools',
    def: 'tous',
    description: 'text, import, export, measureDistance, measureArea (+ save si localStorageKey)',
  },
  {
    name: 'enableFeatureStyleEditor',
    def: 'true',
    description: 'Popup de style à la création (champs selon type). false = GeometryEditor',
  },
  {
    name: 'zIndex',
    def: '500',
    description: 'zIndex de la couche croquis',
  },
  {
    name: 'width / height',
    def: "'100%' / 720",
    description: 'Taille du conteneur carte (mountSketch)',
  },
  {
    name: 'lon / lat / zoom',
    def: '2 / 46.5 / 5',
    description: 'Vue initiale',
  },
  {
    name: 'tileLayers',
    def: 'Plan IGN WMTS',
    description: 'Fonds XYZ { url, attribution?, title?, maxZoom? }[]',
  },
  {
    name: 'showZoom',
    def: 'true',
    description: 'Contrôle +/- OpenLayers',
  },
  {
    name: 'onChange',
    def: '—',
    description: 'Callback après dessin / modification / suppression',
  },
  {
    name: 'extraTools',
    def: "['Text','Import','Export','MeasureDistance','MeasureArea']",
    description: 'Texte + popup, export (select format), mesures (popup localisation + supprimer)',
  },
]
const usageSnippet = [
  '<!-- CSS + JS -->',
  '<link rel="stylesheet" href="…/css/entree-carto-sketch.min.css" />',
  // eslint-disable-next-line no-useless-escape -- évite de fermer prématurément le <script> du SFC
  '<script src="…/entree-carto-sketch.min.js"><\/script>',
  '',
  '<div id="sketch-map"></div>',
  '<script>',
  "  const { map, sketch, destroy } = EntreeCartoSketch.mountSketch('#sketch-map', {",
  "    toolsToggle: 'top-left',",
  '    clearAll: true,',
  "    localStorageKey: 'entree-carto-sketch',",
  '    height: 720,',
  '  });',
  '  // sketch.getFeatures() / sketch.serialize() / sketch.load(raw)',
  '  // destroy()',
  // eslint-disable-next-line no-useless-escape -- évite de fermer prématurément le <script> du SFC
  '<\/script>',
].join('\n')

const attachSnippet = [
  'const sketch = new EntreeCartoSketch.SketchControl({',
  "  toolsToggle: 'bottom-left',",
  '  clearAll: true,',
  '});',
  'map.addControl(sketch);',
  '',
  '// ou',
  'EntreeCartoSketch.attachGeometryTools(map, {',
  "  toolsToggle: 'bottom-left',",
  '  clearAll: true,',
  '});',
].join('\n')

const mapHost = ref<HTMLElement | null>(null)
const geoJsonOut = ref('')
let handle: MountSketchHandle | null = null

onMounted(() => {
  if (!mapHost.value) return
  handle = mountSketch(mapHost.value, {
    height: 720,
    toolsToggle: 'top-left',
    clearAll: true,
    localStorageKey: 'entree-carto-sketch-demo',
    geometryType: 'Geometry',
    enableFeatureStyleEditor: true,
    onChange: () => {
      geoJsonOut.value =
        handle?.sketch.serialize({
          outputFormat: 'geojson',
          precision: 7,
        }) ?? ''
    },
  })
  geoJsonOut.value =
    handle.sketch.serialize({ outputFormat: 'geojson', precision: 7 }) ||
    '(aucun croquis — dessinez sur la carte)'
})

onUnmounted(() => {
  handle?.destroy()
  handle = null
})
