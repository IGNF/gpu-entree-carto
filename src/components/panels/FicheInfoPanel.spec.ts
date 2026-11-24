/**
 * @vitest-environment jsdom
 */
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import FicheInfoPanel from '@/components/panels/FicheInfoPanel.vue'
import { provideMapMode } from '@/composables/mapMode'
import { ficheServiceUnavailableSelection } from '@/lib/fiche/ficheRetry'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'

function mountPanel(mode: MapModeId) {
  const selection = ficheServiceUnavailableSelection('Les, 38450 Vif', {
    lon: 5.68,
    lat: 45.05,
    mode,
    zoom: 13,
  })
  const Host = defineComponent({
    setup() {
      provideMapMode({ initial: mode, syncUrl: false })
      return () => h(FicheInfoPanel, { selection })
    },
  })
  return mount(Host, { global: { stubs: { teleport: true } } })
}

describe('FicheInfoPanel — requête fiche-info en échec', () => {
  for (const mode of [MAP_MODE_PARCEL, MAP_MODE_TERRITORY]) {
    it(`mode ${mode} : message « Indisponibilité du service » + bouton Réessayer (pas d’onglets vides)`, () => {
      const wrapper = mountPanel(mode)
      expect(wrapper.text()).toContain('Indisponibilité du service')
      expect(wrapper.find('button[data-ec-fiche-retry]').exists()).toBe(true)
      expect(wrapper.find('[role=tab]').exists()).toBe(false)
    })
  }
})
