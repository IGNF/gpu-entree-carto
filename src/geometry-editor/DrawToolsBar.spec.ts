/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import OlMap from 'ol/Map'
import View from 'ol/View'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Draw from 'ol/interaction/Draw'
import Modify from 'ol/interaction/Modify'
import Snap from 'ol/interaction/Snap'
import type Interaction from 'ol/interaction/Interaction'
import { DrawToolsBar } from '@/geometry-editor/DrawToolsBar'
import { stubResizeObserver } from '@/test/olJsdom'

beforeAll(stubResizeObserver)

function setup(geometryType = 'Polygon') {
  const source = new VectorSource()
  const layer = new VectorLayer({ source })
  const map = new OlMap({ layers: [layer], view: new View({ center: [0, 0], zoom: 2 }) })
  const target = document.createElement('div')
  const modifySubToolsTarget = document.createElement('div')
  document.body.append(target, modifySubToolsTarget)
  const bar = new DrawToolsBar({
    map,
    source,
    layer,
    geometryType,
    target,
    modifySubToolsTarget,
    onChange: () => {},
  })
  return { map, bar, target }
}

function indexOf(map: OlMap, ctor: abstract new (...args: never[]) => Interaction): number {
  return map
    .getInteractions()
    .getArray()
    .findIndex((i) => i instanceof ctor)
}

function click(target: HTMLElement, toolId: string): void {
  const btn = target.querySelector<HTMLButtonElement>(`button[data-tool-id="${toolId}"]`)
  expect(btn, `bouton ${toolId}`).toBeTruthy()
  btn!.click()
}

describe('DrawToolsBar — ordre des interactions (Snap en dernier)', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('Snap reste après Modify à la construction', () => {
    const { map } = setup()
    expect(indexOf(map, Snap)).toBeGreaterThan(indexOf(map, Modify))
  })

  it('Snap est après Draw quand un outil de dessin est activé', () => {
    const { map, target } = setup()
    click(target, 'draw')
    const draw = indexOf(map, Draw)
    expect(draw).toBeGreaterThanOrEqual(0)
    expect(indexOf(map, Snap)).toBeGreaterThan(draw)
  })

  it('reste vrai après avoir changé d’outil plusieurs fois', () => {
    const { map, target } = setup('Polygon,LineString')
    const drawIds = ['polygon', 'line']
    for (const id of [...drawIds, ...drawIds]) {
      click(target, id)
      expect(indexOf(map, Snap)).toBeGreaterThan(indexOf(map, Draw))
    }
    // une seule instance Snap, jamais dupliquée
    expect(
      map
        .getInteractions()
        .getArray()
        .filter((i) => i instanceof Snap),
    ).toHaveLength(1)
  })

  it('destroy retire Draw, Modify et Snap', () => {
    const { map, bar, target } = setup()
    click(target, 'draw')
    bar.destroy()
    for (const ctor of [Draw, Modify, Snap]) expect(indexOf(map, ctor)).toBe(-1)
  })
})
