/**
 * @vitest-environment jsdom
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MapPrintFicheTerritoryPage from '@/components/map/print/MapPrintFicheTerritoryPage.vue'

describe('MapPrintFicheTerritoryPage', () => {
  it('commune sans onglets (RNU, document petite échelle…) : imprime le contenu de la fiche', async () => {
    const wrapper = mount(MapPrintFicheTerritoryPage, {
      props: {
        title: 'Saint-Pere (89364)',
        documentTabs: [],
        bodyHtml: '<p>Cette commune est couverte par le Règlement National d’Urbanisme (RNU).</p>',
      },
    })
    await new Promise((r) => setTimeout(r, 0))
    const text = wrapper.text()
    expect(text).toContain('Règlement National d’Urbanisme')
    expect(text).not.toContain('Pour sélectionner une parcelle')
  })
})

describe('MapPrintFicheTerritoryPage — pas de document', () => {
  it('le message « Pas de document trouvé… » n’est pas imprimé', async () => {
    const { TERRITORY_NO_DOCUMENT_HTML } = await import('@/lib/fiche/ficheNoDataMessages')
    const wrapper = mount(MapPrintFicheTerritoryPage, {
      props: {
        title: 'Saint-Pere (89364)',
        documentTabs: [],
        bodyHtml: TERRITORY_NO_DOCUMENT_HTML,
      },
    })
    expect(wrapper.text()).toBe('Saint-Pere (89364)')
  })
})
