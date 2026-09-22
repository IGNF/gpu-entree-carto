/**
 * Tuile d’aperçu — `TileLayerSwitcherControl.settings.tileCoord` (gpu-client).
 * 3e valeur = (tileRow × −1 − 1) ; TILEROW WMTS = −stored − 1.
 */
export const GPU_TILE_LAYER_SWITCHER_TILE_COORD = [9, 253, -177] as const

/** Résolution carte équivalente à la tuile d’aperçu TileLayerSwitcher (TILEMATRIX 9). */
export const GPU_PREVIEW_TILE_RESOLUTION =
  156543.03392804097 / 2 ** GPU_TILE_LAYER_SWITCHER_TILE_COORD[0]

export interface GpuBaseLayerThumbnailWmts {
  layer: string
  format?: 'png' | 'jpeg'
  style?: string
  grayscale?: boolean
  minResolution?: number
  maxResolution?: number
}

function wmtsPreviewTileRow(storedRow: number): number {
  return -storedRow - 1
}

/** Même règle de visibilité que OpenLayers (`minResolution` / `maxResolution`). */
export function isWmtsVisibleAtResolution(
  resolution: number,
  minResolution?: number,
  maxResolution?: number,
): boolean {
  if (minResolution !== undefined && resolution < minResolution) return false
  if (maxResolution !== undefined && resolution >= maxResolution) return false
  return true
}

export function filterThumbnailLayersAtPreviewZoom(
  layers: GpuBaseLayerThumbnailWmts[],
  resolution: number = GPU_PREVIEW_TILE_RESOLUTION,
): GpuBaseLayerThumbnailWmts[] {
  return layers.filter((l) =>
    isWmtsVisibleAtResolution(resolution, l.minResolution, l.maxResolution),
  )
}

export function wmtsPreviewTileUrl(entry: GpuBaseLayerThumbnailWmts): string {
  const [matrix, col, rowStored] = GPU_TILE_LAYER_SWITCHER_TILE_COORD
  const row = wmtsPreviewTileRow(rowStored)
  const format = entry.format ?? 'png'
  const style = entry.style ?? 'normal'
  return (
    `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0` +
    `&LAYER=${encodeURIComponent(entry.layer)}&STYLE=${encodeURIComponent(style)}&FORMAT=image/${format}` +
    `&TILEMATRIXSET=PM&TILEMATRIX=${matrix}&TILEROW=${row}&TILECOL=${col}`
  )
}
