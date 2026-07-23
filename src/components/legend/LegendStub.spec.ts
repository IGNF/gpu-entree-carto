import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LegendStub from '@/components/legend/LegendStub.vue'
import { createBaseLayerPresets, setActiveBaseLayer } from '@/ol/baseLayers'

describe('LegendStub', () => {
  it('affiche les titres de légende', () => {
    const wrapper = mount(LegendStub, {
      props: {
        items: [{ id: 'a', title: 'Zone U' }],
      },
    })
    expect(wrapper.text()).toContain('Zone U')
    expect(wrapper.text()).toContain('Légende')
  })
})

describe('baseLayers', () => {
  it('crée trois fonds et bascule la visibilité', () => {
    const presets = createBaseLayerPresets()
    expect(presets).toHaveLength(3)
    setActiveBaseLayer(presets, 'ortho')
    expect(presets.find((p) => p.id === 'ortho')?.layer.getVisible()).toBe(true)
    expect(presets.find((p) => p.id === 'plan')?.layer.getVisible()).toBe(false)
  })
})
