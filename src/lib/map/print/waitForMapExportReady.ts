import type Map from 'ol/Map'
import type BaseLayer from 'ol/layer/Base'
import Layer from 'ol/layer/Layer'
import TileLayer from 'ol/layer/Tile'
import VectorTile from 'ol/layer/VectorTile'
import type TileSource from 'ol/source/Tile'
import type { EventsKey } from 'ol/events'
import { unByKey } from 'ol/Observable'

export type MapExportReadyProgress = {
  pendingTiles: number
  loadedTiles: number
}

export type WaitForMapExportReadyOptions = {
  timeoutMs?: number
  stablePasses?: number
  onProgress?: (progress: MapExportReadyProgress) => void
}

function tileSourceFromLayer(layer: BaseLayer): TileSource | null {
  if (!(layer instanceof Layer) || !layer.getVisible()) return null
  if (layer instanceof TileLayer || layer instanceof VectorTile) {
    const source = layer.getSource()
    if (source && typeof (source as TileSource).getTileGrid === 'function') {
      return source as TileSource
    }
  }
  return null
}

function collectTileSources(map: Map): TileSource[] {
  const sources = new Set<TileSource>()
  for (const layer of map.getLayers().getArray()) {
    const source = tileSourceFromLayer(layer)
    if (source) sources.add(source)
  }
  return [...sources]
}

/**
 * Attend que les tuiles visibles soient chargées et que le rendu OL soit stable
 * (plus fiable que 2× rendercomplete seuls pour l’export haute résolution).
 */
export async function waitForMapExportReady(
  map: Map,
  options: WaitForMapExportReadyOptions = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 120_000
  const stablePasses = Math.max(1, options.stablePasses ?? 2)
  const sources = collectTileSources(map)
  let pendingTiles = 0
  let loadedTiles = 0

  const sourceKeys: EventsKey[] = []
  const report = (): void => {
    options.onProgress?.({ pendingTiles, loadedTiles })
  }

  for (const source of sources) {
    sourceKeys.push(
      source.on('tileloadstart', () => {
        pendingTiles += 1
        report()
      }),
    )
    const onTileDone = (): void => {
      pendingTiles = Math.max(0, pendingTiles - 1)
      loadedTiles += 1
      report()
    }
    sourceKeys.push(source.on('tileloadend', onTileDone))
    sourceKeys.push(source.on('tileloaderror', onTileDone))
  }

  report()

  try {
    await new Promise<void>((resolve, reject) => {
      let stableRenderCount = 0

      const onRenderComplete = (): void => {
        if (pendingTiles > 0) {
          stableRenderCount = 0
          map.renderSync()
          return
        }
        stableRenderCount += 1
        if (stableRenderCount >= stablePasses) {
          cleanup()
          resolve()
        } else {
          map.renderSync()
        }
      }

      const renderKey = map.on('rendercomplete', onRenderComplete)

      const cleanup = (): void => {
        if (timer !== undefined) window.clearTimeout(timer)
        unByKey(renderKey)
      }

      const timer =
        typeof window !== 'undefined'
          ? window.setTimeout(() => {
              cleanup()
              reject(new Error('Délai dépassé lors du chargement des tuiles cartographiques.'))
            }, timeoutMs)
          : undefined

      map.renderSync()
    })
  } finally {
    unByKey(sourceKeys)
  }
}
