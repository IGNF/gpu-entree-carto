/**
 * Source WMTS Géoplateforme : tuiles 256 px affichées à leur taille nominale (même niveau de
 * tuiles que cartes.gouv.fr à zoom égal), TileMatrixSet déclaré par chaque couche dans les
 * GetCapabilities.
 *
 * L’impression utilise une variante en grille 512 px (`geopfWmtsPrintSource`) : tuiles du niveau
 * inférieur agrandies 2×, libellés assez gros pour rester lisibles à 300 DPI.
 */
import { getTopLeft, getWidth } from 'ol/extent'
import { get as getProjection } from 'ol/proj'
import WMTS from 'ol/source/WMTS'
import WMTSTileGrid from 'ol/tilegrid/WMTS'
import { ignGeoportalAttributions } from '@/ol/ignGeoportalAttributions'

const GEOPF_WMTS_URL = 'https://data.geopf.fr/wmts'

/** Taille des tuiles servies par la Géoplateforme (TileWidth des TileMatrixSet PM*). */
const SERVER_TILE_SIZE_PX = 256
/** Grille d’impression : tuiles serveur agrandies 2× (rendu historique gpu-client). */
const PRINT_TILE_SIZE_PX = 512

export interface GeopfWmtsMatrixSet {
  /** Identifiant TILEMATRIXSET déclaré pour la couche. */
  id: string
  minZoom: number
  maxZoom: number
}

/** TileMatrixSet générique (accepté pour toutes les couches, non déclaré dans les capabilities). */
const DEFAULT_MATRIX_SET: GeopfWmtsMatrixSet = { id: 'PM', minZoom: 0, maxZoom: 19 }

/** TileMatrixSet déclarés par les GetCapabilities (data.geopf.fr/wmts) pour les couches utilisées. */
const MATRIX_SET_BY_LAYER: Record<string, GeopfWmtsMatrixSet> = {
  'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2': { id: 'PM_0_19', minZoom: 0, maxZoom: 19 },
  'ORTHOIMAGERY.ORTHOPHOTOS': { id: 'PM_0_19', minZoom: 0, maxZoom: 19 },
  'CADASTRALPARCELS.PARCELLAIRE_EXPRESS': { id: 'PM_0_19', minZoom: 0, maxZoom: 19 },
  'CADASTRALPARCELS.PARCELS': { id: 'PM_0_20', minZoom: 0, maxZoom: 20 },
  'GEOGRAPHICALNAMES.NAMES': { id: 'PM_6_18', minZoom: 6, maxZoom: 18 },
  'TRANSPORTNETWORKS.ROADS': { id: 'PM_6_18', minZoom: 6, maxZoom: 18 },
  'LIMITES_ADMINISTRATIVES_EXPRESS.LATEST': { id: 'PM_6_16', minZoom: 6, maxZoom: 16 },
}

export function geopfWmtsMatrixSet(layer: string): GeopfWmtsMatrixSet {
  return MATRIX_SET_BY_LAYER[layer] ?? DEFAULT_MATRIX_SET
}

/**
 * Grille WMTS : la matrice `z` (tuiles serveur de 256 px) est dessinée sur `tileSizePx` px.
 * Hors de `minZoom`–`maxZoom`, OpenLayers réutilise le niveau le plus proche (pas de requête 404).
 */
function createGeopfWmtsTileGrid(matrixSet: GeopfWmtsMatrixSet, tileSizePx: number): WMTSTileGrid {
  const projection = getProjection('EPSG:3857')
  if (!projection) {
    throw new Error('EPSG:3857 required for Géoplateforme WMTS')
  }
  const extent = projection.getExtent()
  const tileSizeMeters = getWidth(extent) / tileSizePx
  const resolutions: number[] = []
  const matrixIds: string[] = []
  for (let i = matrixSet.minZoom; i <= matrixSet.maxZoom; i++) {
    matrixIds.push(String(i))
    resolutions.push(tileSizeMeters / 2 ** i)
  }
  return new WMTSTileGrid({
    origin: getTopLeft(extent),
    resolutions,
    matrixIds,
    tileSize: [tileSizePx, tileSizePx],
  })
}

const tileGridCache = new Map<string, WMTSTileGrid>()

function geopfWmtsTileGrid(matrixSet: GeopfWmtsMatrixSet, tileSizePx: number): WMTSTileGrid {
  const key = `${matrixSet.id}:${tileSizePx}`
  let grid = tileGridCache.get(key)
  if (!grid) {
    grid = createGeopfWmtsTileGrid(matrixSet, tileSizePx)
    tileGridCache.set(key, grid)
  }
  return grid
}

export interface GeopfWmtsSourceOptions {
  layer: string
  style?: string
  format?: 'png' | 'jpeg'
  attributions?: string | string[] | (() => string)
}

/** Options de création, pour recréer la variante d’impression. */
const sourceOptions = new WeakMap<WMTS, GeopfWmtsSourceOptions>()
/** Variante d’impression mise en cache (tuiles conservées d’un aperçu à l’autre). */
const printSources = new WeakMap<WMTS, WMTS>()

function buildSource(options: GeopfWmtsSourceOptions, tileSizePx: number): WMTS {
  const format = options.format ?? 'png'
  const matrixSet = geopfWmtsMatrixSet(options.layer)
  return new WMTS({
    url: GEOPF_WMTS_URL,
    layer: options.layer,
    style: options.style ?? 'normal',
    format: `image/${format}`,
    matrixSet: matrixSet.id,
    version: '1.0.0',
    crossOrigin: 'anonymous',
    attributions: options.attributions ?? (() => ignGeoportalAttributions()),
    attributionsCollapsible: false,
    tileGrid: geopfWmtsTileGrid(matrixSet, tileSizePx),
    // tuiles 256 px : environ 4 fois plus de tuiles par écran qu’en grille 512
    cacheSize: 512,
  })
}

export function createGeopfWmtsSource(options: GeopfWmtsSourceOptions): WMTS {
  const source = buildSource(options, SERVER_TILE_SIZE_PX)
  sourceOptions.set(source, options)
  return source
}

/**
 * Variante d’impression d’une source créée par `createGeopfWmtsSource` (grille 512 px),
 * `null` pour toute autre source.
 */
export function geopfWmtsPrintSource(source: unknown): WMTS | null {
  if (!(source instanceof WMTS)) return null
  const options = sourceOptions.get(source)
  if (!options) return null
  let printSource = printSources.get(source)
  if (!printSource) {
    printSource = buildSource(options, PRINT_TILE_SIZE_PX)
    printSources.set(source, printSource)
  }
  return printSource
}
