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
  scaleDependant?: boolean
  scaleDependantTreshold?: number
  forceOpacity?: boolean
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

/**
 * Segment de chemin TLS gpu-client ({@link gpu.model.Layer#getOrCreatePath}) :
 * `name` + concaténation des `filterValue` (+ `filterValueLike`), pas le titre.
 */
export function pathSegment(layer: GpuLayerConfig): string {
  if (layer.path?.startsWith('/')) {
    const parts = layer.path.replace(/\/+/g, '/').split('/').filter(Boolean)
    return parts[parts.length - 1] ?? 'couche'
  }

  let uniqueName = (layer.name ?? layer.title ?? 'couche').trim()
  if (layer.filterAttribute && layer.filterValue?.length) {
    for (const value of layer.filterValue) {
      uniqueName += value
    }
  }
  if (layer.filterAttribute && layer.filterValueLike) {
    uniqueName += `_${layer.filterValueLike}`
  }
  return uniqueName.toLowerCase()
}

export function buildLayerPath(layer: GpuLayerConfig, parentPath: string): string {
  if (layer.path?.startsWith('/')) {
    return layer.path.replace(/\/+/g, '/')
  }
  const segment = pathSegment(layer)
  if (!parentPath) return `/${segment}`
  const base = parentPath.endsWith('/') ? parentPath.slice(0, -1) : parentPath
  return `${base}/${segment}`.replace(/\/+/g, '/')
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

    const path = buildLayerPath(layer, parentPath || '')
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
