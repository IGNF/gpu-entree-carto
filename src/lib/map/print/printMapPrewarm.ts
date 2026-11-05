import type Map from 'ol/Map'
import type { Extent } from 'ol/extent'
import { renderOffscreenPrintMapCanvas } from '@/lib/map/print/offscreenPrintMapExport'
import {
  buildPrintMapRenderCacheKey,
  buildVisibleLayerFingerprint,
  getCachedPrintMapCanvas,
} from '@/lib/map/print/printMapRenderCache'

export type PrintMapPrewarmParams = {
  previewMap: Map
  dpi: number
  mapWidthPx: number
  mapHeightPx: number
  extent: Extent
}

export async function prewarmPrintMapRenderCache(params: PrintMapPrewarmParams): Promise<boolean> {
  if (params.mapWidthPx < 16 || params.mapHeightPx < 16) return false
  const view = params.previewMap.getView()
  const layerFingerprint = buildVisibleLayerFingerprint(params.previewMap)
  const cacheKey = buildPrintMapRenderCacheKey({
    dpi: params.dpi,
    mapWidthPx: params.mapWidthPx,
    mapHeightPx: params.mapHeightPx,
    extent: params.extent,
    layerFingerprint,
    rotation: view.getRotation(),
  })
  if (getCachedPrintMapCanvas(cacheKey)) return true

  const canvas = await renderOffscreenPrintMapCanvas(params.previewMap, {
    widthPx: params.mapWidthPx,
    heightPx: params.mapHeightPx,
    extent: params.extent,
    cacheKey,
  })
  canvas.remove()
  return true
}
