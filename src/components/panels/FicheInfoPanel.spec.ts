/**
 * @vitest-environment jsdom
 */
import { mount } from '@vue/test-utils'
import { defineComponent, h, provide } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import FicheInfoPanel from '@/components/panels/FicheInfoPanel.vue'
import { mapPrintModalKey } from '@/map/mapPrintModalContext'
import { provideMapMode } from '@/composables/mapMode'
import type { FicheInfoSelection } from '@/composables/tabPanels'
import { ficheSupplementError } from '@/lib/fiche/ficheInfoService'
import {
  FICHE_RATE_LIMITED_MESSAGE,
  ficheServiceUnavailableSelection,
} from '@/lib/fiche/ficheRetry'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'

function mountPanel(
  mode: MapModeId,
  options: { selection?: FicheInfoSelection; withPrint?: boolean } = {},
) {
  const selection =
    options.selection ??
    ficheServiceUnavailableSelection('Les, 38450 Vif', {
      lon: 5.68,
      lat: 45.05,
      mode,
      zoom: 13,
    })
  const Host = defineComponent({
    setup() {
      provideMapMode({ initial: mode, syncUrl: false })
      if (options.withPrint) provide(mapPrintModalKey, { open: () => {}, close: () => {} })
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

describe('FicheInfoPanel — bouton Imprimer', () => {
  const selection: FicheInfoSelection = {
    title: 'Vif (38545)',
    territoryTitle: 'Vif (38545)',
    mapMode: MAP_MODE_TERRITORY,
  }
  const printButton = 'button[title="Imprimer la fiche territoire"]'

  it('présent quand la page propose l’impression', () => {
    const wrapper = mountPanel(MAP_MODE_TERRITORY, { selection, withPrint: true })
    expect(wrapper.find(printButton).exists()).toBe(true)
  })

  it('masqué sans impression (ex. démo fiche info)', () => {
    expect(mountPanel(MAP_MODE_TERRITORY, { selection }).find(printButton).exists()).toBe(false)
  })
})

describe('FicheInfoPanel — tags Parcelle / Territoire', () => {
  it('tag Territoire : title « Recentrer sur le territoire »', () => {
    const selection: FicheInfoSelection = {
      title: 'Vif (38545)',
      territoryTitle: 'Vif (38545)',
      mapMode: MAP_MODE_TERRITORY,
    }
    const wrapper = mountPanel(MAP_MODE_TERRITORY, { selection })
    expect(wrapper.find('a.ec-fiche-info__mode-tag-link').attributes('title')).toBe(
      'Recentrer sur le territoire',
    )
  })
})
