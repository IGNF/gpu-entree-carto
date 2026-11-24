/**
 * @vitest-environment jsdom
 */
import { beforeAll, describe, expect, it } from 'vitest'
import OlMap from 'ol/Map'
import View from 'ol/View'
import { renderSyncIfAttached } from '@/lib/map/print/waitForMapRender'
import { stubResizeObserver } from '@/test/olJsdom'

beforeAll(stubResizeObserver)

const newMap = (target?: HTMLElement) =>
  new OlMap({ target, view: new View({ center: [0, 0], zoom: 2 }) })

describe('renderSyncIfAttached', () => {
  it('cause du bug : OL 10 plante sur renderSync() d’une carte détachée', () => {
    const map = newMap(document.createElement('div'))
    map.setTarget(undefined)
    expect(() => map.renderSync()).toThrow(/renderFrame/)
  })

  it('carte détachée (aperçu après fermeture de la modale) : ne fait rien, ne plante pas', () => {
    const map = newMap(document.createElement('div'))
    map.setTarget(undefined)
    expect(() => renderSyncIfAttached(map)).not.toThrow()
  })

  it('carte attachée : rend', () => {
    const map = newMap(document.createElement('div'))
    let rendered = 0
    map.renderSync = () => void (rendered += 1)
    renderSyncIfAttached(map)
    expect(rendered).toBe(1)
  })

  it('accepte null / undefined (ref vide)', () => {
    expect(() => renderSyncIfAttached(null)).not.toThrow()
    expect(() => renderSyncIfAttached(undefined)).not.toThrow()
  })
})
