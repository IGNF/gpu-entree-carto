/**
 * @vitest-environment jsdom
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import LayerCataloguePanel from '@/components/panels/LayerCataloguePanel.vue'

/** v-show : `display: none` sur le panneau masqué. */
const shown = (w: { element: Element }) => (w.element as HTMLElement).style.display !== 'none'

function mountPanel() {
  return mount(LayerCataloguePanel, {
    props: {
      layerNodes: [],
      inStackById: {},
      mapZoom: 12,
      basePresets: [],
      baseModelValue: 'carte',
    },
  })
}

describe('LayerCataloguePanel — onglets Données / Fonds de cartes', () => {
  it('bascule de panneau avec glissement dans l’ordre des onglets', async () => {
    const wrapper = mountPanel()
    const donnees = () => wrapper.find('#ec-catalog-panel-donnees')
    const fonds = () => wrapper.find('#ec-catalog-panel-fonds')
    expect(shown(donnees())).toBe(true)
    expect(shown(fonds())).toBe(false)

    await wrapper.find('#ec-catalog-tab-fonds').trigger('click')
    expect(shown(donnees())).toBe(false)
    expect(shown(fonds())).toBe(true)
    expect(wrapper.find('transition-stub').attributes('name')).toBe('ec-slide-next')

    await wrapper.find('#ec-catalog-tab-donnees').trigger('click')
    expect(shown(donnees())).toBe(true)
    expect(wrapper.find('transition-stub').attributes('name')).toBe('ec-slide-prev')
  })
})
