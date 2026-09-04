<script setup lang="ts">
/**
 * Démo standalone — entree-carto-geometry-editor
 * Un exemple par type : GeoJSON et KML côte à côte.
 */
import { onMounted, onUnmounted, ref } from 'vue'
import Feature from 'ol/Feature'
import GeoJSON from 'ol/format/GeoJSON'
import KML from 'ol/format/KML'
import { Polygon } from 'ol/geom'
import { mountGeometryEditor, type MountGeometryEditorHandle } from '@/geometry-editor'
import type { GeometryOutputFormat, GeometryTypeOption } from '@/geometry-editor/types'
import { looksLikeBbox } from '@/geometry-editor/parseGeometry'
import {
  circleToPolygonFeature,
  featureFromCircleJson,
  featuresFromMultiCircleJson,
  looksLikeCircleOrDisc,
  looksLikeMultiCircleOrDisc,
} from '@/geometry-editor/circleHelpers'
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
      'Un type (Point, …, MultiDisc, Geometry) ou plusieurs séparés par des virgules (ex. Point,Disc)',
  },
  {
    name: 'hide',
    def: 'true',
    description: 'Masque l’élément HTML source (champ / textarea)',
  },
  {
    name: 'editable',
    def: 'true',
    description: 'Affiche la barre d’outils à gauche dans la carte (sinon viewer seul)',
  },
  {
    name: 'tileLayers',
    def: 'Plan IGN WMTS',
    description: 'Fonds XYZ : { url, attribution?, title?, maxZoom? }[]',
  },
  {
    name: 'width / height',
    def: "'100%' / 400",
    description: 'Taille du conteneur carte (px ou CSS)',
  },
  {
    name: 'lon / lat / zoom',
    def: '2 / 46.5 / 5',
    description: 'Vue initiale (EPSG:4326)',
  },
  {
    name: 'minZoom / maxZoom',
    def: '4 / 19',
    description: 'Limites de zoom',
  },
  {
    name: 'centerOnResults',
    def: 'true',
    description: 'Recadre la vue après chargement / édition',
  },
  {
    name: 'precision',
    def: '7',
    description: 'Décimales GeoJSON / bbox à l’écriture',
  },
  {
    name: 'outputFormat',
    def: "'geojson'",
    description: "'geojson' | 'kml' (format écrit dans l’élément)",
  },
  {
    name: 'className',
    def: '—',
    description: 'Classe CSS additionnelle sur le conteneur carte',
  },
  {
    name: 'blockView',
    def: 'false',
    description:
      'Bloque pan / zoom manuels (molette, drag, double-clic, pinch, clavier, boutons +/-). Le fit programmatique reste possible.',
  },
  {
    name: 'showZoom',
    def: 'true',
    description: 'Affiche les boutons +/- de zoom (ignoré si blockView est true)',
  },
  {
    name: 'showSettings',
    def: 'false',
    description:
      'Affiche le bouton roue crantée (haut droite) pour modifier les options à chaud via un formulaire',
  },
  {
    name: 'showAttributions',
    def: 'false',
    description: 'Affiche le contrôle d’attributions des couches de fond',
  },
  {
    name: 'toolsToggle',
    def: 'null',
    description:
      'null = outils toujours visibles à gauche ; sinon coin du bouton menu (top-left | top-right | bottom-left | bottom-right) qui ouvre / ferme la barre d’outils',
  },
  {
    name: 'customStyle',
    def: 'null',
    description:
      'Style OpenLayers (Style / Style[] / StyleFunction) des features et du croquis ; défaut bleu France',
  },
]

const usageSnippet = `const { editor, setOptions } = EntreeCartoGeometryEditor.mountGeometryEditor('#extent', {
  geometryType: 'Rectangle',
  height: 400,
  editable: true,
  hide: true,
  outputFormat: 'geojson',
  blockView: false,
  showZoom: true,
  showSettings: false,
  showAttributions: false,
  toolsToggle: null,
  customStyle: null,
});
// setOptions({ showSettings: true, blockView: true })
// editor.getMap()
// editor.destroy()`

interface DemoSection {
  type: GeometryTypeOption
  /** Identifiant DOM (défaut = type) */
  slug?: string
  title: string
  hint: string
  sampleGeoJson: string
  rows: number
}

type FormatKey = GeometryOutputFormat

const geoJsonFormat = new GeoJSON()
const kmlFormat = new KML()

const sections: DemoSection[] = [
  {
    type: 'Point',
    title: 'Point',
    hint: 'Un seul point (remplacé à chaque dessin).',
    sampleGeoJson: JSON.stringify({ type: 'Point', coordinates: [2.35, 48.85] }, null, 2),
    rows: 4,
  },
  {
    type: 'LineString',
    title: 'LineString',
    hint: 'Une polyligne (remplacée à chaque dessin).',
    sampleGeoJson: JSON.stringify(
      {
        type: 'LineString',
        coordinates: [
          [2.3, 48.84],
          [2.35, 48.86],
          [2.4, 48.85],
        ],
      },
      null,
      2,
    ),
    rows: 6,
  },
  {
    type: 'Polygon',
    title: 'Polygon',
    hint: 'Un polygone (remplacé à chaque dessin).',
    sampleGeoJson: JSON.stringify(
      {
        type: 'Polygon',
        coordinates: [
          [
            [2.3, 48.84],
            [2.4, 48.84],
            [2.4, 48.88],
            [2.3, 48.88],
            [2.3, 48.84],
          ],
        ],
      },
      null,
      2,
    ),
    rows: 8,
  },
  {
    type: 'MultiPoint',
    title: 'MultiPoint',
    hint: 'Ajoutez plusieurs points ; suppression au clic (outil poubelle).',
    sampleGeoJson: JSON.stringify(
      {
        type: 'MultiPoint',
        coordinates: [
          [2.32, 48.85],
          [2.36, 48.86],
          [2.38, 48.84],
        ],
      },
      null,
      2,
    ),
    rows: 6,
  },
  {
    type: 'MultiLineString',
    title: 'MultiLineString',
    hint: 'Plusieurs lignes (dessinez plusieurs fois).',
    sampleGeoJson: JSON.stringify(
      {
        type: 'MultiLineString',
        coordinates: [
          [
            [2.3, 48.85],
            [2.35, 48.87],
          ],
          [
            [2.36, 48.84],
            [2.42, 48.86],
          ],
        ],
      },
      null,
      2,
    ),
    rows: 8,
  },
  {
    type: 'MultiPolygon',
    title: 'MultiPolygon',
    hint: 'Plusieurs polygones (dessinez plusieurs fois).',
    sampleGeoJson: JSON.stringify(
      {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [2.3, 48.84],
              [2.34, 48.84],
              [2.34, 48.87],
              [2.3, 48.87],
              [2.3, 48.84],
            ],
          ],
          [
            [
              [2.36, 48.85],
              [2.4, 48.85],
              [2.4, 48.88],
              [2.36, 48.88],
              [2.36, 48.85],
            ],
          ],
        ],
      },
      null,
      2,
    ),
    rows: 10,
  },
  {
    type: 'Rectangle',
    title: 'Rectangle',
    hint: 'GeoJSON : bbox [minX, minY, maxX, maxY]. KML : polygone équivalent.',
    sampleGeoJson: '[2.2,48.8,2.5,48.95]',
    rows: 2,
  },
  {
    type: 'Disc',
    title: 'Disc',
    hint: 'Format custom : { type: "Disc", center: [lon, lat], radius }. Rempli ; translation intérieure ; pas de rotation. (Picto bouton = cercle.)',
    sampleGeoJson: JSON.stringify({ type: 'Disc', center: [2.4, 48.87], radius: 3500 }, null, 2),
    rows: 6,
  },
  {
    type: 'MultiDisc',
    title: 'MultiDisc',
    hint: 'Plusieurs disques ; format { type: "MultiDisc", geometries: [{ center, radius }, …] }.',
    sampleGeoJson: JSON.stringify(
      {
        type: 'MultiDisc',
        geometries: [
          { center: [2.3, 48.84], radius: 2200 },
          { center: [2.38, 48.89], radius: 1600 },
        ],
      },
      null,
      2,
    ),
    rows: 10,
  },
  {
    type: 'Point,Disc',
    slug: 'point-disc',
    title: 'Point,Disc (CSV)',
    hint: 'geometryType multi-valeurs : seuls les outils Point / Disque (+ modifier / supprimer).',
    sampleGeoJson: JSON.stringify({ type: 'Point', coordinates: [2.35, 48.86] }, null, 2),
    rows: 4,
  },
  {
    type: 'Geometry',
    title: 'Geometry (libre)',
    hint: 'Point, ligne, polygone ou disque ; plusieurs géométries possibles. Carte plus haute + toolsToggle top-left (bouton outils → barre).',
    sampleGeoJson: JSON.stringify(
      {
        type: 'Polygon',
        coordinates: [
          [
            [2.25, 48.82],
            [2.42, 48.82],
            [2.42, 48.9],
            [2.25, 48.9],
            [2.25, 48.82],
          ],
        ],
      },
      null,
      2,
    ),
    rows: 8,
  },
]

const formats: { key: FormatKey; label: string }[] = [
  { key: 'geojson', label: 'GeoJSON' },
  { key: 'kml', label: 'KML' },
]

function geoJsonSampleToKml(sample: string): string {
  try {
    if (looksLikeBbox(sample)) {
      const [minX, minY, maxX, maxY] = JSON.parse(sample) as number[]
      const poly = new Polygon([
        [
          [minX, minY],
          [minX, maxY],
          [maxX, maxY],
          [maxX, minY],
          [minX, minY],
        ],
      ])
      return kmlFormat.writeFeatures([new Feature({ geometry: poly })], {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:4326',
      })
    }
    const data = JSON.parse(sample) as { type?: string }
    if (looksLikeMultiCircleOrDisc(data)) {
      const feats3857 = featuresFromMultiCircleJson(data, 'EPSG:3857')
      const polys = feats3857.map((f) => {
        const polyFeat = circleToPolygonFeature(f)
        polyFeat.getGeometry()?.transform('EPSG:3857', 'EPSG:4326')
        return polyFeat
      })
      return kmlFormat.writeFeatures(polys, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:4326',
      })
    }
    if (looksLikeCircleOrDisc(data)) {
      // featureFromCircleJson → EPSG:3857 ; pour KML démo on réécrit en 4326 via polygone
      const feature3857 = featureFromCircleJson(data, 'EPSG:3857')
      const polyFeat = circleToPolygonFeature(feature3857)
      const geom = polyFeat.getGeometry()
      geom?.transform('EPSG:3857', 'EPSG:4326')
      return kmlFormat.writeFeatures([polyFeat], {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:4326',
      })
    }
    const features =
      data?.type === 'FeatureCollection' || data?.type === 'Feature'
        ? geoJsonFormat.readFeatures(data)
        : geoJsonFormat.readFeatures({
            type: 'Feature',
            geometry: data,
            properties: {},
          })
    return kmlFormat.writeFeatures(features, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:4326',
    })
  } catch {
    return ''
  }
}

function sectionSlug(section: DemoSection): string {
  return section.slug ?? String(section.type)
}

function fieldKey(type: GeometryTypeOption, format: FormatKey): string {
  return `${type}:${format}`
}

const fieldEls = new Map<string, HTMLTextAreaElement>()
const handles: MountGeometryEditorHandle[] = []
const pairSyncCleanups: Array<() => void> = []
let settingsDemoField: HTMLTextAreaElement | null = null
let settingsDemoHandle: MountGeometryEditorHandle | null = null

function setFieldRef(type: GeometryTypeOption, format: FormatKey, el: unknown): void {
  const key = fieldKey(type, format)
  if (el instanceof HTMLTextAreaElement) {
    fieldEls.set(key, el)
  } else {
    fieldEls.delete(key)
  }
}

function setSettingsDemoRef(el: unknown): void {
  settingsDemoField = el instanceof HTMLTextAreaElement ? el : null
}

const FIELD_MAX_HEIGHT_PX = 280

/** Aligne les textareas GeoJSON / KML d’une ligne sur la plus haute (plafonnée). */
function syncPairFieldHeights(type: GeometryTypeOption): void {
  const geo = fieldEls.get(fieldKey(type, 'geojson'))
  const kml = fieldEls.get(fieldKey(type, 'kml'))
  if (!geo || !kml) return
  geo.style.height = 'auto'
  kml.style.height = 'auto'
  const h = Math.min(Math.max(geo.scrollHeight, kml.scrollHeight), FIELD_MAX_HEIGHT_PX)
  geo.style.height = `${h}px`
  kml.style.height = `${h}px`
}

function syncAllPairHeights(): void {
  for (const section of sections) {
    syncPairFieldHeights(section.type)
  }
}

onMounted(() => {
  for (const section of sections) {
    for (const { key: format } of formats) {
      const el = fieldEls.get(fieldKey(section.type, format))
      if (!el) continue
      el.value =
        format === 'geojson' ? section.sampleGeoJson : geoJsonSampleToKml(section.sampleGeoJson)
      handles.push(
        mountGeometryEditor(el, {
          geometryType: section.type,
          outputFormat: format,
          height: section.type === 'Geometry' || String(section.type).includes(',') ? 480 : 280,
          hide: false,
          editable: true,
          ...(section.type === 'Geometry' || String(section.type).includes(',')
            ? { toolsToggle: 'top-left' as const }
            : {}),
        }),
      )
      const onInput = () => syncPairFieldHeights(section.type)
      el.addEventListener('input', onInput)
      pairSyncCleanups.push(() => el.removeEventListener('input', onInput))
    }
  }

  // Après peinture (contenu + cartes injectées) pour un alignement propre au chargement
  requestAnimationFrame(() => {
    syncAllPairHeights()
    requestAnimationFrame(syncAllPairHeights)
  })

  if (settingsDemoField) {
    settingsDemoField.value = JSON.stringify(
      {
        type: 'Polygon',
        coordinates: [
          [
            [2.25, 48.82],
            [2.42, 48.82],
            [2.42, 48.9],
            [2.25, 48.9],
            [2.25, 48.82],
          ],
        ],
      },
      null,
      2,
    )
    settingsDemoHandle = mountGeometryEditor(settingsDemoField, {
      geometryType: 'Geometry',
      height: 400,
      hide: false,
      editable: true,
      showSettings: true,
      showAttributions: true,
      showZoom: true,
    })
  }
})

onUnmounted(() => {
  for (const cleanup of pairSyncCleanups) cleanup()
  pairSyncCleanups.length = 0
  for (const h of handles) h.destroy()
  handles.length = 0
  settingsDemoHandle?.destroy()
  settingsDemoHandle = null
})
</script>

<template>
  <div class="ec-demo-geometry fr-container fr-py-3w">
    <h1 class="fr-h3">Éditeur de géométries</h1>
    <p class="fr-text--sm">
      Outil standalone <code>entree-carto-geometry-editor</code> : mini-carte liée à un champ HTML
      (GeoJSON / KML / bbox). Barre d’outils à gauche dans la carte (style cartes.gouv / geopf
      Drawing). Remplace <code>ol-geometry-editor</code>. Chaque type est illustré en
      <strong>GeoJSON</strong> et en <strong>KML</strong>.
    </p>

    <DsfrAccordionsGroup v-model="docsAccordionOpen" class="fr-mb-5w">
      <DsfrAccordion id="ec-geom-docs" title="Utilisation et options" title-tag="h2">
        <h3 class="fr-h6">Utilisation</h3>
        <p class="fr-text--sm">
          Associer une mini-carte à un champ HTML via
          <code>mountGeometryEditor(élément, options)</code>
          ou <code>new GeometryEditor(…)</code>. API globale :
          <code>window.EntreeCartoGeometryEditor</code>. Bundle :
          <code>dist/entree-carto-geometry-editor[.min].js</code>
          + CSS associé.
        </p>
        <pre class="ec-demo-geometry__code fr-mb-3w"><code>{{ usageSnippet }}</code></pre>

        <h3 class="fr-h6">Mise à jour à chaud</h3>
        <p class="fr-text--sm fr-mb-3w">
          Après montage : <code>editor.setOptions(patch)</code> ou
          <code>handle.setOptions(patch)</code> pour changer le comportement sans recréer la carte
          (<code>blockView</code>, <code>showZoom</code>, <code>editable</code>,
          <code>customStyle</code>, <code>geometryType</code>, fonds, taille, vue, formats, etc.).
        </p>

        <h3 class="fr-h6">Barre d’outils</h3>
        <ul class="fr-text--sm fr-mb-3w">
          <li>
            Overlay vertical <strong>à gauche dans la carte</strong>
            (boutons 48×48 type cartes.gouv / geopf Drawing).
          </li>
          <li>
            <strong>Dessin</strong> : activer l’outil géométrie (point / ligne / polygone /
            rectangle). Sur les types simples, un nouveau croquis remplace le précédent.
          </li>
          <li>
            <strong>Modifier</strong> (crayon) : déplacer les sommets / la géométrie (inactif tant
            que l’outil n’est pas sélectionné).
          </li>
          <li>
            <strong>Supprimer</strong> (poubelle) : cliquer une feature (<code
              >cursor: pointer</code
            >
            au survol).
          </li>
          <li>Sans outil actif : navigation seule (sauf si <code>blockView: true</code>).</li>
        </ul>

        <h3 class="fr-h6">Données</h3>
        <ul class="fr-text--sm fr-mb-3w">
          <li>
            Lecture : GeoJSON (geometry / Feature / FeatureCollection), KML, ou bbox
            <code>[minX, minY, maxX, maxY]</code>.
          </li>
          <li>
            Écriture selon <code>outputFormat</code> ; Rectangle → bbox JSON ; Circle / Disc →
            <code>{ type, center, radius }</code>
            (dessin : outil Disc uniquement ; Circle encore lu en compat).
          </li>
          <li>
            Sync bidirectionnelle via <code>input</code> / <code>change</code> ; événement carte
            <code>change:geometry</code>.
          </li>
          <li>Les <code>Multi*</code> sont éclatés à l’édition et recombinés à l’écriture.</li>
        </ul>

        <h3 class="fr-h6">Options</h3>
        <div class="fr-table fr-table--no-caption fr-mb-0">
          <table>
            <caption class="fr-sr-only">
              Options de mountGeometryEditor / GeometryEditor
            </caption>
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
      </DsfrAccordion>
    </DsfrAccordionsGroup>

    <section v-for="section in sections" :key="sectionSlug(section)" class="fr-mb-5w">
      <h2 class="fr-h5">
        {{ section.title }}
      </h2>
      <p class="fr-text--sm fr-mb-2w">
        {{ section.hint }}
      </p>

      <div class="ec-demo-geometry__pair">
        <div v-for="fmt in formats" :key="fmt.key" class="ec-demo-geometry__col">
          <h3 class="fr-h6">
            {{ fmt.label }}
          </h3>
          <label class="fr-label" :for="`ec-geom-${sectionSlug(section)}-${fmt.key}`"
            >Données {{ fmt.label }}</label
          >
          <textarea
            :id="`ec-geom-${sectionSlug(section)}-${fmt.key}`"
            :ref="(el) => setFieldRef(section.type, fmt.key, el)"
            class="fr-input ec-demo-geometry__field"
            :rows="Math.max(section.rows, 6)"
          />
        </div>
      </div>
    </section>

    <section class="fr-mb-5w">
      <h2 class="fr-h5">Réglages à la volée (<code>showSettings</code>)</h2>
      <p class="fr-text--sm fr-mb-2w">
        Une seule carte avec le bouton roue crantée (haut droite) pour ajuster les options.
        Attributions activées (<code>showAttributions: true</code>). Le zoom est décalé sous le
        bouton réglages.
      </p>
      <label class="fr-label" for="ec-geom-settings-demo">GeoJSON</label>
      <textarea
        id="ec-geom-settings-demo"
        :ref="setSettingsDemoRef"
        class="fr-input ec-demo-geometry__field"
        rows="8"
      />
    </section>
  </div>
</template>

<style scoped>
.ec-demo-geometry {
  max-width: 72rem;
}

.ec-demo-geometry code {
  font-size: 0.875em;
}

.ec-demo-geometry__pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

.ec-demo-geometry__col {
  min-width: 0;
}

.ec-demo-geometry__field {
  box-sizing: border-box;
  width: 100%;
  max-height: 280px;
  resize: vertical;
  overflow: auto;
}

.ec-demo-geometry__code {
  margin: 0;
  padding: 1rem;
  overflow: auto;
  font-size: 0.8125rem;
  line-height: 1.45;
  background: var(--background-alt-grey, #f6f6f6);
  border: 1px solid var(--border-default-grey, #ddd);
  border-radius: 0.25rem;
}

.ec-demo-geometry__code code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  white-space: pre;
}

.ec-demo-geometry :deep(.fr-table) {
  margin-bottom: 0;
}

.ec-demo-geometry :deep(.fr-table td),
.ec-demo-geometry :deep(.fr-table th) {
  font-size: 0.875rem;
  vertical-align: top;
}

@media (max-width: 48rem) {
  .ec-demo-geometry__pair {
    grid-template-columns: 1fr;
  }
}
</style>
