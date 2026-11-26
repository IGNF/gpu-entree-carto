/**
 * @vitest-environment jsdom
 */
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import FicheInfoPanel from '@/components/panels/FicheInfoPanel.vue'
import { provideMapMode } from '@/composables/mapMode'
import { ficheSupplementError } from '@/lib/fiche/ficheInfoService'
import {
  FICHE_RATE_LIMITED_MESSAGE,
  ficheServiceUnavailableSelection,
} from '@/lib/fiche/ficheRetry'
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

describe('FicheInfoPanel — complément au point en échec', () => {
  afterEach(() => {
    ficheSupplementError.value = null
  })

  it('affiche le message (ex. HTTP 429) avec un bouton Réessayer, sans masquer la fiche', () => {
    ficheSupplementError.value = FICHE_RATE_LIMITED_MESSAGE
    const wrapper = mountPanel(MAP_MODE_TERRITORY)
    const alert = wrapper.find('[role=alert]')
    expect(alert.text()).toContain('Service temporairement saturé, réessayez.')
    expect(alert.find('button[aria-label="Réessayer"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Indisponibilité du service')
  })

  it('aucun message sans échec', () => {
    expect(mountPanel(MAP_MODE_PARCEL).find('[role=alert]').exists()).toBe(false)
  })
})
