/**
 * Source WMTS Géoplateforme — alignée sur gpu-client `helper/createWMTSSource.js`
 * (tuiles 512 px, matrices PM 5–19, pas un pseudo-XYZ 256 px).
 */
import { getTopLeft, getWidth } from 'ol/extent'
import { get as getProjection } from 'ol/proj'
import WMTS from 'ol/source/WMTS'
import WMTSTileGrid from 'ol/tilegrid/WMTS'
import { ignGeoportalAttributions } from '@/ol/ignGeoportalAttributions'

const GEOPF_WMTS_URL = 'https://data.geopf.fr/wmts'

const TILE_SIZE_PX = 512
const MATRIX_MIN = 5
const MATRIX_MAX = 19

function createGeopfWmtsTileGrid(): WMTSTileGrid {
  const projection = getProjection('EPSG:3857')
  if (!projection) {
    throw new Error('EPSG:3857 required for Géoplateforme WMTS')
  }
  const extent = projection.getExtent()
  const tileSizeMeters = getWidth(extent) / TILE_SIZE_PX
  const resolutions: number[] = []
  const matrixIds: string[] = []
  for (let i = MATRIX_MIN; i <= MATRIX_MAX; i++) {
    matrixIds[i] = String(i)
    resolutions[i] = tileSizeMeters / 2 ** i
  }
  return new WMTSTileGrid({
    origin: getTopLeft(extent),
    resolutions,
    matrixIds,
    tileSize: [TILE_SIZE_PX, TILE_SIZE_PX],
  })
}

let sharedTileGrid: WMTSTileGrid | null = null

function geopfWmtsTileGrid(): WMTSTileGrid {
  if (!sharedTileGrid) {
    sharedTileGrid = createGeopfWmtsTileGrid()
  }
  return sharedTileGrid
}

export function createGeopfWmtsSource(options: {
  layer: string
  style?: string
  format?: 'png' | 'jpeg'
  attributions?: string | string[] | (() => string)
}): WMTS {
  const format = options.format ?? 'png'
  return new WMTS({
    url: GEOPF_WMTS_URL,
    layer: options.layer,
    style: options.style ?? 'normal',
    format: `image/${format}`,
    matrixSet: 'PM',
    version: '1.0.0',
    crossOrigin: 'anonymous',
    attributions: options.attributions ?? (() => ignGeoportalAttributions()),
    attributionsCollapsible: false,
    tileGrid: geopfWmtsTileGrid(),
    cacheSize: 256,
  })
}
