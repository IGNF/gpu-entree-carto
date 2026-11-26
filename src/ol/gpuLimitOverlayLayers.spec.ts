import { afterEach, describe, expect, it, vi } from 'vitest'
import { get as getProjection } from 'ol/proj'
import type VectorImageLayer from 'ol/layer/VectorImage'
import { cloneLayerForPrint } from '@/lib/map/print/cloneMapLayers'

const REGIONS = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { code: '76', nom: 'Occitanie' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [1, 43],
            [2, 43],
            [2, 44],
            [1, 43],
          ],
        ],
      },
    },
  ],
}

/** Module rechargé à chaque test : cache des GeoJSON remis à zéro. */
async function freshModule() {
  vi.resetModules()
  return import('@/ol/gpuLimitOverlayLayers')
}

function triggerLoad(layer: VectorImageLayer): void {
  const projection = getProjection('EPSG:3857')!
  layer.getSource()!.loadFeatures(projection.getExtent(), 1500, projection)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('limites administratives', () => {
  it('GeoJSON chargé au premier rendu de la couche, pas à sa création', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify(REGIONS))))
    vi.stubGlobal('fetch', fetchMock)
    const { createLimitRegionalLayer } = await freshModule()

    const layer = createLimitRegionalLayer()
    expect(fetchMock).not.toHaveBeenCalled()

    triggerLoad(layer)
    await vi.waitFor(() => expect(layer.getSource()!.getFeatures()).toHaveLength(1))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('échec de chargement : pas de nouvelle requête à chaque rendu', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('', { status: 500 })))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { createLimitRegionalLayer } = await freshModule()

    const layer = createLimitRegionalLayer()
    triggerLoad(layer)
    await vi.waitFor(() => expect(console.warn).toHaveBeenCalled())
    triggerLoad(layer)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('impression : copie partageant la source (chargement à la demande conservé)', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const { createLimitDepartmentalLayer } = await freshModule()
    const layer = createLimitDepartmentalLayer()
    layer.setVisible(true)

    const clone = cloneLayerForPrint(layer) as VectorImageLayer
    expect(clone).not.toBeNull()
    expect(clone.getSource()).toBe(layer.getSource())
    expect(clone.getMaxResolution()).toBe(layer.getMaxResolution())
  })
})
