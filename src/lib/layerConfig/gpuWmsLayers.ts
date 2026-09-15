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

function buildCqlFilter(layer: GpuLayerConfig, document: StandardViewerDocument | null): string {
  const parts: string[] = []
  if (document?.status === 'document.preview' && document.name && !layer.name?.endsWith('municipality')) {
    parts.push(`(partition like '${document.name}')`)
  }
  if (layer.filterAttribute && layer.filterValue?.length) {
    const values = layer.filterValue.map((v) => `'${v}'`).join(',')
    parts.push(`${layer.filterAttribute} IN (${values})`)
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
    params.CQL_FILTER = layerName.split(',').map(() => cql).join(';')
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
    opacity: typeof layer.opacity === 'number' ? layer.opacity : 0.7,
    minResolution: zoomToResolution(maxZoom + 0.5),
    maxResolution: zoomToResolution(Math.max(0, minZoom - 0.5)),
    zIndex: layer.zIndex ? Number(layer.zIndex) : undefined,
    properties: {
      ecGpuCatalogId: entry.id,
      ecGpuLayerName: layerName,
    },
  })
}

export class GpuWmsLayerRegistry {
  private readonly entries = new Map<string, GpuLayerCatalogEntry>()
  private readonly olLayers = new Map<string, TileLayer>()
  private map: OlMap | null = null
  private document: StandardViewerDocument | null = null

  loadFromLayerConfig(layers: GpuLayerConfig[], document: StandardViewerDocument | null): void {
    this.document = document
    for (const layer of this.olLayers.values()) {
      this.map?.removeLayer(layer)
    }
    this.entries.clear()
    this.olLayers.clear()

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
    let layer = this.olLayers.get(catalogId)
    if (layer) return layer

    const entry = this.entries.get(catalogId)
    if (!entry) return undefined

    const created = createWmsTileLayer(entry, this.document)
    if (!created) return undefined

    this.olLayers.set(catalogId, created)
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

  hasWmsLayer(catalogId: string): boolean {
    return this.entries.has(catalogId)
  }
}

export const gpuWmsLayerRegistry = new GpuWmsLayerRegistry()
