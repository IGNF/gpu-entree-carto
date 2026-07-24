<script setup lang="ts">
/**
 * Démo standalone — entree-carto-geometry-editor
 * Un exemple par type : GeoJSON et KML côte à côte.
 */
import { onMounted, onUnmounted } from 'vue'
import Feature from 'ol/Feature'
import GeoJSON from 'ol/format/GeoJSON'
import KML from 'ol/format/KML'
import { Polygon } from 'ol/geom'
import {
  mountGeometryEditor,
  type MountGeometryEditorHandle,
} from '@/geometry-editor'
import type {
  GeometryOutputFormat,
  GeometryTypeOption,
} from '@/geometry-editor/types'
import { looksLikeBbox } from '@/geometry-editor/parseGeometry'
import 'ol/ol.css'
import '@/geometry-editor/styles/geometry-editor.css'

interface DemoSection {
  type: GeometryTypeOption
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
    sampleGeoJson: JSON.stringify(
      { type: 'Point', coordinates: [2.35, 48.85] },
      null,
      2,
    ),
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
    type: 'Geometry',
    title: 'Geometry (libre)',
    hint: 'Point, ligne ou polygone ; plusieurs géométries possibles.',
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

function fieldKey(type: GeometryTypeOption, format: FormatKey): string {
  return `${type}:${format}`
}

const fieldEls = new Map<string, HTMLTextAreaElement>()
const handles: MountGeometryEditorHandle[] = []
const pairSyncCleanups: Array<() => void> = []

function setFieldRef(
  type: GeometryTypeOption,
  format: FormatKey,
  el: unknown,
): void {
  const key = fieldKey(type, format)
  if (el instanceof HTMLTextAreaElement) {
    fieldEls.set(key, el)
  } else {
    fieldEls.delete(key)
  }
}

/** Aligne les textareas GeoJSON / KML d’une ligne sur la plus haute. */
function syncPairFieldHeights(type: GeometryTypeOption): void {
  const geo = fieldEls.get(fieldKey(type, 'geojson'))
  const kml = fieldEls.get(fieldKey(type, 'kml'))
  if (!geo || !kml) return
  geo.style.height = 'auto'
  kml.style.height = 'auto'
  const h = Math.max(geo.scrollHeight, kml.scrollHeight)
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
        format === 'geojson'
          ? section.sampleGeoJson
          : geoJsonSampleToKml(section.sampleGeoJson)
      handles.push(
        mountGeometryEditor(el, {
          geometryType: section.type,
          outputFormat: format,
          height: 280,
          hide: false,
          editable: true,
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
})

onUnmounted(() => {
  for (const cleanup of pairSyncCleanups) cleanup()
  pairSyncCleanups.length = 0
  for (const h of handles) h.destroy()
  handles.length = 0
})
</script>

<template>
  <div class="ec-demo-geometry fr-container fr-py-3w">
    <h1 class="fr-h3">
      Éditeur de géométries
    </h1>
    <p class="fr-text--sm">
      Outil standalone <code>entree-carto-geometry-editor</code> : mini-carte liée à un
      champ HTML (GeoJSON / KML / bbox). Barre d’outils à gauche dans la carte
      (style cartes.gouv / geopf Drawing). Remplace <code>ol-geometry-editor</code>.
      Chaque type est illustré en <strong>GeoJSON</strong> et en <strong>KML</strong>.
    </p>

    <section
      v-for="section in sections"
      :key="section.type"
      class="fr-mb-5w"
    >
      <h2 class="fr-h5">
        {{ section.title }}
      </h2>
      <p class="fr-text--sm fr-mb-2w">
        {{ section.hint }}
      </p>

      <div class="ec-demo-geometry__pair">
        <div
          v-for="fmt in formats"
          :key="fmt.key"
          class="ec-demo-geometry__col"
        >
          <h3 class="fr-h6">
            {{ fmt.label }}
          </h3>
          <label
            class="fr-label"
            :for="`ec-geom-${section.type}-${fmt.key}`"
          >Données {{ fmt.label }}</label>
          <textarea
            :id="`ec-geom-${section.type}-${fmt.key}`"
            :ref="(el) => setFieldRef(section.type, fmt.key, el)"
            class="fr-input ec-demo-geometry__field"
            :rows="Math.max(section.rows, 6)"
          />
        </div>
      </div>
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
  resize: vertical;
  overflow: auto;
}

@media (max-width: 48rem) {
  .ec-demo-geometry__pair {
    grid-template-columns: 1fr;
  }
}
</style>
