/**
 * @vitest-environment jsdom
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MapPrintFicheParcelPage from '@/components/map/print/MapPrintFicheParcelPage.vue'

describe('MapPrintFicheParcelPage', () => {
  it('sans règle ni document : sections « Règles d’urbanisme » et « Documents couvrant la parcelle » absentes', () => {
    const wrapper = mount(MapPrintFicheParcelPage, {
      props: { title: 'AC 0261', infosHtml: '', documentsHtml: '', cadastreReferences: null },
    })
    expect(wrapper.text()).not.toContain('Règles d’urbanisme')
    expect(wrapper.text()).not.toContain('Documents couvrant la parcelle')
  })

  it('avec contenu : sections affichées', () => {
    const wrapper = mount(MapPrintFicheParcelPage, {
      props: {
        title: 'AC 0261',
        infosHtml: '<p>Zone N</p>',
        documentsHtml: '<p>PLU</p>',
        cadastreReferences: null,
      },
    })
    expect(wrapper.text()).toContain('Règles d’urbanisme')
    expect(wrapper.text()).toContain('Documents couvrant la parcelle')
  })
})
