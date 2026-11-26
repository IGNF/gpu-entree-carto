/**
 * @vitest-environment jsdom
 *
 * Skill vue-openlayers : toute carte créée doit être détruite complètement
 * (`setTarget(undefined)` + `dispose()`), sinon contrôles, interactions et overlays
 * restent attachés.
 */
/* eslint-disable vue/one-component-per-file -- composants de test jetables */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import OlMap from 'ol/Map'
import { useOlMap } from '@/composables/useOlMap'
import { GeometryEditor } from '@/geometry-editor/GeometryEditor'
import { mountSketch } from '@/sketch/mountSketch'
import { mountSearchEngine } from '@/lib/mountSearchEngine'
import { stubResizeObserver } from '@/test/olJsdom'

beforeAll(stubResizeObserver)

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe('useOlMap', () => {
  it('dispose la carte au démontage et vide la ref', () => {
    const dispose = vi.spyOn(OlMap.prototype, 'dispose')
    let exposed: ReturnType<typeof useOlMap>['map'] | null = null
    const Comp = defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null)
        exposed = useOlMap({ target: el }).map
        return () => h('div', { ref: el, style: 'height:100px' })
      },
    })
    const wrapper = mount(Comp, { attachTo: document.body })
    const map = exposed!.value
    expect(map).toBeInstanceOf(OlMap)
    wrapper.unmount()
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(map!.getTargetElement()).toBeNull()
    expect(exposed!.value).toBeNull()
  })

  it('contraint la vue aux zooms entiers (setZoom, fit)', () => {
    let exposed: ReturnType<typeof useOlMap>['map'] | null = null
    const Comp = defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null)
        exposed = useOlMap({ target: el }).map
        return () => h('div', { ref: el, style: 'height:100px' })
      },
    })
    const wrapper = mount(Comp, { attachTo: document.body })
    const view = exposed!.value!.getView()
    view.setZoom(11.4)
    expect(view.getZoom()).toBe(11)
    view.fit([0, 0, 30000, 20000], { size: [512, 512] })
    expect(Number.isInteger(view.getZoom())).toBe(true)
    wrapper.unmount()
  })

  it('un enfant peut encore retirer son contrôle pendant son propre démontage', () => {
    const errors: unknown[] = []
    const Child = defineComponent({
      props: { map: { type: Object, required: true } },
      setup() {
        return () => h('span')
      },
      beforeUnmount() {
        try {
          const m = this.map as OlMap
          m.getControls().getArray().slice()
          m.getView().getZoom()
        } catch (e) {
          errors.push(e)
        }
      },
    })
    const Comp = defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null)
        const { map } = useOlMap({ target: el })
        return () =>
          h('div', [h('div', { ref: el }), map.value ? h(Child, { map: map.value }) : null])
      },
    })
    const wrapper = mount(Comp, { attachTo: document.body })
    wrapper.unmount()
    expect(errors).toEqual([])
  })
})

describe('montages autonomes', () => {
  it('GeometryEditor.destroy() dispose la carte', () => {
    const dispose = vi.spyOn(OlMap.prototype, 'dispose')
    const input = document.createElement('input')
    document.body.appendChild(input)
    const editor = new GeometryEditor(input)
    editor.destroy()
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('mountSketch().destroy() dispose la carte', () => {
    // Node 24 expose un localStorage global incomplet qui masque celui de jsdom.
    const store = new globalThis.Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    })
    const dispose = vi.spyOn(OlMap.prototype, 'dispose')
    const host = document.createElement('div')
    document.body.appendChild(host)
    const handle = mountSketch(host)
    handle.destroy()
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(handle.map.getTargetElement()).toBeNull()
  })

  it('mountSearchEngine().destroy() dispose la carte', () => {
    const dispose = vi.spyOn(OlMap.prototype, 'dispose')
    const host = document.createElement('div')
    document.body.appendChild(host)
    const handle = mountSearchEngine(host)
    handle.destroy()
    expect(dispose).toHaveBeenCalledTimes(1)
  })
})
