/**
 * @vitest-environment jsdom
 */
import { mount } from '@vue/test-utils'
import { defineComponent, h, provide, shallowRef } from 'vue'
import { beforeAll, describe, expect, it } from 'vitest'
import OlMap from 'ol/Map'
import View from 'ol/View'
import ClickInfoControl from '@/components/map/ClickInfoControl.vue'
import { provideMapMode } from '@/composables/mapMode'
import { MAP_MODE_PARCEL } from '@/lib/map/mapMode'
import { stubResizeObserver } from '@/test/olJsdom'

beforeAll(() => stubResizeObserver())

function mountWithMap(props: Record<string, unknown> = {}) {
  const map = new OlMap({ view: new View({ center: [0, 0], zoom: 2 }) })
  const Host = defineComponent({
    setup() {
      provide('olMap', shallowRef(map))
      provideMapMode({ initial: MAP_MODE_PARCEL, syncUrl: false })
      return () => h(ClickInfoControl, props)
    },
  })
  const wrapper = mount(Host)
  const button = () =>
    map
      .getControls()
      .getArray()
      .map((c) => (c as unknown as { element: HTMLElement }).element?.querySelector('button'))
      .find((b): b is HTMLButtonElement =>
        Boolean(b?.classList.contains('ec-click-info-toggle__btn')),
      )
  return { map, wrapper, button }
}

describe('ClickInfoControl', () => {
  it('par défaut (démo principale) : clic toujours écouté, pas de bouton', () => {
    const { map, button } = mountWithMap()
    expect(map.hasListener('singleclick')).toBe(true)
    expect(button()).toBeUndefined()
  })

  it('toggleable : bouton actif au départ ; le désactiver coupe l’écoute du clic, le réactiver la rétablit', async () => {
    const { map, button, wrapper } = mountWithMap({ toggleable: true })
    const btn = button()!
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(map.hasListener('singleclick')).toBe(true)

    btn.click()
    await wrapper.vm.$nextTick()
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(map.hasListener('singleclick')).toBe(false)

    btn.click()
    await wrapper.vm.$nextTick()
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(map.hasListener('singleclick')).toBe(true)
  })
})
