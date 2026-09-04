<script setup lang="ts">
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
</script>

<template>
  <div class="ec-sketch-demo fr-container fr-py-3w">
    <h1 class="fr-h3 fr-mb-2w">SketchControl — outils de dessin</h1>
    <p class="fr-text--sm fr-mb-3w">
      Bundle standalone
      <code>entree-carto-sketch</code>
      : croquis sur une carte OL (même moteur que la carte principale et GeometryEditor). Démo
      ci-dessous via
      <code>mountSketch</code>.
    </p>

    <DsfrAccordionsGroup v-model="docsAccordionOpen" class="fr-mb-5w">
      <DsfrAccordion id="ec-sketch-docs" title="Utilisation et options" title-tag="h2">
        <h3 class="fr-h6">Intégration HTML</h3>
        <pre class="ec-sketch-demo__code fr-mb-3w"><code>{{ usageSnippet }}</code></pre>

        <h3 class="fr-h6">Carte déjà créée</h3>
        <pre class="ec-sketch-demo__code fr-mb-3w"><code>{{ attachSnippet }}</code></pre>

        <h3 class="fr-h6">Options</h3>
        <div class="fr-table fr-table--no-caption fr-mb-3w">
          <table>
            <thead>
              <tr>
                <th scope="col">Option</th>
                <th scope="col">Défaut</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="opt in optionDocs" :key="opt.name">
                <td>
                  <code>{{ opt.name }}</code>
                </td>
                <td>
                  <code>{{ opt.def }}</code>
                </td>
                <td>{{ opt.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 class="fr-h6">Comportement</h3>
        <ul class="fr-text--sm">
          <li>
            Outils : Point, LineString, Polygon, Disc (+ modifier / supprimer / tout supprimer).
          </li>
          <li><code>toolsToggle</code> : bouton menu outils ouvre / ferme la barre.</li>
          <li>
            Infobulles style geopf au survol de chaque outil (
            <code>aria-label</code>).
          </li>
          <li>
            Persistance optionnelle via
            <code>localStorageKey</code> (GeoJSON EPSG:4326).
          </li>
          <li>Text / Import / Export / Mesures : roadmap (pas encore dans ce bundle).</li>
        </ul>
      </DsfrAccordion>
    </DsfrAccordionsGroup>

    <div ref="mapHost" class="ec-sketch-demo__map" data-testid="sketch-demo-map" />

    <label class="fr-label fr-mt-3w" for="ec-sketch-geojson">
      GeoJSON du croquis (sérialisé)
    </label>
    <textarea
      id="ec-sketch-geojson"
      class="fr-input ec-sketch-demo__out"
      rows="8"
      readonly
      :value="geoJsonOut"
    />
  </div>
</template>

<style scoped>
.ec-sketch-demo__code {
  margin: 0;
  padding: 0.75rem 1rem;
  overflow: auto;
  white-space: pre-wrap;
  background: var(--background-alt-grey, #f6f6f6);
  border-radius: 0.25rem;
}

.ec-sketch-demo__map {
  min-height: 720px;
  height: min(80vh, 720px);
}

.ec-sketch-demo__out {
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
  max-height: 280px;
}
</style>
