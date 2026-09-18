import TileLayer from 'ol/layer/Tile'
import TileWMS from 'ol/source/TileWMS'
import { createXYZ } from 'ol/tilegrid.js'
import type OlMap from 'ol/Map'
import config from '@/lib/config'
import type { StandardViewerDocument } from '@/lib/types'
import {
  layerConfigToCatalogEntries,
  type GpuLayerCatalogEntry,
  type GpuLayerConfig,
} from '@/lib/layerConfig/gpuLayerConfig'

function wmsUrl(): string {
  const url = config.wmsExterneUrl
  return typeof url === 'string' && url.length ? url : 'https://data.geopf.fr/wms-v/ows'
}

/** Filtre CQL comme gpu-client `CreateTreeLayerSwitcherItems#createCqlFilterFromGpuLayer`. */
function buildCqlFilter(layer: GpuLayerConfig, document: StandardViewerDocument | null): string {
  const parts: string[] = []
  const configuredName = layer.name ?? ''
  if (
    document?.status === 'document.preview' &&
    document.name &&
    !configuredName.endsWith('municipality')
  ) {
    parts.push(`(partition like '${document.name}')`)
  }
  if (layer.filterAttribute && layer.filterValue?.length) {
    parts.push(`${layer.filterAttribute} IN ('${layer.filterValue.join("','")}')`)
  } else if (layer.filterAttribute && layer.filterValueLike) {
    parts.push(`${layer.filterAttribute} LIKE '${layer.filterValueLike}'`)
  }
  return parts.join(' AND ')
}

function zoomToResolution(zoom: number): number {
  return 156543.03392804097 / Math.pow(2, zoom)
}

function createWmsTileLayer(
  entry: GpuLayerCatalogEntry,
  document: StandardViewerDocument | null,
): TileLayer | null {
  const layer = entry.config
  if (layer.virtual || !layer.name) return null

  let layerName = layer.name
  let url = wmsUrl()

  if (document?.status === 'document.preview' && !layerName.endsWith('municipality')) {
    const validation = config.wmsValidationUrl
    if (typeof validation === 'string' && validation.length) {
      url = validation
    }
    layerName = layerName
      .split(',')
      .map((n) => `${n}_previsu`)
      .join(',')
  }

  const cql = buildCqlFilter(layer, document)
  const params: Record<string, string | boolean> = {
    LAYERS: layerName,
    TRANSPARENT: true,
    VERSION: '1.1.1',
    FORMAT: 'image/png',
    TILED: true,
  }
  if (cql) {
    params.cql_filter = layerName.split(',').map(() => cql).join(';')
  }

  const minZoom = layer.minZoomLevel ?? 0
  const maxZoom = layer.maxZoomLevel ?? 22

  return new TileLayer({
    source: new TileWMS({
      url,
      params,
      crossOrigin: 'anonymous',
      serverType: 'geoserver',
      tileGrid: createXYZ({ tileSize: 512 }),
    }),
    visible: false,
    opacity: layer.forceOpacity
      ? 1
      : typeof layer.opacity === 'number'
        ? layer.opacity
        : 0.7,
    minResolution: zoomToResolution(maxZoom + 0.5),
    maxResolution: zoomToResolution(Math.max(0, minZoom - 0.5)),
    zIndex: layer.zIndex ? Number(layer.zIndex) : undefined,
    properties: {
      ecGpuCatalogId: entry.id,
      ecGpuLayerName: layerName,
    },
  })
}

const WMS_LAYER_GRAYSCALE_CLASS = 'ec-gpu-layer-grayscale'

function applyWmsLayerGrayscale(layer: TileLayer, grayscale: boolean): void {
  const internal = layer as unknown as { className_: string }
  internal.className_ = grayscale ? `ol-layer ${WMS_LAYER_GRAYSCALE_CLASS}` : 'ol-layer'
  layer.set('grayscale', grayscale)
  layer.changed()
}

export class GpuWmsLayerRegistry {
  private readonly entries = new Map<string, GpuLayerCatalogEntry>()
  private readonly olLayers = new Map<string, TileLayer>()
  private readonly grayscaleById = new Map<string, boolean>()
  private map: OlMap | null = null
  private document: StandardViewerDocument | null = null

  loadFromLayerConfig(layers: GpuLayerConfig[], document: StandardViewerDocument | null): void {
    this.document = document
    for (const layer of this.olLayers.values()) {
      this.map?.removeLayer(layer)
    }
    this.entries.clear()
    this.olLayers.clear()
    this.grayscaleById.clear()

    for (const entry of layerConfigToCatalogEntries(layers)) {
      this.entries.set(entry.id, entry)
    }
  }

  attachMap(map: OlMap): void {
    this.map = map
    for (const layer of this.olLayers.values()) {
      if (!map.getLayers().getArray().includes(layer)) {
        map.addLayer(layer)
      }
    }
  }

  detachMap(): void {
    if (!this.map) return
    for (const layer of this.olLayers.values()) {
      this.map.removeLayer(layer)
    }
    this.map = null
  }

  private ensureLayer(catalogId: string): TileLayer | undefined {
    const layer = this.olLayers.get(catalogId)
    if (layer) return layer

    const entry = this.entries.get(catalogId)
    if (!entry) return undefined

    const created = createWmsTileLayer(entry, this.document)
    if (!created) return undefined

    this.olLayers.set(catalogId, created)
    applyWmsLayerGrayscale(created, this.grayscaleById.get(catalogId) === true)
    if (this.map && !this.map.getLayers().getArray().includes(created)) {
      this.map.addLayer(created)
    }
    return created
  }

  setVisible(catalogId: string, visible: boolean): void {
    if (visible) {
      const layer = this.ensureLayer(catalogId)
      if (layer) layer.setVisible(true)
      return
    }
    const layer = this.olLayers.get(catalogId)
    if (layer) layer.setVisible(false)
  }

  setOpacity(catalogId: string, opacityPercent: number): void {
    const layer = this.olLayers.get(catalogId)
    if (layer) layer.setOpacity(Math.min(100, Math.max(0, opacityPercent)) / 100)
  }

  setGrayscale(catalogId: string, grayscale: boolean): void {
    this.grayscaleById.set(catalogId, grayscale)
    const layer = this.olLayers.get(catalogId)
    if (layer) applyWmsLayerGrayscale(layer, grayscale)
  }

  hasWmsLayer(catalogId: string): boolean {
    return this.entries.has(catalogId)
  }

  /**
   * Empile les couches WMS selon l’ordre utilisateur (bas → haut).
   * Les entrées `forceOpacity` restent au sommet même si absentes de la liste.
   * z-index de base 200 + index ; ré-ajout OL du bas vers le haut.
   */
  applyStackOrder(catalogIdsBottomToTop: string[]): void {
    const normal: string[] = []
    const forceInList: string[] = []
    for (const id of catalogIdsBottomToTop) {
      if (this.entries.get(id)?.config.forceOpacity) forceInList.push(id)
      else normal.push(id)
    }

    const forcePinned: string[] = [...forceInList]
    for (const [id, entry] of this.entries) {
      if (!entry.config.forceOpacity) continue
      const layer = this.olLayers.get(id)
      if (!layer?.getVisible()) continue
      if (!forcePinned.includes(id)) forcePinned.push(id)
    }

    const ordered = [...normal, ...forcePinned]
    const baseZ = 200
    ordered.forEach((id, index) => {
      const layer = this.olLayers.get(id)
      if (layer) layer.setZIndex(baseZ + index)
    })
    if (!this.map) return
    for (const id of ordered) {
      const layer = this.olLayers.get(id)
      if (!layer) continue
      this.map.removeLayer(layer)
      this.map.addLayer(layer)
    }
  }
}

export const gpuWmsLayerRegistry = new GpuWmsLayerRegistry()
