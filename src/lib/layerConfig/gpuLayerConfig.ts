/**
 * Sous-ensemble de gpu.model.Layer (gpu-client-config.js → LAYER_CONFIG).
 */

export interface GpuLayerConfig {
  name?: string
  title?: string
  type?: string
  virtual?: boolean
  visible?: boolean
  opacity?: number
  minZoomLevel?: number
  maxZoomLevel?: number
  hideLayers?: boolean
  hideHimself?: boolean
  onlyLegend?: boolean
  layers?: GpuLayerConfig[]
  filterAttribute?: string
  filterValue?: string[]
  filterValueLike?: string
  zIndex?: number | string
  path?: string
}

export interface GpuLayerCatalogEntry {
  id: string
  path: string
  config: GpuLayerConfig
}

export function pathToCatalogId(path: string): string {
  const normalized = path.replace(/^\/+/, '').replace(/\/+/g, '/')
  if (!normalized) return 'root'
  return normalized
    .split('/')
    .map((part) =>
      part
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    )
    .join('--')
}

export function pathSegment(layer: GpuLayerConfig): string {
  const base = layer.title?.trim() || layer.name?.trim() || 'couche'
  return base.slice(0, 80)
}

export function layerConfigToCatalogEntries(
  layers: GpuLayerConfig[],
  parentPath = '',
  registry: GpuLayerCatalogEntry[] = [],
): GpuLayerCatalogEntry[] {
  for (const layer of layers) {
    if (layer.hideHimself) {
      if (layer.layers?.length) {
        layerConfigToCatalogEntries(layer.layers, parentPath, registry)
      }
      continue
    }

    const segment = pathSegment(layer)
    const path = layer.path?.startsWith('/')
      ? layer.path
      : `${parentPath}/${segment}`.replace(/\/+/g, '/')
    const id = pathToCatalogId(path)

    registry.push({ id, path, config: layer })

    if (layer.layers?.length) {
      layerConfigToCatalogEntries(layer.layers, path, registry)
    }
  }
  return registry
}

export function readLayerConfigFromWindow(): GpuLayerConfig[] | null {
  const raw = typeof window !== 'undefined' ? window.LAYER_CONFIG : undefined
  if (!Array.isArray(raw) || !raw.length) return null
  return raw as GpuLayerConfig[]
}
