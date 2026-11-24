/**
 * @vitest-environment jsdom
 */
import { beforeAll, describe, expect, it } from 'vitest'
import OlMap from 'ol/Map'
import View from 'ol/View'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { ModifyTransformController } from '@/geometry-editor/ModifyTransformController'
import { stubResizeObserver } from '@/test/olJsdom'

beforeAll(stubResizeObserver)

describe('ModifyTransformController — style des poignées', () => {
  it('réutilise le même objet Style à chaque rendu (pas de new Style par appel)', () => {
    const source = new VectorSource()
    const layer = new VectorLayer({ source })
    const map = new OlMap({ layers: [layer], view: new View({ center: [0, 0], zoom: 2 }) })
    const ctrl = new ModifyTransformController({
      map,
      source,
      layer,
      mode: 'line-polygon',
      onChange: () => {},
    })
    ctrl.setActive(true)
    const handles = map
      .getLayers()
      .getArray()
      .find((l) => l.get('ec-transform-handles')) as VectorLayer | undefined
    expect(handles).toBeTruthy()
    const styleFn = handles!.getStyleFunction()!
    const f = new Feature(new Point([0, 0]))
    const a = styleFn(f, 1)
    const b = styleFn(new Feature(new Point([1, 1])), 2)
    expect(a).toBeTruthy()
    expect(a).toBe(b)
    ctrl.destroy()
  })
})
