/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import Feature from 'ol/Feature'
import OlMap from 'ol/Map'
import View from 'ol/View'
import Point from 'ol/geom/Point'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { rebuildPrintPreviewMap } from '@/lib/map/print/cloneMapLayers'
import { searchEngineLayerHostRef } from '@/lib/map/searchResultGraphics'
import { stubResizeObserver } from '@/test/olJsdom'

beforeAll(() => stubResizeObserver())
afterEach(() => {
  searchEngineLayerHostRef.value = null
})

function vectorWith(feature: Feature): VectorLayer {
  return new VectorLayer({ source: new VectorSource({ features: [feature] }) })
}

describe('rebuildPrintPreviewMap', () => {
  it('copie la couche recherche (cerise + emprises), attachée hors collection par geopf', () => {
    const source = new OlMap({ view: new View({ center: [0, 0], zoom: 2 }) })
    source.addLayer(vectorWith(new Feature(new Point([1, 1]))))
    const pin = new Feature(new Point([0, 0]))
    const searchLayer = vectorWith(pin)
    searchLayer.setMap(source) // couche « non gérée » : absente de source.getLayers()
    searchEngineLayerHostRef.value = { getMap: () => source, layer: searchLayer }

    const preview = new OlMap({ view: new View({ center: [0, 0], zoom: 2 }) })
    rebuildPrintPreviewMap(source, preview)
    const layers = preview.getLayers().getArray() as VectorLayer[]
    expect(layers).toHaveLength(2)
    expect(layers[1].getSource()?.getFeatures()).toHaveLength(1)
    expect(layers[1].getZIndex()).toBeGreaterThan(layers[0].getZIndex() ?? 0)

    // Export : copie de l’aperçu (déjà gérée) — pas de doublon.
    const exportMap = new OlMap({ view: new View({ center: [0, 0], zoom: 2 }) })
    rebuildPrintPreviewMap(preview, exportMap)
    expect(exportMap.getLayers().getLength()).toBe(2)
  })
})
