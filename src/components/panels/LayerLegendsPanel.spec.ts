/**
 * @vitest-environment jsdom
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import LayerLegendsPanel from '@/components/panels/LayerLegendsPanel.vue'

const layers = [
  {
    id: 'du',
    title: 'Zonages',
    legend: [{ id: 'u', title: 'Zone urbaine', imageUrl: 'https://example.test/u.png' }],
  },
]

describe('LayerLegendsPanel', () => {
  it('changement de zoom : les images de légende ne sont pas recréées (pas de saut)', async () => {
    const wrapper = mount(LayerLegendsPanel, {
      props: { layers, mapZoom: 15, catalogEntryInZoomRange: () => true } as never,
    })
    await wrapper.find('.fr-accordion__btn').trigger('click')
    const before = wrapper.find('.ec-layer-legends__img').element
    await wrapper.setProps({ mapZoom: 16 })
    expect(wrapper.find('.ec-layer-legends__img').element).toBe(before)
  })

  it('hors plage de zoom : section marquée ec-not-in-zoom-range', () => {
    const wrapper = mount(LayerLegendsPanel, {
      props: { layers, mapZoom: 8, catalogEntryInZoomRange: () => false } as never,
    })
    expect(wrapper.find('section.fr-accordion').classes()).toContain('ec-not-in-zoom-range')
  })
})
