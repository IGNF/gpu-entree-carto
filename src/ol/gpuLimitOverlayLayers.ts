import VectorImageLayer from 'ol/layer/VectorImage'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import Style from 'ol/style/Style'
import Stroke from 'ol/style/Stroke'
import type Feature from 'ol/Feature'
import type { Geometry } from 'ol/geom'
import { limitGeoJsonAssetUrl } from '@/ol/limitGeoJsonDataRoot'

/** Seuils gpu-client `Region` / `Department`. */
const RES_REGION_MIN = 1222.99245256282
const RES_REGION_MAX = 2445.98490512564
const RES_DEPT_MAX = 1222.99245256282

const MAP_PROJECTION = 'EPSG:3857'
const DATA_PROJECTION = 'EPSG:4326'

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
  })
}

async function loadRegions(): Promise<Feature<Geometry>[]> {
  if (regionsFeatures) return regionsFeatures
  if (!regionsLoad) {
    regionsLoad = fetch(limitGeoJsonAssetUrl('region-fr-geojson.json'))
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
    departmentsLoad = fetch(limitGeoJsonAssetUrl('department-fr-geojson.json'))
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

/** Propriété des couches limites : données statiques, source partagée avec l’impression. */
export const GPU_LIMIT_OVERLAY_PROP = 'ecGpuLimitOverlay'

/**
 * Source chargée à la demande : OpenLayers n’appelle le loader qu’au premier rendu de la couche
 * (visible et dans sa plage de zoom), pas au démarrage de la carte.
 */
function createLimitVectorSource(load: () => Promise<Feature<Geometry>[]>): VectorSource {
  const source: VectorSource = new VectorSource({
    loader: (_extent, _resolution, _projection, success) => {
      load()
        .then((features) => {
          source.addFeatures(features)
          success?.(features)
        })
        .catch((err) => {
          console.warn('[entree-carto] limites administratives GeoJSON', err)
          // marqué chargé quand même : pas de nouvelle requête à chaque rendu
          success?.([])
        })
    },
  })
  return source
}

function createLimitVectorLayer(
  load: () => Promise<Feature<Geometry>[]>,
  minResolution: number | undefined,
  maxResolution: number | undefined,
): VectorImageLayer {
  // Rendu en image : déplacement et zoom fluides malgré les ~180 000 sommets des départements
  return new VectorImageLayer({
    visible: false,
    minResolution,
    maxResolution,
    zIndex: 20,
    style: limitStyle,
    source: createLimitVectorSource(load),
    properties: { [GPU_LIMIT_OVERLAY_PROP]: true },
  })
}

/** Limites régions (gpu-client `layer.Region`) — instance unique partagée. */
export function createLimitRegionalLayer(): VectorImageLayer {
  return createLimitVectorLayer(loadRegions, RES_REGION_MIN, RES_REGION_MAX)
}

/** Limites départements (gpu-client `layer.Department`) — instance unique partagée. */
export function createLimitDepartmentalLayer(): VectorImageLayer {
  return createLimitVectorLayer(loadDepartments, undefined, RES_DEPT_MAX)
}
