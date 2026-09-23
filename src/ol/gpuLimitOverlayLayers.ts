import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import Style from 'ol/style/Style'
import Stroke from 'ol/style/Stroke'
import type Feature from 'ol/Feature'
import type { Geometry } from 'ol/geom'

/** Seuils gpu-client `Region` / `Department`. */
const RES_REGION_MIN = 1222.99245256282
const RES_REGION_MAX = 2445.98490512564
const RES_DEPT_MAX = 1222.99245256282

const MAP_PROJECTION = 'EPSG:3857'
const DATA_PROJECTION = 'EPSG:4326'

/** `BASE_URL` : `./` (build local) ou `/nom-du-repo/` (GitHub Pages). */
function limitGeoJsonUrl(fileName: string): string {
  return `${import.meta.env.BASE_URL}json-data/${fileName}`
}

const limitStyle = new Style({
  stroke: new Stroke({ width: 2, color: '#000000' }),
})

const geoJson = new GeoJSON()

let regionsFeatures: Feature<Geometry>[] | null = null
let departmentsFeatures: Feature<Geometry>[] | null = null
let regionsLoad: Promise<Feature<Geometry>[]> | null = null
let departmentsLoad: Promise<Feature<Geometry>[]> | null = null

function readGeoJsonFeatures(data: object): Feature<Geometry>[] {
  return geoJson.readFeatures(data, {
    dataProjection: DATA_PROJECTION,
    featureProjection: MAP_PROJECTION,
  }) as Feature<Geometry>[]
}

async function loadRegions(): Promise<Feature<Geometry>[]> {
  if (regionsFeatures) return regionsFeatures
  if (!regionsLoad) {
    regionsLoad = fetch(limitGeoJsonUrl('region-fr-geojson.json'))
      .then(async (res) => {
        if (!res.ok) throw new Error(`Limites régions : ${res.status} ${res.statusText}`)
        regionsFeatures = readGeoJsonFeatures(await res.json())
        return regionsFeatures
      })
      .catch((err) => {
        regionsLoad = null
        throw err
      })
  }
  return regionsLoad
}

async function loadDepartments(): Promise<Feature<Geometry>[]> {
  if (departmentsFeatures) return departmentsFeatures
  if (!departmentsLoad) {
    departmentsLoad = fetch(limitGeoJsonUrl('department-fr-geojson.json'))
      .then(async (res) => {
        if (!res.ok) throw new Error(`Limites départements : ${res.status} ${res.statusText}`)
        departmentsFeatures = readGeoJsonFeatures(await res.json())
        return departmentsFeatures
      })
      .catch((err) => {
        departmentsLoad = null
        throw err
      })
  }
  return departmentsLoad
}

/** Précharge les GeoJSON limites (appel optionnel au démarrage carte). */
export function preloadLimitGeoJson(): void {
  void loadRegions().catch((err) => {
    console.warn('[entree-carto] limites régions', err)
  })
  void loadDepartments().catch((err) => {
    console.warn('[entree-carto] limites départements', err)
  })
}

function createLimitVectorLayer(
  load: () => Promise<Feature<Geometry>[]>,
  minResolution: number | undefined,
  maxResolution: number | undefined,
): VectorLayer {
  const source = new VectorSource()
  void load()
    .then((features) => {
      source.addFeatures(features)
      source.changed()
    })
    .catch((err) => {
      console.warn('[entree-carto] limites administratives GeoJSON', err)
    })

  return new VectorLayer({
    visible: false,
    minResolution,
    maxResolution,
    zIndex: 20,
    style: limitStyle,
    source,
    properties: { ecGpuLimitOverlay: true },
  })
}

/** Limites régions (gpu-client `layer.Region`) — instance unique partagée. */
export function createLimitRegionalLayer(): VectorLayer {
  return createLimitVectorLayer(loadRegions, RES_REGION_MIN, RES_REGION_MAX)
}

/** Limites départements (gpu-client `layer.Department`) — instance unique partagée. */
export function createLimitDepartmentalLayer(): VectorLayer {
  return createLimitVectorLayer(loadDepartments, undefined, RES_DEPT_MAX)
}
