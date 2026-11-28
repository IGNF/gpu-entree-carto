/**
 * @vitest-environment jsdom
 */
import { mount } from '@vue/test-utils'
import { defineComponent, h, shallowRef } from 'vue'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import OlMap from 'ol/Map'
import View from 'ol/View'
import { useMapRotation } from '@/composables/useMapRotation'
import { stubResizeObserver } from '@/test/olJsdom'

beforeAll(() => stubResizeObserver())

function setup() {
  const map = new OlMap({ view: new View({ center: [0, 0], zoom: 5, rotation: 0 }) })
  const view = map.getView()
  // Applique la rotation demandée sans attendre l’animation.
  vi.spyOn(view, 'animate').mockImplementation((...args) => {
    const opts = args[0]
    if (typeof opts === 'object' && opts.rotation != null) view.setRotation(opts.rotation)
  })
  let api: ReturnType<typeof useMapRotation> | undefined
  mount(
    defineComponent({
      setup() {
        api = useMapRotation(shallowRef(map))
        return () => h('div')
      },
    }),
  )
  return { view, api: api! }
}

describe('useMapRotation', () => {
  it('suit l’orientation, remet au nord puis revient à l’orientation précédente', () => {
    const { view, api } = setup()
    view.setRotation(Math.PI / 4)
    expect(api.rotation.value).toBeCloseTo(Math.PI / 4)
    expect(api.canRestore.value).toBe(false)

    api.toggleNorth()
    expect(view.getRotation()).toBe(0)
    expect(api.canRestore.value).toBe(true)

    api.toggleNorth()
    expect(view.getRotation()).toBeCloseTo(Math.PI / 4)
    expect(api.canRestore.value).toBe(false)
  })

  it('carte au nord sans orientation mémorisée : aucun effet', () => {
    const { view, api } = setup()
    api.toggleNorth()
    expect(view.animate).not.toHaveBeenCalled()
  })

  it('rotation manuelle après la remise au nord : l’orientation mémorisée est oubliée', () => {
    const { view, api } = setup()
    view.setRotation(1)
    api.toggleNorth()
    view.setRotation(0.5)
    expect(api.canRestore.value).toBe(false)
    api.toggleNorth()
    expect(view.getRotation()).toBe(0)
    expect(api.canRestore.value).toBe(true)
  })
})
